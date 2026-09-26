import { RNG } from './rng'
import type {
  Clue,
  Guard,
  Prop,
  PropKind,
  Region,
  TileKind,
  Vec,
  World,
} from './types'

export const TS = 32 // tile size in px

/**
 * 5 regions x 20 cities = the 100 cities of the run.
 * Dark "digital underworld" palettes: near-black ground, magenta + cyan neon.
 * PLACEHOLDER: `hook` / `lore` are temp copy — swap in the real Dlicom text.
 */
export const CITIES_PER_REGION = 20

export const REGIONS: Region[] = [
  {
    id: 'fringe',
    name: 'Fringe Sector',
    hook: 'Where the wire starts. Cheap fences, cheaper informants.',
    lore: 'PLACEHOLDER LORE — The Fringe was the country\'s first server farm, then its first slum. The grid still hums under the asphalt, and the people who stayed learned to speak in static.',
    grass: '#0e0a1a',
    road: '#1d1735',
    building: '#271d47',
    buildingAlt: '#1a1433',
    accent: '#ff2fa0',
    neon: '#ff2fa0',
    neon2: '#28e6ff',
  },
  {
    id: 'rustwater',
    name: 'Rustwater',
    hook: 'Flooded docks. Everything here is wet, lit, and watching.',
    lore: 'PLACEHOLDER LORE — Rustwater drowned twice and kept trading anyway. Barges run on stolen current, and every canal is a shortcut for someone who does not want to be seen.',
    grass: '#06140f',
    road: '#12222a',
    building: '#173540',
    buildingAlt: '#102630',
    accent: '#28e6ff',
    neon: '#2bffd0',
    neon2: '#ff2fa0',
  },
  {
    id: 'glassgrid',
    name: 'Glassgrid',
    hook: 'Downtown. Towers, cameras, and no cheap way out.',
    lore: 'PLACEHOLDER LORE — The Grid sold its skyline to whoever could pay in light. Guards here wear visors tuned to pick a heartbeat out of a crowd.',
    grass: '#0a0a1e',
    road: '#1c1b36',
    building: '#2a2452',
    buildingAlt: '#1f1c3d',
    accent: '#b06bff',
    neon: '#b06bff',
    neon2: '#28e6ff',
  },
  {
    id: 'halcyon',
    name: 'Halcyon Heights',
    hook: 'Cold air, clean streets, a checkpoint every block.',
    lore: 'PLACEHOLDER LORE — Halcyon was built as the escape hatch for people who never had to run. The road out of it is the only one that never closes — it just costs everything.',
    grass: '#08101c',
    road: '#17222f',
    building: '#22323f',
    buildingAlt: '#1a2734',
    accent: '#28e6ff',
    neon: '#28e6ff',
    neon2: '#ff8acb',
  },
  {
    id: 'lockdown',
    name: 'Lockdown Borderlands',
    hook: 'The last 20. Past the fence is another country.',
    lore: 'PLACEHOLDER LORE — The Borderlands are not a place so much as a countdown. The lights are red on purpose: they want you to see the finish and know you probably will not reach it.',
    grass: '#15080e',
    road: '#2b1420',
    building: '#3d1c2e',
    buildingAlt: '#2c1322',
    accent: '#ff2f5e',
    neon: '#ff2f5e',
    neon2: '#ffd24a',
  },
]

export function regionIndexForCity(city: number): number {
  return Math.min(REGIONS.length - 1, Math.max(0, Math.floor((city - 1) / CITIES_PER_REGION)))
}

export function regionForCity(city: number): Region {
  return REGIONS[regionIndexForCity(city)]
}

// Scaling curve helpers -------------------------------------------------

// every city is a little bigger than the last: 38x30 out of the gate, 84x66 by the border
function mapSize(city: number): { w: number; h: number } {
  const w = Math.min(84, Math.round(38 + (city - 1) * 0.46))
  const h = Math.min(66, Math.round(30 + (city - 1) * 0.36))
  return { w, h }
}

