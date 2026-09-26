# 🏃 DILIMAZE CITIES

_100 cities. One hero. Get out of the country._  
A Dlicom game.

A top-down puzzle-survival game: you guide the **Dlicom mascot** across a country with 100 cities
between you and the border. Clear one city, move to the next — each one harder than the last.
Find clues, solve puzzles, eat, drink, sleep... and stay out of the guard's sight.

**▶ Play now: [https://d210000.github.io/Borderrun/](https://d210000.github.io/Borderrun/)**

## How to play

- Every city hides a **clue chain** — notice boards, bars, radios, graffiti, kids. Follow the
  riddles in order to earn the **border pass**.
- Reach the **east gate** with the pass to move to the next city. No pass, no exit.
- Watch your **hunger and thirst**: drink free at fountains, buy food at shops with **$DLI**.
  Collapsing restarts the city from Day 1.
- Collect **$DLI** tokens scattered around the streets (they disappear once picked up).
- **Opening help only**: at City 1–5 the first **two** clues of a chain are pointed at — a
  compass arrow, a live block count, and a direction in the riddle ("the bar, 17 blocks east").
  From City 6, or from the third clue on, nothing is marked and the riddles are all you get.
- **Guards patrol** with vision cones. They're sharper at night — hide (H) in bushes and crates,
  or slip past. Getting caught costs you the day.
- **Sleep on benches** — nights on the street take a toll.
- From **City 4** onward clues carry puzzles (word, code, symbol sequences); from **City 30**
  they get harder. Days get shorter and guards get meaner as you push east.
- Every city is **bigger than the last** (38x30 tiles out of the gate, 84x66 by the border) and
  hides **more clues** (2 at City 1, rising to 9 by City 100), so the chain gets longer and the
  search gets wider.
- Already-used things read as used: bins sit **open and empty**, houses go dark with the door
  **shut**, landmarks you've talked to get **crossed out**, and collected clues get a **green
  check**.
- Unsolved chains read as **scrambled signal** — the text resolves into plain language once you
  find the first clue in a city. Region lore resolves the same way once a whole region is cleared.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Run |
| E | Interact / talk / search |
| Space | Climb fences & crates |
| H | Hide |
| F / G | Eat / drink |
| T | Sleep (near a bench) |

Touch controls appear automatically on mobile: drag the joystick to move, push it to the edge to
run, tap the action buttons on the right.

## Profile & save system

Local-only, no backend, key `borderrun_profile` in `localStorage`.

- First load: onboarding screen — display name + avatar skin.
- Return visits: **"Welcome back, {name}"** with career stats, then resume at the last saved city
  (hunger, thirst, coins and clue progress included).
- Autosaves on city completion, day rollover, sleep, death and every 10 seconds of live play.
- **Reset profile** clears everything (available from the welcome screen).
- All storage access is wrapped in try/catch: unreadable or corrupt data falls back to a fresh
  in-memory profile, so the game always runs even with storage blocked.

## Project layout

```
src/
  game/
    brand.ts      Dlicom brand kit: names, colors, avatar skins (+ art + sprite hook)
    character.ts  the ONLY place the mascot is drawn — art, tints, poses, preview
  assets/
    dlicom.png    the mascot sprite (cropped + transparent, 58x44)
    city.ts       5 regions x 20 cities, generation, clue chains, puzzle factory, region lore
    engine.ts     game loop, player, guards, survival, clues, profile checkpoints
    render.ts     dark-neon canvas world renderer
    profile.ts    localStorage profile, migration, sanitisation, reset
    types.ts      shared types
    rng.ts        seeded RNG
  ui/
    Onboarding.tsx  name + avatar picker (with live canvas previews)
    WelcomeBack.tsx returning-player menu, stats, reset
    WorldMap.tsx    region/city select with fogged unreached cities + region lore files
    GlitchText.tsx  scrambled-until-unlocked copy
    HUD.tsx         neon HUD, clue tracker, toasts
    Menus.tsx       dialog / puzzle / caught / cleared / victory overlays
    TouchControls.tsx  joystick + action buttons
  App.tsx  screen flow: onboarding → welcome / map → game
  index.css  Dlicom neon theme (mirrors brand.ts colors)
```

## Fully functional now

- 5 regions × 20 procedurally generated cities (100 total), every one solvable
- Clue chains → riddle → puzzle → border pass → east gate → next city
- Difficulty ramp: the opening clues sit close together with explicit directions at City 1–5,
  then scatter and go vague; puzzles from City 4, harder from City 30
- Cities grow every level (38x30 → 84x66) and hide more clues (2 → 9)
- Survival loop: hunger, thirst, health, $DLI, shops, market stalls, fountains, benches, sleep
- Pickups and spent props read as such: collected clues get a green check, talked-to landmarks
  get crossed out, searched bins sit open and empty, shut houses go dark, $DLI tokens vanish
- Day/night cycle, guard patrols, vision cones, chase/search, hiding, climbing
- Profile system: onboarding, welcome-back, autosave, reset, corrupt-save recovery
- World map with fogged locked cities, replay of reached cities, region lore unlocks
- Real Dlicom mascot art, sliced and posed in code: alternating footfalls (one foot always
  planted), eyes that look where he's going and blink, plus crouch / climb / sleep / interact
- "You're Gone" display face (public domain, 1001 Fonts) across titles, buttons, HUD and labels
- Keyboard + touch controls, high-DPI canvas, safe-area aware mobile layout
- Auto-deploy to GitHub Pages on push to `main`

## Placeholder (swap when the real assets land)

- **Brand colors** — `BRAND.colors` in `src/game/brand.ts` are eyeballed from the mascot art.
  Change the hexes there and the entire game re-themes.
- **Display font** — `src/assets/youre-gone.otf` (You're Gone by 1001 Fonts, released into the
  Public Domain). It is caps-only, so it's applied to uppercase UI only; long-form copy and
  hints stay in the system sans. Swap the file and the `@font-face` name in `index.css` to
  change it. The canvas labels use the same family via `DISPLAY` in `render.ts`.
- **Region lore copy** — the `lore` / `hook` strings in `src/game/city.ts` are marked
  `PLACEHOLDER LORE`. Replace the text, the unlock plumbing already works.
- **Avatar art** — the shipped PNG lives at `src/assets/dlicom.png` (cropped, transparent,
  58x44) and is pointed at by `MASCOT_ART` in `brand.ts`. To drop in new art, replace that file
  (or change the URL / `height`) — nothing else needs touching. For a real animated sheet, set
  `sprite` (`url`, `frameW`, `frameH`, `cols`, `fps`, `poseRows`) on a skin instead; `character.ts`
  blits frames rather than posing a single image.
- **Skins** — `SKINS` holds four variants (Dlicom, Neon, Ghost, Sunset). They share the one PNG
  and are recolored at load with a canvas `color` blend (`tint`), so adding a variant is one
  entry. The canvas-drawn mascot is still in `character.ts` as the fallback if the PNG can't load.
- **Sound** — `profile.settings.sound` is stored and surfaced in the profile, but no audio is
  wired up yet.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5180/.

## Rebuilding the sprite from a screenshot

A pasted mascot image can be converted into the game-ready sprite (crop → drop the backdrop →
integer downscale) with the included tool:

```bash
powershell -NoProfile -File scripts/make-sprite.ps1 -In <paste.png> -Out src/assets/dlicom.png -TargetH 38
```

The source image needs no transparency — it flood-fills the dark backdrop from the border, so
dark pixels *inside* the character (eyes, outlines) are kept. Requires Windows PowerShell (it
uses the .NET PNG decoder).

## Tech

Vite + React + TypeScript, canvas rendering, zero game-engine dependencies. No image assets are
fetched at runtime — the one PNG is imported through Vite so it works under the GitHub Pages
subpath.
The game deploys to GitHub Pages automatically on every push to `main`
(see `.github/workflows/deploy.yml`).
