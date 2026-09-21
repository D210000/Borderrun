import { TS } from './city'
import type { Game } from './engine'
import type { Prop, World } from './types'

const SKIN = '#2b2b2b'

export function render(ctx: CanvasRenderingContext2D, game: Game, viewW: number, viewH: number) {
  const world = game.world
  const p = game.player

  ctx.fillStyle = '#20241c'
  ctx.fillRect(0, 0, viewW, viewH)

  // camera follows player
  const camX = Math.max(0, Math.min(world.w * TS - viewW, p.x - viewW / 2))
  const camY = Math.max(0, Math.min(world.h * TS - viewH, p.y - viewH / 2))
  ctx.save()
  ctx.translate(-camX, -camY)

  drawTiles(ctx, world, camX, camY, viewW, viewH)
  drawGate(ctx, world, game)

  // props sorted by y for pseudo-depth
  const visible = world.props.filter(
    (pr) => pr.x > camX - 40 && pr.x < camX + viewW + 40 && pr.y > camY - 40 && pr.y < camY + viewH + 40,
  )
  visible.sort((a, b) => a.y - b.y)

  for (const pr of visible) if (pr.y <= p.y || true) drawProp(ctx, pr, world)

  drawGuardCones(ctx, world)
  for (const gd of world.guards) drawGuard(ctx, gd)

  drawPlayer(ctx, game)

  // clue hint sparkle on the next clue landmark
  const nextClue = world.clues[p.clueIndex]
  if (nextClue && !p.hasPass) {
    const prop = world.propAt.get(nextClue.propId)
    if (prop) {
      const pulse = (Math.sin(performance.now() / 200) + 1) / 2
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.35 + pulse * 0.45})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(prop.x, prop.y, 16 + pulse * 4, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  if (p.hidden) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(camX, camY, viewW, viewH)
  }

  // night overlay
  const dayFrac = game.timeSec / world.dayLengthSec
  let darkness = 0
  if (dayFrac > 0.7) darkness = Math.min(0.75, (dayFrac - 0.7) / 0.15 * 0.75)
  if (dayFrac < 0.12) darkness = Math.max(0, 0.75 * (1 - dayFrac / 0.12))
  if (darkness > 0) {
    ctx.fillStyle = `rgba(8, 10, 24, ${darkness})`
    ctx.fillRect(camX, camY, viewW, viewH)
    // warm circle around player
    const grad = ctx.createRadialGradient(p.x, p.y, 30, p.x, p.y, 190)
    grad.addColorStop(0, `rgba(255,220,150,${0.16 * darkness})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(camX, camY, viewW, viewH)
  }

  ctx.restore()
}

function drawTiles(ctx: CanvasRenderingContext2D, world: World, camX: number, camY: number, viewW: number, viewH: number) {
  const x0 = Math.max(0, Math.floor(camX / TS))
  const y0 = Math.max(0, Math.floor(camY / TS))
  const x1 = Math.min(world.w - 1, Math.ceil((camX + viewW) / TS))
  const y1 = Math.min(world.h - 1, Math.ceil((camY + viewH) / TS))
  const r = world.region
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const t = world.tiles[y * world.w + x]
      let color = r.grass
      if (t === 'road') color = r.road
      else if (t === 'sidewalk') color = shade(r.road, 18)
      else if (t === 'plaza') color = '#b9b0a2'
      else if (t === 'park') color = shade(r.grass, -14)
      else if (t === 'building') color = r.buildingAlt
      else if (t === 'water') color = '#4d7ea8'
      ctx.fillStyle = color
      ctx.fillRect(x * TS, y * TS, TS, TS)
      if (t === 'building') {
        ctx.fillStyle = 'rgba(0,0,0,0.12)'
        ctx.fillRect(x * TS, y * TS, TS, TS)
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'
        ctx.strokeRect(x * TS + 0.5, y * TS + 0.5, TS - 1, TS - 1)
      }
    }
}

function drawGate(ctx: CanvasRenderingContext2D, world: World, game: Game) {
  const g = world.gate
  const x = (world.w - 1) * TS
  const y = g.y * TS
  const open = game.player.hasPass
  ctx.fillStyle = open ? '#e8c35a' : '#777'
  ctx.fillRect(x - 6, y - TS * 1.5, 8, TS * 3)
  ctx.fillRect(x - 6, y + TS * 1.5 - 6, 8, 6)
  ctx.fillStyle = open ? '#ffe9a8' : '#999'
  ctx.font = 'bold 12px monospace'
  ctx.fillText(open ? 'EXIT ✓' : 'LOCKED', x - 24, y - TS * 1.5 - 6)
  if (open) {
    const pulse = (Math.sin(performance.now() / 250) + 1) / 2
    ctx.strokeStyle = `rgba(255, 220, 100, ${0.4 + pulse * 0.5})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, y, 26 + pulse * 6, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawProp(ctx: CanvasRenderingContext2D, pr: Prop, world: World) {
  const x = pr.x
  const y = pr.y
  const accent = world.region.accent
  ctx.lineWidth = 1.5
  switch (pr.kind) {
    case 'tree':
      ctx.fillStyle = '#4a3626'
      ctx.fillRect(x - 2, y - 2, 4, 10)
      ctx.fillStyle = '#3f7d3a'
      ctx.beginPath()
      ctx.arc(x, y - 6, 9, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'bush':
      ctx.fillStyle = '#2f6b33'
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'bench':
      ctx.fillStyle = '#8a6a44'
      ctx.fillRect(x - 9, y - 3, 18, 5)
      if (pr.data === 'sleep') {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx.strokeRect(x - 9, y - 3, 18, 5)
      }
      break
    case 'fountain':
      ctx.fillStyle = '#9aa5ad'
      ctx.beginPath()
      ctx.arc(x, y, 11, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6fb7d9'
      ctx.beginPath()
      ctx.arc(x, y, 7, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'crate': {
      ctx.fillStyle = '#a8783c'
      ctx.fillRect(x - 10, y - 10, 20, 20)
      ctx.strokeStyle = '#6f4c22'
      ctx.strokeRect(x - 10, y - 10, 20, 20)
      ctx.beginPath()
      ctx.moveTo(x - 10, y - 10)
      ctx.lineTo(x + 10, y + 10)
      ctx.stroke()
      break
    }
    case 'fence':
      ctx.strokeStyle = '#7d746a'
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 5, y - 8)
        ctx.lineTo(x + i * 5, y + 8)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.moveTo(x - 12, y - 5)
      ctx.lineTo(x + 12, y - 5)
      ctx.moveTo(x - 12, y + 5)
      ctx.lineTo(x + 12, y + 5)
      ctx.stroke()
      break
    case 'dumpster':
      ctx.fillStyle = '#3f7042'
      ctx.fillRect(x - 11, y - 8, 22, 16)
      ctx.fillStyle = '#2c5030'
      ctx.fillRect(x - 11, y - 8, 22, 5)
      break
    case 'trash':
      ctx.fillStyle = '#5d5d5d'
      ctx.fillRect(x - 5, y - 6, 10, 12)
      break
    case 'coin':
      ctx.fillStyle = '#ffd24a'
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'stall':
      ctx.fillStyle = accent
      ctx.fillRect(x - 12, y - 12, 24, 10)
      ctx.fillStyle = '#7a5a34'
      ctx.fillRect(x - 10, y - 2, 20, 8)
      break
    case 'shop':
      ctx.fillStyle = '#4c5870'
      ctx.fillRect(x - 14, y - 14, 28, 28)
      ctx.fillStyle = accent
      ctx.fillRect(x - 14, y - 14, 28, 7)
      ctx.fillStyle = '#ffe9a8'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(pr.data === 'food' ? 'FOOD' : 'WATER', x, y + 3)
      ctx.textAlign = 'left'
      break
    case 'house': {
      ctx.fillStyle = '#b5987a'
      ctx.fillRect(x - 12, y - 12, 24, 24)
      ctx.fillStyle = '#8a4436'
      ctx.fillRect(x - 12, y - 12, 24, 8)
      ctx.fillStyle = '#5a3a22'
      ctx.fillRect(x - 3, y + 2, 6, 10)
      break
    }
    case 'board':
      ctx.fillStyle = '#6f4c22'
      ctx.fillRect(x - 9, y - 12, 18, 14)
      ctx.fillStyle = '#e8dcc2'
      ctx.fillRect(x - 7, y - 10, 14, 10)
      break
    case 'bar': {
      ctx.fillStyle = '#5c3b2e'
      ctx.fillRect(x - 13, y - 13, 26, 26)
      ctx.fillStyle = accent
      ctx.fillRect(x - 13, y - 13, 26, 6)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('BAR', x, y + 3)
      ctx.textAlign = 'left'
      break
    }
    case 'kid':
      ctx.fillStyle = '#c9a227'
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#333'
      ctx.beginPath()
      ctx.arc(x, y - 1, 3.5, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'radio':
      ctx.fillStyle = '#444'
      ctx.fillRect(x - 8, y - 6, 16, 12)
      ctx.strokeStyle = '#999'
      ctx.beginPath()
      ctx.moveTo(x + 4, y - 6)
      ctx.lineTo(x + 10, y - 14)
      ctx.stroke()
      break
    case 'graffiti':
      ctx.strokeStyle = '#d94f7e'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 7, 0.5, 4)
      ctx.stroke()
      break
    case 'waterTower':
      ctx.fillStyle = '#6f6f6f'
      ctx.fillRect(x - 12, y - 20, 4, 30)
      ctx.fillRect(x + 8, y - 20, 4, 30)
      ctx.fillStyle = '#8f8f8f'
      ctx.fillRect(x - 14, y - 26, 28, 12)
      break
  }
}

function drawGuard(ctx: CanvasRenderingContext2D, gd: { x: number; y: number; state: string; alert: number }) {
  // body
  ctx.strokeStyle = gd.state === 'chase' ? '#d94040' : gd.alert > 0.4 ? '#e0a040' : '#404040'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(gd.x, gd.y, 6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(gd.x, gd.y + 6)
  ctx.lineTo(gd.x, gd.y + 14)
  ctx.stroke()
  // hat
  ctx.fillStyle = gd.state === 'chase' ? '#d94040' : '#2f4f6f'
  ctx.fillRect(gd.x - 5, gd.y - 10, 10, 3)
}

function drawGuardCones(ctx: CanvasRenderingContext2D, world: World) {
  for (const gd of world.guards) {
    const color =
      gd.state === 'chase' ? 'rgba(220, 60, 60, 0.25)' : gd.alert > 0.4 ? 'rgba(230, 170, 60, 0.22)' : 'rgba(230, 230, 230, 0.13)'
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(gd.x, gd.y)
    ctx.arc(gd.x, gd.y, gd.visionDist, gd.dir - gd.visionHalfAngle, gd.dir + gd.visionHalfAngle)
    ctx.closePath()
    ctx.fill()
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, game: Game) {
  const p = game.player
  const x = p.x
  const y = p.y
  const swing = Math.sin(p.anim) * (p.moving ? 4 : 0)

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(x, y + 14, 8, 3.5, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = p.hidden ? 'rgba(230,230,230,0.45)' : SKIN
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'

  // head
  ctx.beginPath()
  ctx.arc(x, y - 8, 5, 0, Math.PI * 2)
  ctx.stroke()
  // body
  ctx.beginPath()
  ctx.moveTo(x, y - 3)
  ctx.lineTo(x, y + 4)
  ctx.stroke()
  // legs
  ctx.beginPath()
  ctx.moveTo(x, y + 4)
  ctx.lineTo(x - 4, y + 12 + swing * 0.4)
  ctx.moveTo(x, y + 4)
  ctx.lineTo(x + 4, y + 12 - swing * 0.4)
  ctx.stroke()
  // arms
  ctx.beginPath()
  ctx.moveTo(x, y - 1)
  ctx.lineTo(x - 5, y + 4 + swing * 0.5)
  ctx.moveTo(x, y - 1)
  ctx.lineTo(x + 5, y + 4 - swing * 0.5)
  ctx.stroke()

  // tiny pass indicator
  if (p.hasPass) {
    ctx.fillStyle = '#ffd24a'
    ctx.fillRect(x + 6, y - 6, 6, 4)
  }
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, (n >> 16) + amt))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt))
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
