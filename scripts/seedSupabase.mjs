#!/usr/bin/env node
/**
 * One-time migration: import src/data/family.json into Supabase.
 *
 * Prerequisites:
 *   1. Run supabase/schema.sql in your Supabase project.
 *   2. The owner must sign in to the app once (so their auth user exists).
 *
 * Usage:
 *   SUPABASE_URL="https://xxxx.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="service-role-key" \
 *   OWNER_EMAIL="you@email.com" \
 *   node scripts/seedSupabase.mjs
 *
 * The service role key bypasses Row Level Security and must NEVER be committed
 * or shipped to the browser. Use it only from your machine for this script.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAIL } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OWNER_EMAIL) {
  console.error(
    'Missing env. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAIL',
  )
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function findUserByEmail(email) {
  let page = 1
  while (page < 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    )
    if (match) return match
    if (data.users.length < 200) break
    page += 1
  }
  return null
}

async function main() {
  const raw = JSON.parse(
    readFileSync(join(__dirname, '..', 'src', 'data', 'family.json'), 'utf8'),
  )
  const people = raw.people ?? {}

  const owner = await findUserByEmail(OWNER_EMAIL)
  if (!owner) {
    console.error(
      `No auth user for ${OWNER_EMAIL}. Ask them to sign in to the app once, then re-run.`,
    )
    process.exit(1)
  }

  const { data: tree, error: treeErr } = await admin
    .from('trees')
    .insert({ name: 'Our Family', owner_id: owner.id })
    .select('id')
    .single()
  if (treeErr) throw treeErr
  const treeId = tree.id

  await admin
    .from('tree_members')
    .insert({ tree_id: treeId, user_id: owner.id, role: 'owner' })

  // Insert people, mapping old string ids -> new uuids.
  const idMap = {}
  for (const [oldId, p] of Object.entries(people)) {
    const { data: inserted, error } = await admin
      .from('people')
      .insert({
        tree_id: treeId,
        name: p.name ?? '',
        role: p.role ?? { en: '', fr: '', ln: '', sw: '' },
        gender: p.gender ?? null,
        birth_year: p.birthYear ?? null,
        death_year: p.deathYear ?? null,
        story: p.story ?? { en: '', fr: '', ln: '', sw: '' },
        created_by: owner.id,
      })
      .select('id')
      .single()
    if (error) throw error
    idMap[oldId] = inserted.id
  }

  // Build de-duplicated relationship edges.
  const parentEdges = new Set()
  const partnerEdges = new Set()
  const rels = []

  for (const [oldId, p] of Object.entries(people)) {
    const me = idMap[oldId]
    for (const parent of p.parents ?? []) {
      if (!idMap[parent]) continue
      const key = `${idMap[parent]}>${me}`
      if (!parentEdges.has(key)) {
        parentEdges.add(key)
        rels.push({ tree_id: treeId, kind: 'parent', a_id: idMap[parent], b_id: me })
      }
    }
    for (const child of p.children ?? []) {
      if (!idMap[child]) continue
      const key = `${me}>${idMap[child]}`
      if (!parentEdges.has(key)) {
        parentEdges.add(key)
        rels.push({ tree_id: treeId, kind: 'parent', a_id: me, b_id: idMap[child] })
      }
    }
    const partners = [p.spouse, ...(p.partners ?? [])].filter(Boolean)
    for (const partner of partners) {
      if (!idMap[partner]) continue
      const key = [me, idMap[partner]].sort().join('~')
      if (!partnerEdges.has(key)) {
        partnerEdges.add(key)
        rels.push({ tree_id: treeId, kind: 'partner', a_id: me, b_id: idMap[partner] })
      }
    }
  }

  if (rels.length > 0) {
    const { error } = await admin.from('relationships').insert(rels)
    if (error) throw error
  }

  console.log(
    `Imported ${Object.keys(people).length} people and ${rels.length} relationships into tree ${treeId}.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
