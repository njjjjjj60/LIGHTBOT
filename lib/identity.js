import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data.json')

const memberDirectory = new Map()

function loadDirectory() {

  try {

    if (!fs.existsSync(DATA_FILE)) return

    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw)

    if (parsed && typeof parsed === 'object') {
      for (const [key, value] of Object.entries(parsed)) {
        memberDirectory.set(key, value)
      }
    }

  } catch (e) {
    console.error('تعذر تحميل data.json:', e)
  }
}

let saveTimeout = null

function saveDirectory() {

  if (saveTimeout) clearTimeout(saveTimeout)

  saveTimeout = setTimeout(() => {

    try {
      const obj = Object.fromEntries(memberDirectory)
      fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2))
    } catch (e) {
      console.error('تعذر حفظ data.json:', e)
    }

  }, 2000)
}

loadDirectory()

 
 
 

export function bareNumber(id = '') {
  return String(id).split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
}

export function stripDevice(id) {
  if (typeof id !== 'string') return id
  return id.replace(/:\d+@/, '@')
}

export function isLidJid(id) {
  return typeof id === 'string' && id.endsWith('@lid')
}

function dirLookup(id) {

  if (!id || typeof id !== 'string') return null

  const clean = stripDevice(id)
  const num = bareNumber(clean)

  if (!num) return null

  const domain = isLidJid(clean) ? '@lid' : '@s.whatsapp.net'

  return (
    memberDirectory.get(id) ||
    memberDirectory.get(clean) ||
    memberDirectory.get(num + domain) ||
    null
  )
}

 
 
 

export function rememberParticipants(list) {

  if (!Array.isArray(list)) return

  let changed = false

  for (const p of list) {

    if (!p) continue

    const ids = [
      p.id,
      p.jid,
      p.lid,
      p.participant,
      p.phoneNumber
    ].filter(Boolean)

    for (const id of ids) {

      const existing = memberDirectory.get(id)

      if (
        !existing ||
        JSON.stringify(existing) !== JSON.stringify(p)
      ) {
        memberDirectory.set(id, p)
        changed = true
      }
    }
  }

  if (changed) saveDirectory()
}


export function rememberPair(lid, pn) {

  lid = stripDevice(lid)
  pn = stripDevice(pn)

  if (!isLidJid(lid)) return
  if (typeof pn !== 'string' || !pn.endsWith('@s.whatsapp.net')) return

  let changed = false

  for (const key of [lid, pn]) {

    const existing = memberDirectory.get(key)

    if (!existing || existing.lid !== lid || existing.phoneNumber !== pn) {

      memberDirectory.set(key, {
        id: lid,
        ...(existing || {}),
        lid,
        phoneNumber: pn
      })

      changed = true
    }
  }

  if (changed) saveDirectory()
}

export function getDirectoryEntry(id) {
  return dirLookup(id)
}

export function preferredJid(participant) {

  if (!participant) return null

  const candidates = [
    participant.phoneNumber,
    participant.jid,
    participant.id,
    participant.lid,
    participant.participant
  ].filter(Boolean)

  const pn = candidates.find(x =>
    typeof x === 'string' &&
    x.endsWith('@s.whatsapp.net')
  )

  if (pn) return pn

  return candidates[0] || null
}

export function bestActionJid(id) {

  if (!id) return id

  const entry = dirLookup(id)

  if (!entry) return id

  return preferredJid(entry) || id
}

export function sameUser(a, b) {

  if (!a || !b) return false

  const A = String(a)
  const B = String(b)

  if (A === B) return true

  const cleanA = bareNumber(A)
  const cleanB = bareNumber(B)

  if (!cleanA || !cleanB) return false

  return cleanA === cleanB
}

export function isMentionableJid(jid) {

  if (!jid || typeof jid !== 'string') return false

  return (
    jid.endsWith('@s.whatsapp.net') ||
    jid.endsWith('@lid') ||
    jid.endsWith('@g.us')
  )
}

export function extractJidFromParam(param) {

  if (!param) return null

  if (typeof param === 'string') return param

  if (typeof param === 'object') {
    return (
      param.phoneNumber ||
      param.id ||
      param.jid ||
      param.lid ||
      param.participant ||
      null
    )
  }

  return null
}

export function asText(value) {

  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return ''

  return String(value)
}

export function normalizeJid(input) {

  if (!input) return null
  if (typeof input !== 'string') return null

  if (input.includes('@')) return input

  const raw = input.replace(/\D/g, '')

  if (!raw) return null

  const known = memberDirectory.get(input) || memberDirectory.get(raw)

  if (known) {

    const preferred = [
      known.id,
      known.jid,
      known.lid,
      known.participant
    ].find(x =>
      typeof x === 'string' &&
      x.split('@')[0] === raw
    )

    if (preferred) return preferred
  }

  return `${raw}@s.whatsapp.net`
}

export function findParticipant(participants, id) {

  if (!id || !Array.isArray(participants)) return null

  return participants.find(p =>
    p && (
      sameUser(p.id, id) ||
      sameUser(p.jid, id) ||
      sameUser(p.lid, id) ||
      sameUser(p.phoneNumber, id)
    )
  ) || null
}

 
 
 


export function collectIdentities(...ids) {

  const nums = new Set()

  const add = value => {
    if (!value || typeof value !== 'string') return
    const n = bareNumber(value)
    if (n) nums.add(n)
  }

  for (const raw of ids) {

    if (!raw || typeof raw !== 'string') continue

    add(raw)

    const entry = dirLookup(raw)

    if (entry) {
      add(entry.id)
      add(entry.jid)
      add(entry.lid)
      add(entry.phoneNumber)
      add(entry.participant)
    }
  }

  return nums
}




export function matchesNumberList(list, ...ids) {

  if (!Array.isArray(list)) return false

  const nums = collectIdentities(...ids)

  if (!nums.size) return false

  return list.some(entry => {

    const number = Array.isArray(entry) ? entry[0] : entry
    const lid = Array.isArray(entry) ? entry[3] : null

    const n = bareNumber(number || '')
    const l = bareNumber(lid || '')

    return (n && nums.has(n)) || (l && nums.has(l))
  })
}

export function findByStoredName(participants, query) {

  if (!query) return null

  const clean = query.trim().replace(/^@/, '').toLowerCase()

  if (!clean) return null

  const candidates = participants
    .map(p => {

      const ids = [
        p.id,
        p.jid,
        p.lid,
        p.phoneNumber
      ].filter(Boolean)

      let storedName = ''

      for (const id of ids) {
        const u = global.db?.data?.users?.[id]
        if (u?.name) {
          storedName = u.name
          break
        }
      }

      const otherName =
        p.notify ||
        p.name ||
        p.verifiedName ||
        ''

      const names = [storedName, otherName]
        .filter(Boolean)
        .map(n => n.toLowerCase())

      return { id: p.id, names }
    })
    .filter(c => c.id && c.names.length)

  const exact = candidates.find(c => c.names.includes(clean))

  if (exact) return exact.id

  const partial = candidates.filter(c =>
    c.names.some(n => n.includes(clean))
  )

  if (partial.length === 1) return partial[0].id

  return null
}