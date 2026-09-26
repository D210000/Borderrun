import { DEFAULT_SKIN_ID, SKINS } from './brand'

/**
 * Profile + save system. localStorage only, no backend.
 * Every storage access is wrapped in try/catch; if storage is missing or the
 * payload is corrupt we fall back to a fresh in-memory profile so the game
 * always runs (it just won't persist).
 */

export const PROFILE_KEY = 'borderrun_profile'
/** old pre-profile save key, migrated into the profile on first load */
const LEGACY_KEY = 'border-run-save-v1'

export interface RunState {
  city: number
  day: number
  daysInCity: number
  hunger: number
  thirst: number
  health: number
  coins: number
  food: number
  water: number
  clueIndex: number
}

export interface ProfileStats {
  attempts: number
  solves: number
  deaths: number
  citiesCleared: number
  timePlayedSec: number
}

export interface ProfileSettings {
  sound: boolean
}

export interface Profile {
  version: number
  name: string
  skin: string
  createdAt: number
  updatedAt: number
  /** highest city reached — everything <= this is unlocked on the map */
  bestCity: number
  /** resumable mid-run survival state for `bestCity` */
  run: RunState | null
  stats: ProfileStats
  settings: ProfileSettings
  /** regionId -> lore snippet unlocked (all 20 cities of that region cleared) */
  lore: Record<string, boolean>
  onboarded: boolean
  /** set when a corrupt save was replaced — the UI mentions it once */
  corruptRecovered?: boolean
}

export const PROFILE_VERSION = 1

/* ------------------------------------------------------------------ */
/* storage plumbing                                                    */
/* ------------------------------------------------------------------ */

let memoryFallback: Profile | null = null

function storage(): Storage | null {
  try {
    const s = globalThis.localStorage
    if (!s) return null
    const probe = '__borderrun_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

function clampNum(v: unknown, min: number, max: number, dflt: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : dflt
  return Math.min(max, Math.max(min, n))
}

function str(v: unknown, dflt: string): string {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 18) : dflt
}

export function freshRun(city = 1): RunState {
  return { city, day: 1, daysInCity: 1, hunger: 100, thirst: 100, health: 100, coins: 10, food: 1, water: 1, clueIndex: 0 }
}

export function freshProfile(name = 'Runner', skin = DEFAULT_SKIN_ID): Profile {
  const now = Date.now()
  return {
    version: PROFILE_VERSION,
    name,
    skin: SKINS.some((s) => s.id === skin) ? skin : DEFAULT_SKIN_ID,
    createdAt: now,
    updatedAt: now,
    bestCity: 1,
    run: null,
    stats: { attempts: 0, solves: 0, deaths: 0, citiesCleared: 0, timePlayedSec: 0 },
    settings: { sound: true },
    lore: {},
    onboarded: false,
  }
}

/** Coerce anything we pulled out of storage into a valid Profile. */
function sanitize(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Record<string, unknown>
  const base = freshProfile()
  const stats = (d.stats ?? {}) as Record<string, unknown>
  const settings = (d.settings ?? {}) as Record<string, unknown>
  const run = d.run as Record<string, unknown> | null | undefined
  const loreRaw = (d.lore ?? {}) as Record<string, unknown>
  const lore: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(loreRaw)) if (v === true) lore[k] = true

  const p: Profile = {
    version: PROFILE_VERSION,
    name: str(d.name, base.name),
    skin: str(d.skin, DEFAULT_SKIN_ID),
    createdAt: clampNum(d.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    updatedAt: clampNum(d.updatedAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    bestCity: Math.round(clampNum(d.bestCity, 1, 100, 1)),
    run: null,
    stats: {
      attempts: Math.round(clampNum(stats.attempts, 0, 1e7, 0)),
      solves: Math.round(clampNum(stats.solves, 0, 1e7, 0)),
      deaths: Math.round(clampNum(stats.deaths, 0, 1e7, 0)),
      citiesCleared: Math.round(clampNum(stats.citiesCleared, 0, 1e7, 0)),
      timePlayedSec: Math.round(clampNum(stats.timePlayedSec, 0, 1e9, 0)),
    },
    settings: { sound: settings.sound !== false },
    lore,
    onboarded: d.onboarded === true,
  }
  if (!SKINS.some((s) => s.id === p.skin)) p.skin = DEFAULT_SKIN_ID
  if (run && typeof run === 'object') {
    p.run = {
      city: Math.round(clampNum(run.city, 1, 100, 1)),
      day: Math.round(clampNum(run.day, 1, 9999, 1)),
      daysInCity: Math.round(clampNum(run.daysInCity, 1, 9999, 1)),
      hunger: clampNum(run.hunger, 0, 100, 100),
      thirst: clampNum(run.thirst, 0, 100, 100),
      health: clampNum(run.health, 0, 100, 100),
      coins: Math.round(clampNum(run.coins, 0, 99999, 10)),
      food: Math.round(clampNum(run.food, 0, 99, 1)),
      water: Math.round(clampNum(run.water, 0, 99, 1)),
      clueIndex: Math.round(clampNum(run.clueIndex, 0, 9, 0)),
    }
  }
  return p
}

export function loadProfile(): Profile | null {
  const s = storage()
  if (!s) return memoryFallback
  try {
    const raw = s.getItem(PROFILE_KEY)
    if (raw) {
      const parsed = sanitize(JSON.parse(raw))
      if (parsed) return parsed
      // corrupt payload: keep the name if we can, otherwise start clean
      const nameGuess = /"name"\s*:\s*"([^"]{1,18})"/.exec(raw)?.[1]
      const rescued = freshProfile(nameGuess || 'Runner')
      rescued.corruptRecovered = true
      return rescued
    }
    // one-time migration of the pre-profile save
    const legacyRaw = s.getItem(LEGACY_KEY)
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as { city?: number }
      if (typeof legacy.city === 'number') {
        const p = freshProfile()
        p.bestCity = Math.round(clampNum(legacy.city, 1, 100, 1))
        p.run = freshRun(p.bestCity)
        p.onboarded = false
        s.removeItem(LEGACY_KEY)
        return p
      }
    }
  } catch {
    return memoryFallback
  }
  return null
}

export function saveProfile(p: Profile): boolean {
  p.updatedAt = Date.now()
  p.version = PROFILE_VERSION
  const s = storage()
  if (!s) {
    memoryFallback = p
    return false
  }
  try {
    s.setItem(PROFILE_KEY, JSON.stringify(p))
    memoryFallback = p
    return true
  } catch {
    memoryFallback = p
    return false
  }
}

export function resetProfile(): void {
  memoryFallback = null
  try {
    globalThis.localStorage?.removeItem(PROFILE_KEY)
    globalThis.localStorage?.removeItem(LEGACY_KEY)
  } catch {
    /* nothing we can do */
  }
}

export function storageAvailable(): boolean {
  return storage() !== null
}
