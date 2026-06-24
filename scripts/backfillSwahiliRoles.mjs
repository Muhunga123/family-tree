#!/usr/bin/env node
/**
 * Backfill Swahili (and FR/LN) role translations for everyone already in Supabase.
 *
 * Usage:
 *   SUPABASE_URL="https://xxxx.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="service-role-key" \
 *   node scripts/backfillSwahiliRoles.mjs
 */
import { createClient } from '@supabase/supabase-js'

const ROLE_MAP = {
  grandfather: { en: 'grandfather', fr: 'grand-père', ln: 'nkoko mobali', sw: 'babu' },
  grandmother: { en: 'grandmother', fr: 'grand-mère', ln: 'nkoko mwasi', sw: 'bibi' },
  father: { en: 'father', fr: 'père', ln: 'tata', sw: 'baba' },
  mother: { en: 'mother', fr: 'mère', ln: 'mama', sw: 'mama' },
  son: { en: 'son', fr: 'fils', ln: 'mwana mobali', sw: 'mwana wa kiume' },
  daughter: { en: 'daughter', fr: 'fille', ln: 'mwana mwasi', sw: 'binti' },
  husband: { en: 'husband', fr: 'mari', ln: 'mobali', sw: 'mume' },
  wife: { en: 'wife', fr: 'épouse', ln: 'mwasi', sw: 'mke' },
  partner: { en: 'partner', fr: 'partenaire', ln: 'moloni', sw: 'mwenzi' },
  "father's sibling": {
    en: "father's sibling",
    fr: 'frère ou sœur du père',
    ln: 'ndeko ya tata',
    sw: 'ndugu wa baba',
  },
}

function findMatch(role) {
  const en = (role?.en ?? '').trim().toLowerCase()
  if (!en) return null
  if (ROLE_MAP[en]) return ROLE_MAP[en]
  for (const [k, v] of Object.entries(ROLE_MAP)) {
    if (v.en.toLowerCase() === en || k === en) return v
  }
  return null
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const { data: rows, error } = await admin.from('people').select('id, name, role')
  if (error) throw error

  let updated = 0
  for (const row of rows ?? []) {
    const match = findMatch(row.role)
    if (!match) continue
    const next = { ...row.role, ...match }
    if (JSON.stringify(next) === JSON.stringify(row.role)) continue
    const { error: upErr } = await admin.from('people').update({ role: next }).eq('id', row.id)
    if (upErr) throw upErr
    updated += 1
    console.log(`Updated ${row.name || row.id}`)
  }
  console.log(`Done. Updated ${updated} people with Swahili/FR/LN roles.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
