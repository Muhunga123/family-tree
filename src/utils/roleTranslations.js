// Common family role labels → multilingual. Used when saving so SW/FR/LN
// fill in automatically from the English (or matched) role you type.
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
  sibling: { en: 'sibling', fr: 'frère ou sœur', ln: 'ndeko', sw: 'ndugu' },
  uncle: { en: 'uncle', fr: 'oncle', ln: 'tata ya ndeko', sw: 'mjomba' },
  aunt: { en: 'aunt', fr: 'tante', ln: 'mama ya ndeko', sw: 'shangazi' },
  cousin: { en: 'cousin', fr: 'cousin(e)', ln: 'ndeko ya libota', sw: 'binamu' },
  nephew: { en: 'nephew', fr: 'neveu', ln: 'mwana ya ndeko', sw: 'mpwa wa kiume' },
  niece: { en: 'niece', fr: 'nièce', ln: 'mwana ya ndeko', sw: 'mpwa wa kike' },
  "father's sibling": {
    en: "father's sibling",
    fr: 'frère ou sœur du père',
    ln: 'ndeko ya tata',
    sw: 'ndugu wa baba',
  },
  "mother's sibling": {
    en: "mother's sibling",
    fr: 'frère ou sœur de la mère',
    ln: 'ndeko ya mama',
    sw: 'ndugu wa mama',
  },
}

function normalizeKey(text) {
  return (text ?? '').trim().toLowerCase()
}

function findMatch(text) {
  const key = normalizeKey(text)
  if (!key) return null
  if (ROLE_MAP[key]) return ROLE_MAP[key]
  for (const [k, v] of Object.entries(ROLE_MAP)) {
    if (normalizeKey(v.en) === key) return v
    if (normalizeKey(v.fr) === key) return v
    if (normalizeKey(v.ln) === key) return v
    if (normalizeKey(v.sw) === key) return v
    if (key.includes(k) || k.includes(key)) return v
  }
  return null
}

/** Merge typed role into all languages when we recognise the label. */
export function fillRoleTranslations(typedRole, existing = {}, activeLang = 'en') {
  const base = { en: '', fr: '', ln: '', sw: '', ...existing }
  const match = findMatch(typedRole)
  if (match) {
    return {
      ...base,
      ...match,
      [activeLang]: typedRole.trim() || match[activeLang] || match.en,
    }
  }
  return { ...base, [activeLang]: typedRole.trim() }
}
