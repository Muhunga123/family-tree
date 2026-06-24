import seedData from './family.json'
import { normalizePeople, pickRootId } from './normalizeFamily'
import {
  isSupabaseConfigured,
  createCloudBackend,
} from './cloudBackend'

function slugify(name) {
  return (name || 'person')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 24)
}

function makeId(name, existing) {
  const base = slugify(name) || 'person'
  let id = base
  let n = 2
  while (existing[id]) {
    id = `${base}-${n}`
    n += 1
  }
  return id
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Local, in-memory backend (reads family.json). Mutations work for the current
 * session so the editor is usable before the cloud is connected; reloading
 * resets to the seed data. The cloud backend persists for real.
 */
function createLocalBackend() {
  let raw = structuredClone(seedData.people ?? {})
  let listeners = new Set()
  let memories = [] // { id, person_id, author, body, created_at }
  let publicAccess = false

  const snapshot = () => {
    const people = normalizePeople(raw)
    return {
      id: 'local',
      name: 'Our Family',
      cloud: false,
      people,
      rootId: pickRootId(people),
      myRole: 'owner',
      publicAccess,
    }
  }

  const emit = () => {
    const tree = snapshot()
    for (const cb of listeners) cb(tree)
  }

  return {
    isCloud: false,
    async loadTree() {
      return snapshot()
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async addPerson(data) {
      const id = makeId(data.name, raw)
      raw[id] = {
        name: data.name ?? '',
        role: data.role ?? { en: '', fr: '', ln: '', sw: '' },
        gender: data.gender ?? null,
        birthYear: data.birthYear ?? null,
        deathYear: data.deathYear ?? null,
        birthDate: data.birthDate ?? null,
        deathDate: data.deathDate ?? null,
        birthPlace: data.birthPlace ?? null,
        places: data.places ?? [],
        photo: data.photo ?? '',
        story: data.story ?? { en: '', fr: '', ln: '', sw: '' },
        parents: [],
        children: [],
        partners: [],
        siblings: [],
        siblingAnchors: [],
      }
      for (const parentId of data.parentIds ?? []) {
        if (raw[parentId]) {
          raw[id].parents.push(parentId)
          raw[parentId].children = [...new Set([...(raw[parentId].children ?? []), id])]
        }
      }
      for (const childId of data.childIds ?? []) {
        if (raw[childId]) {
          raw[id].children.push(childId)
          raw[childId].parents = [...new Set([...(raw[childId].parents ?? []), id])]
        }
      }
      for (const partnerId of data.partnerIds ?? []) {
        if (raw[partnerId]) {
          raw[id].partners.push(partnerId)
          raw[partnerId].partners = [...new Set([...(raw[partnerId].partners ?? []), id])]
        }
      }
      emit()
      return id
    },
    async updatePerson(id, patch) {
      if (!raw[id]) return
      raw[id] = { ...raw[id], ...patch }
      emit()
    },
    async deletePerson(id) {
      delete raw[id]
      for (const person of Object.values(raw)) {
        person.parents = (person.parents ?? []).filter((x) => x !== id)
        person.children = (person.children ?? []).filter((x) => x !== id)
        person.partners = (person.partners ?? []).filter((x) => x !== id)
        person.siblings = (person.siblings ?? []).filter((x) => x !== id)
        person.siblingAnchors = (person.siblingAnchors ?? []).filter((x) => x !== id)
        if (person.spouse === id) delete person.spouse
      }
      emit()
    },
    async linkPartners(aId, bId) {
      if (!raw[aId] || !raw[bId]) return
      raw[aId].partners = [...new Set([...(raw[aId].partners ?? []), bId])]
      raw[bId].partners = [...new Set([...(raw[bId].partners ?? []), aId])]
      emit()
    },
    async linkParentChild(parentId, childId) {
      if (!raw[parentId] || !raw[childId]) return
      raw[parentId].children = [
        ...new Set([...(raw[parentId].children ?? []), childId]),
      ]
      raw[childId].parents = [
        ...new Set([...(raw[childId].parents ?? []), parentId]),
      ]
      emit()
    },
    /** anchorId = person linked to, satelliteId = the sibling being added. */
    async linkSiblings(anchorId, satelliteId) {
      if (!raw[anchorId] || !raw[satelliteId]) return
      raw[anchorId].siblings = [...new Set([...(raw[anchorId].siblings ?? []), satelliteId])]
      raw[satelliteId].siblings = [...new Set([...(raw[satelliteId].siblings ?? []), anchorId])]
      raw[satelliteId].siblingAnchors = [
        ...new Set([...(raw[satelliteId].siblingAnchors ?? []), anchorId]),
      ]
      emit()
    },
    async uploadPhoto(file) {
      const url = await fileToDataUrl(file)
      return { url, path: url }
    },
    async unlinkPartners(aId, bId) {
      if (raw[aId]) raw[aId].partners = (raw[aId].partners ?? []).filter((x) => x !== bId)
      if (raw[bId]) raw[bId].partners = (raw[bId].partners ?? []).filter((x) => x !== aId)
      emit()
    },
    async unlinkParentChild(parentId, childId) {
      if (raw[parentId])
        raw[parentId].children = (raw[parentId].children ?? []).filter((x) => x !== childId)
      if (raw[childId])
        raw[childId].parents = (raw[childId].parents ?? []).filter((x) => x !== parentId)
      emit()
    },
    async unlinkSiblings(aId, bId) {
      if (raw[aId]) {
        raw[aId].siblings = (raw[aId].siblings ?? []).filter((x) => x !== bId)
        raw[aId].siblingAnchors = (raw[aId].siblingAnchors ?? []).filter((x) => x !== bId)
      }
      if (raw[bId]) {
        raw[bId].siblings = (raw[bId].siblings ?? []).filter((x) => x !== aId)
        raw[bId].siblingAnchors = (raw[bId].siblingAnchors ?? []).filter((x) => x !== aId)
      }
      emit()
    },
    async listMemories(personId) {
      return memories.filter((m) => m.person_id === personId)
    },
    async addMemory(personId, { author, body }) {
      memories.push({
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        person_id: personId,
        author: (author || '').trim() || null,
        body: (body || '').trim(),
        created_at: new Date().toISOString(),
      })
      emit()
    },
    async deleteMemory(id) {
      memories = memories.filter((m) => m.id !== id)
      emit()
    },
    async setPublicAccess(value) {
      publicAccess = value
      emit()
    },
    async listMembers() {
      return []
    },
    async listInvites() {
      return []
    },
    async inviteMember() {},
    async removeMember() {},
    async removeInvite() {},
  }
}

let backend = null

export function getRepository() {
  if (!backend) {
    backend = isSupabaseConfigured() ? createCloudBackend() : createLocalBackend()
  }
  return backend
}

export function isCloudEnabled() {
  return isSupabaseConfigured()
}
