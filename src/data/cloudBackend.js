import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { normalizePeople, pickRootId } from './normalizeFamily'
import { applySiblingRelToRaw } from '../utils/siblings'

export { isSupabaseConfigured }

const PHOTO_BUCKET = 'photos'

function resolvePhoto(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

function buildRaw(peopleRows, relationshipRows) {
  const raw = {}
  for (const row of peopleRows) {
    raw[row.id] = {
      name: row.name ?? '',
      role: row.role ?? { en: '', fr: '', ln: '', sw: '' },
      gender: row.gender ?? null,
      birthYear: row.birth_year ?? null,
      deathYear: row.death_year ?? null,
      birthDate: row.birth_date ?? null,
      deathDate: row.death_date ?? null,
      birthPlace: row.birth_place ?? null,
      places: Array.isArray(row.places) ? row.places : [],
      photo: resolvePhoto(row.photo_path),
      story: row.story ?? { en: '', fr: '', ln: '', sw: '' },
      parents: [],
      children: [],
      partners: [],
      siblings: [],
      siblingAnchors: [],
    }
  }
  for (const rel of relationshipRows) {
    if (rel.kind === 'parent') {
      if (raw[rel.a_id] && raw[rel.b_id]) {
        raw[rel.a_id].children.push(rel.b_id)
        raw[rel.b_id].parents.push(rel.a_id)
      }
    } else if (rel.kind === 'partner') {
      if (raw[rel.a_id] && raw[rel.b_id]) {
        raw[rel.a_id].partners.push(rel.b_id)
        raw[rel.b_id].partners.push(rel.a_id)
      }
    } else if (rel.kind === 'sibling') {
      if (raw[rel.a_id] && raw[rel.b_id]) {
        applySiblingRelToRaw(raw, rel.a_id, rel.b_id)
      }
    }
  }
  return raw
}

/**
 * Everyone (you, family, localhost, Vercel) reads the same tree when one is
 * marked public. That keeps edits in sync everywhere within seconds.
 */
async function resolveTreeId() {
  const configured = import.meta.env.VITE_TREE_ID
  if (configured) return configured

  const { data: publicTree, error: publicErr } = await supabase
    .from('trees')
    .select('id')
    .eq('public_access', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (publicErr) throw publicErr
  if (publicTree?.id) return publicTree.id

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) {
    throw new Error(
      'No public tree found. Run supabase/public-link-access.sql in Supabase.',
    )
  }

  await supabase.rpc('accept_invites')

  const { data: memberships, error } = await supabase
    .from('tree_members')
    .select('tree_id, role')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error
  if (memberships?.length > 0) return memberships[0].tree_id

  const { data: tree, error: treeError } = await supabase
    .from('trees')
    .insert({ name: 'Our Family', owner_id: user.id, public_access: true })
    .select('id')
    .single()
  if (treeError) throw treeError

  await supabase.from('tree_members').insert({
    tree_id: tree.id,
    user_id: user.id,
    role: 'owner',
    email: user.email,
  })

  return tree.id
}

async function ensureTreeId() {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) throw new Error('Not signed in')
  return resolveTreeId()
}