// 2 clue links at City 1, growing to 9 by the end of the run
function clueCount(city: number): number {
  return Math.min(9, 2 + Math.floor((city - 1) / 12))
}

/**
 * The opening-levels hand-hold. Only the first two clues of a chain, and only in
 * the first few cities, get pointed at: close-together landmarks, a direction and
 * distance in the riddle, the tracker arrow, and hint rings. Everything after
 * that has to be found from the riddle alone.
 */
export const CLUE_ASSIST_MAX_CITY = 5
export const CLUE_ASSIST_CLUES = 2

export function clueAssist(city: number, clueIndex: number): boolean {
  return city <= CLUE_ASSIST_MAX_CITY && clueIndex < CLUE_ASSIST_CLUES
}

/** "4 blocks north-east" — the early-game hand-hold */
function describeDirection(from: Vec, to: Vec): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const blocks = Math.max(1, Math.round(Math.hypot(dx, dy)))
  const ew = Math.abs(dx) < 3 ? '' : dx > 0 ? 'east' : 'west'
  const ns = Math.abs(dy) < 3 ? '' : dy > 0 ? 'south' : 'north'
  const dir = ns && ew ? `${ns}-${ew}` : ns || ew || 'nearby'
  return `${blocks} block${blocks === 1 ? '' : 's'} ${dir}`
}

// More guards, wider cones, faster later
function guardSpec(city: number, rng: RNG): { n: number; dist: number; half: number; speed: number } {
  const n = Math.min(10, 2 + Math.floor(city / 12) + rng.int(0, 1))
  const dist = Math.min(9.5, 4.5 + city * 0.05)
  const half = Math.min(0.62, 0.42 + city * 0.002)
  const speed = Math.min(2.6, 1.35 + city * 0.012)
  return { n, dist, half, speed }
}

const RIDDLES: Array<(next: string, gate: string) => string> = [
  (n) => `The next word waits where ${n}.`,
  (n) => `Ask ${n} — they saw the courier pass.`,
  (n) => `Rumor says the stamp hides near ${n}.`,
  (n, g) => `Follow the chain: ${n}... and when the chain ends, ${g} opens.`,
]

