# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Crayon Snake is a browser-based snake game built with React 18 and Vite 6. It features a hand-drawn crayon aesthetic on a notebook paper background, with full mobile support (touch swipe + D-pad). The UI text is in Spanish.

## Commands

- `npm run dev` — Start dev server (http://localhost:5173)
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build

No test framework or linter is configured.

## Architecture

The entire game lives in a single component: `src/CrayonSnake.jsx` (~567 lines). There is no routing, no state management library, and no component hierarchy beyond `main.jsx → App.jsx → CrayonSnake.jsx`.

### CrayonSnake.jsx Structure

The file is organized in sections:

1. **Constants** (top) — Board dimensions (22×22, 20px cells), speed settings (140ms initial, -3ms per food, 50ms floor), 6 crayon color definitions, direction vectors, key mappings
2. **Utility functions** — `isOpposite`, `sameDir`, `makeInitSnake`, `randomPos`
3. **Sub-components** — `CrayonHead` (SVG crayon rendering with rotation/animation), `DpadBtn` (mobile control button with debounce)
4. **CSS keyframes** — Injected via `<style>` tag: wobble, starSpin, fadeIn, scribble, rainbow, blink
5. **State & refs** — React hooks for snake position, food, bonus, direction, game state (`"idle"` | `"playing"` | `"over"`), score, speed, color, particles, grace ticks
6. **Game logic** — Particle spawning, game start/reset, direction queuing (max 2 ahead), tick function (movement, collision, scoring, speed increase)
7. **Input handlers** — Keyboard (arrows + WASD), touch swipe (25px threshold), D-pad callbacks
8. **Render** — SVG game board with grid overlay, crayon trail rendering, food/bonus/particle rendering, idle/game-over overlays, D-pad layout, score display

### Key Game Mechanics

- **Input queue**: Buffers up to 2 direction changes for responsive control; validates against opposite-direction reversal
- **Grace period**: 3 ticks of invulnerability at game start (snake blinks during grace)
- **Bonus stars**: 20% spawn chance after eating food, 5-second lifetime, worth 50 points
- **Ref snapshot** (`r.current`): Game state is synced to a ref so the interval-based tick function always reads current values
