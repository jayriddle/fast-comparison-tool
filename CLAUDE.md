# WarpDiff

A/B comparison tool for images, video, and audio. Hosted on GitHub Pages.

- **Repo**: https://github.com/jayriddle/warpdiff
- **Architecture**: Single-file app — everything lives in `index.html` (~7000 lines of HTML, CSS, and JS)
- **PWA**: `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png` — installable, offline-capable

## Key Technical Patterns

- Frame stepping uses midpoint seeking `(frame+0.5)/fps` to avoid IEEE 754 boundary issues
- Timecode display uses `Math.floor(time * fps + 0.01)` epsilon to match frame numbers
- `_frameStepping` flag pattern for suppressing play/pause sync handlers during programmatic seeks
- Equal-area layout for mixed orientations: `A = min((availW/Σ√ri)², availH²·min(ri))`
- Scope rendering uses Uint16Array hit counts + putImageData for performance
- Audio viz uses `decodeAudioData()` → waveform/spectrogram computation, drawn to canvas
- Loading overlay (`#loadingOverlay`) shows status during audio decode; hidden at `startFadeIn()`
- Grid layout auto-picks horizontal vs vertical via `pickBestGridLayout(n)` — computes rendered area for each option given viewport dimensions and asset aspect ratios; re-evaluated on resize
- Waveform rendering uses Path2D with gradient fill, anti-aliased stroke, and clipped dB zone bands

## Naming Conventions

- UI shows two view modes: **Stack** and **Grid** (never "Overlay" or "3-UP")
- Grid sub-layouts (3 files): **Inline** (equal cols/rows) and **Offset** (L-shaped 1+2)
- Internal code still uses `tripartite`, `tripartiteLayout3Col`, etc. — only user-facing text was renamed
- Slots are named `original`, `editA`, `editB` internally; UI shows "GT" (Ground Truth), "A", "B"

## Coding Conventions

- No build step, no dependencies — vanilla HTML/CSS/JS only
- Prefer editing `index.html` over creating new files
- CSS is in a single `<style>` block at the top; JS is in a single `<script>` block
- Use `_prefixed` names for module-level private state (e.g., `_frameStepping`, `_audioSlotVizData`)
- Debounced layout functions use the pattern `functionNameDebounced` wrapping `functionName`
- `APP_VERSION` in `index.html` and `CACHE_NAME` in `sw.js` must be kept in sync on version bumps
