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

export const REGIONS: Region[] = [
  { name: 'Farmlands', grass: '#7aa653', road: '#8d8677', building: '#b08954', buildingAlt: '#9c7546', accent: '#e2c069' },
  { name: 'Riverlands', grass: '#6fa06a', road: '#7f8a8c', building: '#7ba3b5', buildingAlt: '#6a8fa0', accent: '#9fd6d2' },
  { name: 'Greenfields', grass: '#63a862', road: '#8d8677', building: '#a3b06b', buildingAlt: '#8f9c5c', accent: '#d7e28a' },
  { name: 'Suburbs', grass: '#8a9a5b', road: '#9a938c', building: '#c8b592', buildingAlt: '#b3a17f', accent: '#e8d9a0' },
  { name: 'Old Town', grass: '#7d9a6a', road: '#a09a92', building: '#c99a6e', buildingAlt: '#b3875c', accent: '#e6b877' },
  { name: 'Downtown', grass: '#6f9a6f', road: '#6f6f74', building: '#8f96a8', buildingAlt: '#7d8496', accent: '#9fb6d9' },
  { name: 'Harbor', grass: '#6d9d86', road: '#7d828a', building: '#7fa0ad', buildingAlt: '#6b8c99', accent: '#8fd0c5' },
  { name: 'Industrial', grass: '#7d8f6a', road: '#75726c', building: '#9c9186', buildingAlt: '#8a7f74', accent: '#d9a05b' },
  { name: 'Highlands', grass: '#7f9a7d', road: '#93837b', building: '#a89a8c', buildingAlt: '#94867a', accent: '#cfd8c2' },
  { name: 'Borderlands', grass: '#8f9a6a', road: '#8a7f70', building: '#b5975f', buildingAlt: '#9d8050', accent: '#e0c25a' },
]

// Scaling curve helpers -------------------------------------------------

function mapSize(city: number): { w: number; h: number } {
  const w = Math.min(64, 38 + Math.floor(city / 8) * 2)
  const h = Math.min(64, 30 + Math.floor(city / 10) * 2)
  return { w, h }
}

// 2 -> 5 clue links across 100 cities
function clueCount(city: number): number {
  return Math.min(5, 2 + Math.floor((city - 1) / 25))
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
  (n, g) => `Follow the chain: ${n}... and when the chain ends, the gate (${g}) opens.`,
]

export function generateCity(city: number): World {
  const rng = new RNG(city * 7919 + 13)
  const region = REGIONS[Math.min(REGIONS.length - 1, Math.floor((city - 1) / 10))]
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
  for (let i = 0; i < 3 + Math.floor(city / 15); i++) {
    const s = takeSpot()
    addProp('bar', s.x, s.y)
  }
  for (let i = 0; i < 2 + Math.floor(city / 30); i++) {
    const s = takeSpot()
    addProp('board', s.x, s.y)
  }
  for (let i = 0; i < 2; i++) {
    const s = takeSpot()
    addProp('kid', s.x, s.y, { blocking: false })
  }
  for (let i = 0; i < 2; i++) {
    const s = takeSpot()
    addProp('radio', s.x, s.y)
  }
  for (let i = 0; i < 3; i++) {
    const s = takeSpot()
    addProp('graffiti', s.x, s.y, { blocking: false })
  }
  // safehouse benches in quiet corners
  for (let i = 0; i < 3 + Math.floor(city / 20); i++) {
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
    // pick among the 3 nearest to add variety
    const chosen = candidates[rng.int(0, Math.min(2, candidates.length - 1))]
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

  // riddles point to the next clue's landmark; final one points to the gate
  const gateName = 'the border gate'
  for (let i = 0; i < clues.length; i++) {
    const next =
      i + 1 < clues.length
        ? `the ${props.find((p) => p.id === clues[i + 1].propId)!.kind} by the ${
            getTile(Math.floor(clues[i + 1].x / TS), Math.floor(clues[i + 1].y / TS)) === 'park'
              ? 'park'
              : 'street'
          }`
        : gateName
    clues[i].riddle = rng.pick(RIDDLES)(next, gateName)
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
