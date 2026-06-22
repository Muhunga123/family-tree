import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { normalizePeople, pickRootId } from './normalizeFamily'

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
      photo: resolvePhoto(row.photo_path),
      story: row.story ?? { en: '', fr: '', ln: '', sw: '' },
      parents: [],
      children: [],
      partners: [],
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
    }
  }
  return raw
}

/**
 * Finds the current user's tree, creating one on first sign-in so a new
 * relative always lands somewhere.
 */
async function ensureTreeId() {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) throw new Error('Not signed in')

  // Claim any pending email invites first so invited relatives join the
  // existing shared tree instead of creating their own.
  await supabase.rpc('accept_invites')

  const { data: memberships, error } = await supabase
    .from('tree_members')
    .select('tree_id, role')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error
  if (memberships && memberships.length > 0) return memberships[0].tree_id

  const { data: tree, error: treeError } = await supabase
    .from('trees')
    .insert({ name: 'Our Family', owner_id: user.id })
    .select('id')
    .single()
  if (treeError) throw treeError

  const { error: memberError } = await supabase
    .from('tree_members')
    .insert({ tree_id: tree.id, user_id: user.id, role: 'owner', email: user.email })
  if (memberError) throw memberError

  return tree.id
}

export function createCloudBackend() {
  let treeId = null
  let listeners = new Set()
  let channel = null

  const loadTree = async () => {
    if (!treeId) {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      if (userId) {
        treeId = await ensureTreeId()
      } else {
        // Public (anonymous) viewer: load the first tree marked public.
        const { data: publicTree, error } = await supabase
          .from('trees')
          .select('id')
          .eq('public_access', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        if (!publicTree?.id) {
          throw new Error(
            'No public tree found. Set public_access=true on your `trees` row.',
          )
        }
        treeId = publicTree.id
      }
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    const [{ data: people }, { data: relationships }, membershipRes] =
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
      ])

    const raw = buildRaw(people ?? [], relationships ?? [])
    const normalized = normalizePeople(raw)
    return {
      id: treeId,
      name: 'Our Family',
      cloud: true,
      people: normalized,
      rootId: pickRootId(normalized),
      myRole: membershipRes.data?.role ?? 'viewer',
    }
  }

  const emit = async () => {
    const tree = await loadTree()
    for (const cb of listeners) cb(tree)
  }

  return {
    isCloud: true,
    loadTree,
    subscribe(cb) {
      listeners.add(cb)
      if (!channel) {
        channel = supabase
          .channel('tree-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'people' },
            emit,
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'relationships' },
            emit,
          )
          .subscribe()
      }
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
      await emit()
      return inserted.id
    },
    async updatePerson(id, patch) {
      const dbPatch = {}
      if ('name' in patch) dbPatch.name = patch.name
      if ('role' in patch) dbPatch.role = patch.role
      if ('gender' in patch) dbPatch.gender = patch.gender
      if ('birthYear' in patch) dbPatch.birth_year = patch.birthYear
      if ('deathYear' in patch) dbPatch.death_year = patch.deathYear
      if ('story' in patch) dbPatch.story = patch.story
      if ('photoPath' in patch) dbPatch.photo_path = patch.photoPath
      const { error } = await supabase.from('people').update(dbPatch).eq('id', id)
      if (error) throw error
      await emit()
    },
    async deletePerson(id) {
      await supabase
        .from('relationships')
        .delete()
        .or(`a_id.eq.${id},b_id.eq.${id}`)
      await supabase.from('people').delete().eq('id', id)
      await emit()
    },
    async linkPartners(aId, bId) {
      if (!treeId) treeId = await ensureTreeId()
      await supabase
        .from('relationships')
        .insert({ tree_id: treeId, kind: 'partner', a_id: aId, b_id: bId })
      await emit()
    },
    async linkParentChild(parentId, childId) {
      if (!treeId) treeId = await ensureTreeId()
      await supabase
        .from('relationships')
        .insert({ tree_id: treeId, kind: 'parent', a_id: parentId, b_id: childId })
      await emit()
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
    },
    async removeMember(userId) {
      if (!treeId) treeId = await ensureTreeId()
      await supabase
        .from('tree_members')
        .delete()
        .eq('tree_id', treeId)
        .eq('user_id', userId)
    },
    async removeInvite(id) {
      await supabase.from('tree_invites').delete().eq('id', id)
    },
  }
}