export function createCloudBackend() {
  let treeId = null
  let listeners = new Set()
  let channel = null
  let emitTimer = null
  let emitInflight = null
  let emitQueued = false

  const attachRealtime = (tid) => {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
    channel = supabase
      .channel(`tree:${tid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'people',
          filter: `tree_id=eq.${tid}`,
        },
        () => emit(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relationships',
          filter: `tree_id=eq.${tid}`,
        },
        () => emit(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memories',
          filter: `tree_id=eq.${tid}`,
        },
        () => emit(),
      )
      .subscribe()
  }

  const loadTree = async () => {
    if (!treeId) {
      treeId = await resolveTreeId()
      attachRealtime(treeId)
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    const [{ data: people }, { data: relationships }, membershipRes, treeRes] =
      await Promise.all([
        supabase.from('people').select('*').eq('tree_id', treeId),
        supabase.from('relationships').select('*').eq('tree_id', treeId),
        userId
          ? supabase
              .from('tree_members')
              .select('role')
              .eq('tree_id', treeId)
              .eq('user_id', userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('trees')
          .select('name, public_access')
          .eq('id', treeId)
          .maybeSingle(),
      ])

    const raw = buildRaw(people ?? [], relationships ?? [])
    const normalized = normalizePeople(raw)
    return {
      id: treeId,
      name: treeRes.data?.name ?? 'Our Family',
      cloud: true,
      people: normalized,
      rootId: pickRootId(normalized),
      myRole: membershipRes.data?.role ?? 'viewer',
      publicAccess: treeRes.data?.public_access ?? false,
    }
  }

  const emit = () => {
    if (emitTimer) clearTimeout(emitTimer)
    emitTimer = setTimeout(async () => {
      emitTimer = null
      if (emitInflight) {
        emitQueued = true
        return
      }
      emitInflight = loadTree()
        .then((tree) => {
          for (const cb of listeners) cb(tree)
        })
        .finally(() => {
          emitInflight = null
          if (emitQueued) {
            emitQueued = false
            emit()
          }
        })
    }, 200)
  }

  return {
    isCloud: true,
    loadTree,
    subscribe(cb) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
        if (listeners.size === 0 && channel) {
          supabase.removeChannel(channel)
          channel = null
        }
      }
    },
    async addPerson(data) {
      if (!treeId) treeId = await ensureTreeId()
      const { data: inserted, error } = await supabase
        .from('people')
        .insert({
          tree_id: treeId,
          name: data.name ?? '',
          role: data.role ?? { en: '', fr: '', ln: '', sw: '' },
          gender: data.gender ?? null,
          birth_year: data.birthYear ?? null,
          death_year: data.deathYear ?? null,
          birth_date: data.birthDate ?? null,
          death_date: data.deathDate ?? null,
          birth_place: data.birthPlace ?? null,
          places: data.places ?? [],
          photo_path: data.photoPath ?? null,
          story: data.story ?? { en: '', fr: '', ln: '', sw: '' },
        })
        .select('id')
        .single()
      if (error) throw error

      const rels = []
      for (const parentId of data.parentIds ?? []) {
        rels.push({ tree_id: treeId, kind: 'parent', a_id: parentId, b_id: inserted.id })
      }
      for (const childId of data.childIds ?? []) {
        rels.push({ tree_id: treeId, kind: 'parent', a_id: inserted.id, b_id: childId })
      }
      for (const partnerId of data.partnerIds ?? []) {
        rels.push({ tree_id: treeId, kind: 'partner', a_id: inserted.id, b_id: partnerId })
      }
      if (rels.length > 0) {
        await supabase.from('relationships').insert(rels)
      }
      emit()
      return inserted.id
    },
    async updatePerson(id, patch) {
      const dbPatch = {}
      if ('name' in patch) dbPatch.name = patch.name
      if ('role' in patch) dbPatch.role = patch.role
      if ('gender' in patch) dbPatch.gender = patch.gender
      if ('birthYear' in patch) dbPatch.birth_year = patch.birthYear
      if ('deathYear' in patch) dbPatch.death_year = patch.deathYear
      if ('birthDate' in patch) dbPatch.birth_date = patch.birthDate
      if ('deathDate' in patch) dbPatch.death_date = patch.deathDate
      if ('birthPlace' in patch) dbPatch.birth_place = patch.birthPlace
      if ('places' in patch) dbPatch.places = patch.places
      if ('story' in patch) dbPatch.story = patch.story
      if ('photoPath' in patch) dbPatch.photo_path = patch.photoPath
      const { error } = await supabase.from('people').update(dbPatch).eq('id', id)
      if (error) throw error
      emit()
    },
    async deletePerson(id) {
      if (!treeId) treeId = await ensureTreeId()
      await supabase
        .from('relationships')
        .delete()
        .eq('tree_id', treeId)
        .or(`a_id.eq.${id},b_id.eq.${id}`)
      await supabase.from('people').delete().eq('tree_id', treeId).eq('id', id)
      emit()
    },
    async linkPartners(aId, bId) {
      if (!treeId) treeId = await ensureTreeId()
      const { data: existing } = await supabase
        .from('relationships')
        .select('id')
        .eq('tree_id', treeId)
        .eq('kind', 'partner')
        .or(
          `and(a_id.eq.${aId},b_id.eq.${bId}),and(a_id.eq.${bId},b_id.eq.${aId})`,
        )
        .limit(1)
        .maybeSingle()
      if (!existing) {
        await supabase
          .from('relationships')
          .insert({ tree_id: treeId, kind: 'partner', a_id: aId, b_id: bId })
      }
      emit()
    },
    async linkParentChild(parentId, childId) {
      if (!treeId) treeId = await ensureTreeId()
      const { data: existing } = await supabase
        .from('relationships')
        .select('id')
        .eq('tree_id', treeId)
        .eq('kind', 'parent')
        .eq('a_id', parentId)
        .eq('b_id', childId)
        .maybeSingle()
      if (!existing) {
        await supabase
          .from('relationships')
          .insert({ tree_id: treeId, kind: 'parent', a_id: parentId, b_id: childId })
      }
      emit()
    },
    /** anchorId = person linked to, satelliteId = the sibling being added. */
    async linkSiblings(anchorId, satelliteId) {
      if (!treeId) treeId = await ensureTreeId()
      const { data: existing } = await supabase
        .from('relationships')
        .select('id')
        .eq('tree_id', treeId)
        .eq('kind', 'sibling')
        .or(
          `and(a_id.eq.${anchorId},b_id.eq.${satelliteId}),and(a_id.eq.${satelliteId},b_id.eq.${anchorId})`,
        )
        .limit(1)
        .maybeSingle()
      if (!existing) {
        await supabase
          .from('relationships')
          .insert({ tree_id: treeId, kind: 'sibling', a_id: anchorId, b_id: satelliteId })
      }
      emit()
    },
    async uploadPhoto(file) {
      if (!treeId) treeId = await ensureTreeId()
      const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
      const path = `${treeId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
      return { url: data.publicUrl, path }
    },
    async unlinkPartners(aId, bId) {
      if (!treeId) treeId = await ensureTreeId()
      await supabase
        .from('relationships')
        .delete()
        .eq('tree_id', treeId)
        .eq('kind', 'partner')
        .or(
          `and(a_id.eq.${aId},b_id.eq.${bId}),and(a_id.eq.${bId},b_id.eq.${aId})`,
        )
      emit()
    },
    async unlinkParentChild(parentId, childId) {
      if (!treeId) treeId = await ensureTreeId()
      await supabase
        .from('relationships')
        .delete()
        .eq('tree_id', treeId)
        .eq('kind', 'parent')
        .eq('a_id', parentId)
        .eq('b_id', childId)
      emit()
    },
    async unlinkSiblings(aId, bId) {
      if (!treeId) treeId = await ensureTreeId()
      await supabase
        .from('relationships')
        .delete()
        .eq('tree_id', treeId)
        .eq('kind', 'sibling')
        .or(
          `and(a_id.eq.${aId},b_id.eq.${bId}),and(a_id.eq.${bId},b_id.eq.${aId})`,
        )
      emit()
    },
    async listMemories(personId) {
      if (!treeId) treeId = await ensureTreeId()
      const { data } = await supabase
        .from('memories')
        .select('id, person_id, author, body, created_at')
        .eq('tree_id', treeId)
        .eq('person_id', personId)
        .order('created_at', { ascending: true })
      return data ?? []
    },
    async addMemory(personId, { author, body }) {
      if (!treeId) treeId = await ensureTreeId()
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('memories').insert({
        tree_id: treeId,
        person_id: personId,
        author: (author || '').trim() || null,
        body: (body || '').trim(),
        created_by: userData?.user?.id ?? null,
      })
      if (error) throw error
      emit()
    },
    async deleteMemory(id) {
      await supabase.from('memories').delete().eq('id', id)
      emit()
    },
    async setPublicAccess(value) {
      if (!treeId) treeId = await ensureTreeId()
      await supabase
        .from('trees')
        .update({ public_access: value })
        .eq('id', treeId)
      emit()
    },
    async listMembers() {
      if (!treeId) treeId = await ensureTreeId()
      const { data } = await supabase
        .from('tree_members')
        .select('user_id, role, email')
        .eq('tree_id', treeId)
        .order('created_at', { ascending: true })
      return data ?? []
    },
    async listInvites() {
      if (!treeId) treeId = await ensureTreeId()
      const { data } = await supabase
        .from('tree_invites')
        .select('id, email, role')
        .eq('tree_id', treeId)
      return data ?? []
    },
    async inviteMember(email, role = 'viewer') {
      if (!treeId) treeId = await ensureTreeId()
      const { error } = await supabase
        .from('tree_invites')
        .insert({ tree_id: treeId, email: email.trim().toLowerCase(), role })
      if (error) throw error
      emit()
    },
    async removeMember(userId) {
      if (!treeId) treeId = await ensureTreeId()
      await supabase
        .from('tree_members')
        .delete()
        .eq('tree_id', treeId)
        .eq('user_id', userId)
      emit()
    },
    async removeInvite(id) {
      await supabase.from('tree_invites').delete().eq('id', id)
      emit()
    },
  }
}
