# WarpDiff Memory Management

## Architecture & Loading
- **Single-file app**: All ~7100 lines of HTML/CSS/JS in `index.html` — no bundling, minimal parse overhead.
- **Asset loading**: Use `URL.createObjectURL(file)` for images/videos (not `FileReader` or base64) to avoid heap inflation and unnecessary memory copies. Revoke URLs when assets are unloaded.
- **PWA/Service Worker**: `sw.js` uses network-first caching with `CACHE_NAME` synced to `APP_VERSION`. Offline-capable without excessive storage bloat.

## Audio Memory Optimizations
- **Scrub audio**: Downsampled to mono 22.05 kHz (`_downsampleForScrub()`) — ~5-8× smaller than full stereo 48 kHz. Full quality retained *only* for Opus sync slots in Chrome for accurate A/V playback.
- **AudioBuffer management**: `audioFileBuffers[slot]` deleted after decode. Decoded `AudioBuffer` lives in `_audioSlotVizData[slot].audioBuffer`; freed when `_audioSlotVizData = {}` in `clearAllMedia()`.
- **AudioContext lifecycle**: Lazy-created via `getAudioContext()`. Closed and nulled in `clearAllMedia()` — `audioContext.close().catch(() => {}); audioContext = null` — so browser fully reclaims audio resources between loads. Fresh context created on next `getAudioContext()` call.
- **Stale decode guard**: `_audioDecodeGen[slot]` counter incremented before each `decodeAudioData` call; captured in closure; checked before any state write in `.then()`. Prevents a slow decode completing after reload from writing `_audioSlotVizData` against a new batch. Reset to `{}` in `clearAllMedia()`.
- **BPM & viz**: Uses typed arrays (`Float32Array`) for FFT, waveform buckets, spectral flux. Spectrogram palettes precomputed once.

## Video Scopes & Visualization (`js/scopes.js`)
- **Cached buffers**: Critical for performance — `_wfmBuf`, `_wfmHits*` (Uint16Array), `_vsHit*` (Float32Array/Uint16Array) reused across *all* frames.
  - Reallocated *only* on canvas resize (`_wfmCachedW/H`, `_vsCachedSize`).
  - Comment: "Cached buffers for waveform monitor — reused across frames to avoid per-frame GC pressure."
- **Histogram**: `Uint32Array(256)` bins per channel; optional CDF with `Float32Array`.
- **Waveform monitor**: Hit counting + `putImageData()` for speed; supports luma, RGB parade, RGB overlay.
- **Vectorscope**: Hit accumulation in typed arrays, graticule/skin-tone overlays drawn on top.
- Offscreen canvas for frame sampling (`sampleVideoFrame()`).

## Layout & Rendering
- **Stack/Zoom modes**: `_perAssetFits[]`, `_stackZoomMode` — minimal state; `applyZoom()` computes fit/match scales without heavy objects.
- **Grid layout**: `pickBestGridLayout()` computes equal-area using square roots and mins — pure math, no persistent large structures.
- **Difference mode**: Computed on-the-fly per frame; no stored difference buffers.
- **Loupe**: Canvas-based, follows cursor, uses native pixels at current zoom.

## Magnifier Clone Video Elements
- Clone `<video>` elements are created inside each loupe (`_magState[id].clone`) so hardware compositor path is used — `drawImage(video, canvas)` produces incorrect colours on macOS P3 displays.
- Clones reference the same blob URL as the original; they are NOT added to `_blobUrls` (no duplicate revocation needed).
- `clearAllMedia()` iterates `_magState`, pauses each clone, clears its `src`, removes it from the DOM, then wipes `_magState` entries. Prevents clone elements and blob URL refs leaking across file loads.

## General Patterns
- **_prefixed private state**: All module globals prefixed (e.g. `_frameStepping`, `_audioSlotVizData`) for clarity.
- **Typed arrays everywhere**: Avoid JS numbers/objects for bulk data (bins, hits, audio samples, image data).
- **GC pressure avoidance**: Reuse objects, debounce layout/resize handlers, cache where resize is infrequent.
- **No build dependencies**: Zero npm packages in the app — keeps memory footprint tiny. `node_modules/` is dev-only (Playwright).

## Performance Notes
- Large 4K+ videos or multiple high-res assets can still push browser limits (VRAM, decode memory).
- Test with real media; scopes/viz update live during playback without dropping frames thanks to caching.
- Preferences/hotkeys in localStorage (tiny JSON).
- `APP_VERSION` bumps must sync with sw.js `CACHE_NAME`.

## Review of CLAUDE.md
- Matches all key technical patterns (midpoint seeking, epsilon timecode, stack zoom Fit/Match, equal-area grid, etc.).
- Naming conventions followed: Stack/Grid, GT/A/B slots, internal `tripartite*`.
- Coding style: vanilla JS, edit `index.html` preferentially, `_prefixed` vars, debounced functions.

This file serves as living memory for memory-sensitive implementations. Update when adding new features that allocate buffers, decode media, or render visuals.
