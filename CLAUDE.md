# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static HTML/CSS/JS artist website for DAX J (techno DJ/producer). No build system, no framework, no npm. Deployed via Netlify drag-and-drop.

## Files

- `index.html` — Design theme picker showing 4 layout concepts (T2 Greige, T3 Warm Brown, T4 Graphite, T6 Zoom)
- `shows.html` — Tour dates, 4-column terminal layout with scramble hover effect
- `releases.html` — Album art infinite-scroll grid with 3D tilt hover
- `netlify.toml` — Redirects all `/*` to `/index.html` (status 200)

## Design System

**shows.html** uses a strict terminal/monospace aesthetic ():
- Font: IBM Plex Mono only — weights 300, 400, 500. No display fonts.
- Colors: `#000` background, `#fff` text, `#3fe1b1` cyan accent on hover
- All text uppercase, dense, small (0.52–0.72rem)
- Blinking cursor `▋` in header via CSS animation

**releases.html** and **index.html** use Bebas Neue + IBM Plex Mono + DM Sans.

## Shows Data

Show data lives as a JS object in `shows.html` — `const shows = { "2026": [...], "2025": [...], ... }` going back to 2015. Each entry is a plain string: `"DD/MM City, Venue"` (e.g. `"15/02 Berlin, Berghain"`).

The source text file is at `"images from me to you/dax shows.txt"`.

## Key Interactions

**shows.html scramble effect**: On `mouseenter`, characters resolve left-to-right from random glyphs to the real text (`scrambleIn`). On `mouseleave`, reverse right-to-left scramble (`scrambleOut`). Uses `requestAnimationFrame` with `el._raf` to cancel-and-restart cleanly.

**releases.html**: Pool of tiles positioned via `translate3d`, wrapping horizontally and vertically for infinite scroll. Wheel events drive smooth pan with a lerp stiffness factor.

## Image Paths

Images with spaces in folder names must be URL-encoded in `src` attributes: `images%20from%20me%20to%20you/...`. There are two copies of most images — one at the root `images from me to you/` and a duplicate under `releases/images from me to you/`.