export function generateCity(city: number): World {
  const rng = new RNG(city * 7919 + 13)
  const region = regionForCity(city)
  const { w, h } = mapSize(city)
  const tiles: TileKind[] = new Array(w * h).fill('grass' as TileKind)
  const idx = (x: number, y: number) => y * w + x

  // street grid: vertical + horizontal roads every 6-9 tiles
  const vRoads: number[] = []
  for (let x = rng.int(4, 7); x < w - 3; x += rng.int(6, 9)) vRoads.push(x)
  const hRoads: number[] = []
  for (let y = rng.int(4, 7); y < h - 3; y += rng.int(6, 9)) hRoads.push(y)

  const setTile = (x: number, y: number, t: TileKind) => {
    if (x >= 0 && y >= 0 && x < w && y < h) tiles[idx(x, y)] = t
  }
  const getTile = (x: number, y: number): TileKind =>
    x >= 0 && y >= 0 && x < w && y < h ? tiles[idx(x, y)] : 'building'

  const paintRoad = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const t = getTile(x + dx, y + dy)
        if (t !== 'building') setTile(x + dx, y + dy, 'road')
      }
  }
  for (const x of vRoads) for (let y = 0; y < h; y++) paintRoad(x, y)
  for (const y of hRoads) for (let x = 0; x < w; x++) paintRoad(x, y)

  // sidewalk ring around roads
  const sidewalkify = () => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (tiles[idx(x, y)] !== 'grass') continue
        let near = false
        for (let dy = -1; dy <= 1 && !near; dy++)
          for (let dx = -1; dx <= 1 && !near; dx++)
            if (getTile(x + dx, y + dy) === 'road') near = true
        if (near) tiles[idx(x, y)] = 'sidewalk'
      }
  }
  sidewalkify()

  // fill blocks between roads with buildings + pockets of park
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      if (tiles[idx(x, y)] !== 'grass') continue
      if (rng.chance(0.16)) {
        tiles[idx(x, y)] = rng.chance(0.35) ? 'park' : 'plaza'
        continue
      }
      tiles[idx(x, y)] = 'building'
    }

  const props: Prop[] = []
  let propId = 1
  const addProp = (
    kind: PropKind,
    tx: number,
    ty: number,
    extra?: Partial<Prop>,
  ): Prop => {
    const p: Prop = {
      id: propId++,
      kind,
      x: tx * TS + TS / 2,
      y: ty * TS + TS / 2,
      blocking: true,
      climbable: false,
      hide: false,
      used: false,
      ...extra,
    }
    props.push(p)
    return p
  }

  const walkable = (t: TileKind) =>
    t === 'road' || t === 'sidewalk' || t === 'plaza' || t === 'park'

  const freeSpotNear = (tx: number, ty: number): Vec | null => {
    for (let r = 1; r < 8; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const x = tx + dx
          const y = ty + dy
          if (!walkable(getTile(x, y))) continue
          const occupied = props.some(
            (p) => Math.round(p.x / TS - 0.5) === x && Math.round(p.y / TS - 0.5) === y,
          )
          if (!occupied) return { x, y }
        }
    return null
  }

  // scatter decor + interactables on walkable tiles
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const t = tiles[idx(x, y)]
      if (!walkable(t)) continue
      if (props.some((p) => Math.round(p.x / TS - 0.5) === x && Math.round(p.y / TS - 0.5) === y))
        continue
      const r = rng.next()
      if (t === 'park') {
        if (r < 0.3) addProp('tree', x, y)
        else if (r < 0.42) addProp('bush', x, y, { blocking: false, hide: true })
        else if (r < 0.5) addProp('bench', x, y, { blocking: false })
        continue
      }
      if (t === 'plaza' && r < 0.06) {
        addProp('fountain', x, y)
        continue
      }
      if (t === 'sidewalk' || t === 'road') {
        if (r < 0.025) addProp('tree', x, y, { blocking: false })
        else if (r < 0.045) addProp('crate', x, y, { climbable: true })
        else if (r < 0.06) addProp('fence', x, y, { climbable: true })
        else if (r < 0.07) addProp('dumpster', x, y, { climbable: true, hide: true })
        else if (r < 0.085) addProp('trash', x, y, { blocking: false })
        else if (r < 0.095) addProp('coin', x, y, { blocking: false })
        else if (r < 0.105) addProp('stall', x, y)
      }
    }

  // guarantee a fountain
  if (!props.some((p) => p.kind === 'fountain')) {
    const spot = freeSpotNear(Math.floor(w / 2), Math.floor(h / 2)) ?? { x: 2, y: 2 }
    addProp('fountain', spot.x, spot.y)
  }

  // landmarks / services near road corners
  const cornerSpots: Vec[] = []
  for (const vx of vRoads)
    for (const hy of hRoads) {
      const s = freeSpotNear(vx + 2, hy + 2)
      if (s) cornerSpots.push(s)
    }
  rng.shuffle(cornerSpots)

  const takeSpot = (): Vec => cornerSpots.pop() ?? { x: rng.int(2, w - 3), y: rng.int(2, h - 3) }

  const shops = Math.max(1, 2 + Math.floor(city / 25))
  for (let i = 0; i < shops; i++) {
    const s = takeSpot()
    addProp('shop', s.x, s.y, { data: rng.chance(0.5) ? 'food' : 'water' })
  }
  for (let i = 0; i < 2 + Math.floor(city / 20); i++) {
    const s = takeSpot()
    addProp('house', s.x, s.y, { data: rng.chance(0.6) ? 'food' : 'water', blocking: false })
  }
  // clue-capable landmarks scale with the city, since later cities chain more clues
  for (let i = 0; i < 3 + Math.floor(city / 12); i++) {
    const s = takeSpot()
    addProp('bar', s.x, s.y)
  }
  for (let i = 0; i < 3 + Math.floor(city / 12); i++) {
    const s = takeSpot()
    addProp('board', s.x, s.y)
  }
  for (let i = 0; i < 3 + Math.floor(city / 25); i++) {
    const s = takeSpot()
    addProp('kid', s.x, s.y, { blocking: false })
  }
  for (let i = 0; i < 3 + Math.floor(city / 25); i++) {
    const s = takeSpot()
    addProp('radio', s.x, s.y)
  }
  for (let i = 0; i < 4 + Math.floor(city / 20); i++) {
    const s = takeSpot()
    addProp('graffiti', s.x, s.y, { blocking: false })
  }
  // safehouse benches in quiet corners
  for (let i = 0; i < 4 + Math.floor(city / 15); i++) {
    const s = takeSpot()
    addProp('bench', s.x, s.y, { blocking: false, data: 'sleep' })
  }
  // water tower = high-value loot, hard to reach (fenced)
  const wt = takeSpot()
  addProp('waterTower', wt.x, wt.y)
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const s = freeSpotNear(wt.x + dx, wt.y + dy)
    if (s) addProp('fence', s.x, s.y, { climbable: true })
  }

  // spawn: left edge; gate: right edge, carve a road to it
  const spawn = { x: 1.5, y: Math.floor(h / 2) + 0.5 }
  const gateY = Math.floor(h / 2)
  for (let x = 0; x < w; x++) {
    for (let dy = -1; dy <= 1; dy++) {
      const t = getTile(x, gateY + dy)
      if (t === 'building') tiles[idx(x, gateY + dy)] = 'sidewalk'
    }
  }
  const gate = { x: w - 1, y: gateY + 0.5 }

  // clue chain — must be reachable & ordered; anchor landmarks in sequence
  const nClues = clueCount(city)
  const chainKinds: PropKind[] = rng.shuffle(['board', 'bar', 'kid', 'radio', 'graffiti'] as PropKind[])
  const clues: Clue[] = []
  const used = new Set<number>()
  for (let i = 0; i < nClues; i++) {
    const kind = chainKinds[i % chainKinds.length]
    // find a prop of that kind not yet used, closest to previous clue for a short first hop
    const candidates = props.filter((p) => p.kind === kind && !used.has(p.id))
    if (candidates.length === 0) continue
    const prev = clues.length
      ? { x: clues[clues.length - 1].x, y: clues[clues.length - 1].y }
      : spawn
    candidates.sort(
      (a, b) => (a.x - prev.x) ** 2 + (a.y - prev.y) ** 2 - ((b.x - prev.x) ** 2 + (b.y - prev.y) ** 2),
    )
    // the assisted opening clues sit right next to the last one; everything after
    // is picked from the nearest few, so the chain scatters across the city
    const chosen = clueAssist(city, i)
      ? candidates[0]
      : candidates[rng.int(0, Math.min(3, candidates.length - 1))]
    used.add(chosen.id)
    chosen.data = 'clue'
    clues.push({
      propId: chosen.id,
      x: chosen.x,
      y: chosen.y,
      riddle: '',
      puzzle: null,
    })
  }

  // riddles point to the next clue's landmark; final one points to the gate.
  // Only the assisted opening clues say which way and how far.
  const gateName = 'the border gate'
  for (let i = 0; i < clues.length; i++) {
    const from: Vec = i === 0 ? spawn : { x: clues[i - 1].x / TS, y: clues[i - 1].y / TS }
    const nextClue = i + 1 < clues.length ? clues[i + 1] : null
    const kind = nextClue ? props.find((p) => p.id === nextClue.propId)!.kind : 'border gate'
    const target: Vec = nextClue ? { x: nextClue.x / TS, y: nextClue.y / TS } : { x: w - 1, y: gateY + 0.5 }
    const landmark = clueAssist(city, i + 1) ? `the ${kind} (${describeDirection(from, target)})` : `the ${kind}`
    clues[i].riddle = rng.pick(RIDDLES)(landmark, gateName)
  }

  // puzzles start appearing from city 4, one per extra clue
  if (city >= 4) {
    for (let i = 0; i < clues.length; i++) {
      if (i === 0) continue // first clue always free
      clues[i].puzzle = makePuzzle(rng, city)
    }
  }

  // guards
  const spec = guardSpec(city, rng)
  const guards: Guard[] = []
  for (let i = 0; i < spec.n; i++) {
    const path: Vec[] = []
    const anchor = cornerSpots.length
      ? cornerSpots[rng.int(0, cornerSpots.length - 1)]
      : { x: rng.int(4, w - 5), y: rng.int(4, h - 5) }
    let cx = Math.floor(anchor.x)
    let cy = Math.floor(anchor.y)
    const nodes = rng.int(3, 5)
    for (let k = 0; k < nodes; k++) {
      // hop to a nearby road tile for a legal patrol route
      for (let tries = 0; tries < 40; tries++) {
        const nx = cx + rng.int(-8, 8)
        const ny = cy + rng.int(-8, 8)
        if (walkable(getTile(nx, ny))) {
          path.push({ x: nx + 0.5, y: ny + 0.5 })
          cx = nx
          cy = ny
          break
        }
      }
    }
    if (path.length === 0) path.push({ x: cx + 0.5, y: cy + 0.5 })
    guards.push({
      id: i,
      x: path[0].x,
      y: path[0].y,
      path,
      wp: 1 % path.length,
      speed: spec.speed,
      state: 'patrol',
      alert: 0,
      dir: rng.float(0, Math.PI * 2),
      lastSeen: null,
      searchTimer: 0,
      visionDist: spec.dist * TS,
      visionHalfAngle: spec.half,
      stuckTimer: 0,
    })
  }

  const propAt = new Map<number, Prop>()
  for (const p of props) propAt.set(p.id, p)

  // difficulty: drain per in-game hour (day = 24h compressed)
  const drainBase = 1 + city * 0.012
  return {
    city,
    w,
    h,
    tiles,
    props,
    propAt,
    spawn,
    gate,
    clues,
    guards,
    region,
    dayLengthSec: Math.max(150, 240 - city),
    drainPerHour: { hunger: 0.9 * drainBase, thirst: 1.35 * drainBase },
    freeFood: props.filter((p) => p.data === 'food').length,
    freeWater: props.filter((p) => p.data === 'water').length,
  }
}

