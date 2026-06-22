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

  const snapshot = () => {
    const people = normalizePeople(raw)
    return {
      id: 'local',
      name: 'Our Family',
      cloud: false,
      people,
      rootId: pickRootId(people),
      myRole: 'owner',
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
        photo: data.photo ?? '',
        story: data.story ?? { en: '', fr: '', ln: '', sw: '' },
        parents: [...(data.parentIds ?? [])],
        children: [...(data.childIds ?? [])],
        partners: [...(data.partnerIds ?? [])],
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
    async uploadPhoto(file) {
      const url = await fileToDataUrl(file)
      return { url, path: url }
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
    backend = isSupabaseConfigured()
      ? createCloudBackend({ makeId })
      : createLocalBackend()
  }
  return backend
}

export function isCloudEnabled() {
  return isSupabaseConfigured()
}
