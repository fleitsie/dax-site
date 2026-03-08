# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static HTML/CSS/JS artist website for DAX J (techno DJ/producer). No build system, no framework, no npm. Deployed via GitHub Pages.

## Files

- `index.html` — Home page: two-column layout (BIT shows left, releases right) with magnetic zoom, player sidebar
- `shows.html` — Tour dates, 4-column terminal layout with scramble hover effect
- `releases.html` — MNNM BLK: album art infinite-scroll grid with 3D tilt hover, sidebar, audio player
- `releases-data.js` — Shared release data with track audio URLs (R2 CDN)

## Design System

All pages use IBM Plex Mono only (weights 300, 400, 500).

**Dark mode** (default): `#000` bg, `#fff` text, `#39ff14` green accent
**Light mode** (toggle): `#B5B0A7` warm brown bg, `#1a1916` text, `#39ff14` accent

Theme toggle on all pages (top-right nav). Preference stored in `localStorage` key `dax-theme`.

## Shows Data

Show data lives as a JS object in `shows.html` — `const shows = { "2026": [...], "2025": [...], ... }` going back to 2015. Each entry is a plain string: `"DD/MM City, Venue"` (e.g. `"15/02 Berlin, Berghain"`).

The source text file is at `"images from me to you/dax shows.txt"`.

## Key Interactions

**shows.html scramble effect**: On `mouseenter`, characters resolve left-to-right from random glyphs to the real text (`scrambleIn`). On `mouseleave`, reverse right-to-left scramble (`scrambleOut`). Uses `requestAnimationFrame` with `el._raf` to cancel-and-restart cleanly.

**releases.html**: Pool of tiles positioned via `translate3d`, wrapping horizontally and vertically for infinite scroll. Wheel events drive smooth pan with a lerp stiffness factor.

## Image Paths

Images with spaces in folder names must be URL-encoded in `src` attributes: `images%20from%20me%20to%20you/...`. There are two copies of most images — one at the root `images from me to you/` and a duplicate under `releases/images from me to you/`.
