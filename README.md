# 🏃 Border Run

100 cities. One stickman. Get out of the country.

A top-down puzzle-survival game: you're a stickman fleeing across a country with 100 cities
between you and the border. Clear one city, move to the next — each one harder than the last.
Find clues, solve puzzles, eat, drink, sleep... and stay out of the guard's sight.

**▶ Play now: [https://d210000.github.io/Borderrun/](https://d210000.github.io/Borderrun/)**

## How to play

- Every city hides a **clue chain** — notice boards, bars, radios, graffiti, kids. Follow the
  riddles in order to earn the **border pass**.
- Reach the **east gate** with the pass to move to the next city. No pass, no exit.
- Watch your **hunger and thirst**: drink free at fountains, buy food at shops. Collapsing
  restarts the city from Day 1.
- **Guards patrol** with vision cones. They're sharper at night — hide (H) in bushes and crates,
  or slip past. Getting caught costs you the day.
- **Sleep on benches** — nights on the street take a toll.
- From **City 4** onward, clues carry puzzles (word, code, symbol sequences). From **City 30**
  they get harder. Days get shorter, guards get meaner.

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

Touch controls appear automatically on mobile.

## Features

- 5 regions × 20 cities, procedurally generated and always solvable
- Day/night cycle with guard vision changes
- Riddle clue chains with escalating puzzles
- Survival stats, shops, coins, safehouse benches
- Auto-save — continue at the last city you cleared

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5180/.

## Tech

Vite + React + TypeScript, canvas rendering, zero game-engine dependencies.
The game deploys to GitHub Pages automatically on every push to `main`
(see `.github/workflows/deploy.yml`).