function makePuzzle(rng: RNG, city: number) {
  const roll = rng.next()
  const hard = city >= 30
  if (roll < 0.4) {
    const words = hard
      ? ['FENCE', 'ALLEY', 'GUARD', 'NIGHT', 'RIVER', 'BRAVE']
      : ['GATE', 'ROAD', 'CITY', 'KEY', 'MAP']
    const word = rng.pick(words)
    const letters = word.split('')
    let scrambled = letters
    for (let tries = 0; tries < 10; tries++) {
      scrambled = rng.shuffle([...letters])
      if (scrambled.join('') !== word) break
    }
    return { kind: 'word' as const, scrambled: scrambled.join(' '), answer: word, hint: 'Unscramble the letters' }
  }
  if (roll < 0.7) {
    const a = rng.int(2, 9)
    const b = rng.int(2, 9)
    const c = rng.int(2, 9)
    return {
      kind: 'code' as const,
      prompt: `The old gate code: multiply ${a} by ${b}, then add ${c}.`,
      answer: String(a * b + c),
    }
  }
  const symbols = ['▲', '●', '■', '★', '◆']
  const shown = rng.shuffle([...symbols]).slice(0, 4)
  const answer = [0, 1, 2].map(() => rng.int(0, shown.length - 1))
  return {
    kind: 'sequence' as const,
    shown,
    answer,
  }
}
