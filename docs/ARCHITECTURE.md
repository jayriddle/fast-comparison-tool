# WarpDiff Architecture

Single-file (index.html, ~6400 lines) browser-based comparison tool for 2–3 images, videos, or audio files. No build step, no dependencies at runtime.

## Dual Purpose

WarpDiff serves two roles simultaneously:

1. **Standalone tool** — used daily by real users comparing visual and audio assets in production workflows. Stability and the keyboard-driven UX are non-negotiable.
2. **Comparison-feature testbed** — demonstrates comparison capabilities (overlay, split, magnifier, scopes, sync) that will integrate into a larger server-based review tool. New features are prototyped here first.

Both roles favor the single-file, zero-build design: easy to deploy, easy to share, easy to open from any environment.

---

## Current Workflow and Integration Gap

### How Users Get Media into WarpDiff Today

WarpDiff has no connection to the server-based review tool. Users follow a manual process:

1. Open the review tool in one browser tab, WarpDiff in another
2. Download the original asset from the review tool
3. Download edit A
4. Download edit B
5. Drag all three files onto WarpDiff (or press L and multi-select)

WarpDiff sorts dropped files by `lastModified` timestamp and assigns them to slots in order: original, edit A, edit B. This means the download order matters — if the user downloads in the right sequence, the timestamps create the correct slot assignment automatically.

### Where This Breaks

- **Browser download queuing** — if two downloads finish out of order (network jitter, different file sizes), timestamps are wrong and slots are swapped. The user may not notice until deep into a review.
- **Filename ambiguity** — downloaded files often have server-generated names (`asset_382a.mp4`, `render_v2_final.mp4`) with no inherent ordering. Users must remember which is which.
- **No metadata survives the download** — the review tool knows the asset's role (original vs. revision), the generation prompt, the reference images, who uploaded it, and the review context. None of this reaches WarpDiff. The user carries it in their head.
- **Reference images aren't transferred at all** — if the review involves 7 reference images that informed the generation, the user would need to download all 7 separately and there's no way to load them into WarpDiff alongside the outputs.
- **Round-trip friction** — every time the user switches to a different review item in the server tool, they repeat the entire download-and-drop process. There's no deep linking or session continuity.

### Why This Matters

The comparison capabilities in WarpDiff (overlay, split, magnifier, scopes, frame-accurate sync) are significantly more powerful than what the server-based review tool offers. But the manual transfer process means users only reach for WarpDiff when the comparison is important enough to justify the friction. Lightweight comparisons stay in the server tool's weaker viewer, and reference images are never seen alongside outputs during comparison.

### Integration Paths

There are three progressively deeper integration options, each building on the previous:

#### Path A: Deep Link with URL Parameters (Lowest Effort)

The review tool generates a URL that opens WarpDiff with assets pre-specified:

```
warpdiff.html?original=https://server/api/asset/382a&editA=https://server/api/asset/493b&editB=https://server/api/asset/501c
```

WarpDiff reads the URL parameters on load, fetches the assets, and assigns them to the correct slots by parameter name — no timestamp guessing. This requires:
- WarpDiff: ~50 lines to parse URL params and fetch assets
- Server: a "Compare in WarpDiff" button that constructs the URL
- CORS headers on the asset API endpoints

Eliminates the download-order problem and filename ambiguity entirely.

#### Path B: JSON Manifest (Medium Effort, Enables References + Prompts)

The review tool generates a manifest that includes outputs, references, prompt text, and metadata:

```json
{
  "outputs": [
    { "url": "https://server/api/asset/382a", "label": "Original", "uploadedBy": "artist1" },
    { "url": "https://server/api/asset/493b", "label": "Revision 2", "uploadedBy": "artist2" }
  ],
  "references": [
    { "url": "https://server/api/asset/ref1", "label": "Style reference" },
    { "url": "https://server/api/asset/ref2", "label": "Pose reference" },
    { "url": "https://server/api/asset/ref3", "label": "Lighting reference" }
  ],
  "prompt": "A cinematic wide shot of a forest clearing at golden hour, matching the style of ref1 with the composition of ref2",
  "reviewContext": {
    "projectName": "Forest Scene",
    "reviewRound": 3,
    "serverUrl": "https://server/reviews/847"
  }
}
```

Loaded via `?manifest=URL` or posted via `window.postMessage` from an iframe. This is the natural integration point for the reference strip and prompt panel (Improvement Plan items 2 and 3).

#### Path C: Embedded iframe with Bidirectional Communication (Deepest)

The server tool embeds WarpDiff in an iframe and communicates via `postMessage`:

```js
// Server tool sends assets to WarpDiff
warpFrame.contentWindow.postMessage({
  type: 'loadManifest',
  manifest: { outputs: [...], references: [...], prompt: '...' }
}, '*');

// WarpDiff sends review actions back
window.parent.postMessage({
  type: 'reviewAction',
  action: 'approve',
  notes: '...'
}, '*');
```

This enables the tightest integration: navigate between review items in the server tool and WarpDiff updates in place. Review decisions made in WarpDiff flow back to the server. But it requires the most work on both sides and introduces iframe security and sizing constraints.

### Recommended Sequence

Start with **Path A** (URL parameters) — it solves the most painful problem (slot misassignment) with minimal code on both sides. Then add **Path B** (manifest) when the reference strip and prompt panel are ready. **Path C** (iframe embedding) only if the server tool's architecture supports it and users need seamless navigation between review items.

All three paths coexist with drag-and-drop. Standalone use is never broken.

---

## State Model

### Core Media State

- `mediaData` — `{ original, editA, editB }` with `type`, `src`, `name`, `size`, `lastModified`, `w`, `h` per slot
- `assetOrder` — fixed array `['original', 'editA', 'editB']`
- `hasVideos`, `hasAudios` — flags for media-type-specific UI
- `expectedFileCount` — set before loading, used by `checkAllLoaded()` to gate view activation

### View & Layout

- `isSplitMode` — overlay (false) vs. split modes (true)
- `layoutMode` — `'horizontal'` or `'vertical'` for 2-asset layouts
- `tripartiteLayout3Col` — persisted preference for 3-asset grid (equal vs. L-shaped)
- `viewActivating`, `pendingViewActivation` — gates to defer activation until fps queue drains

### Zoom & Pan

**Overlay mode:**
- `zoomLevel`, `fitZoom`, `panOffsetX`, `panOffsetY`, `isPanning`
- Range: 0.05–32x

**Split modes:**
- `splitZoomLevel` — `null` = fit-to-panel, `1` = 100% native pixels
- `splitStepZoom` — multiplicative zoom for +/- keys

### Pixel Magnifier

- `magnifierEnabled`, `magnifierZoom` (2x–32x, persisted), `magnifierSize` (100–400px, persisted)
- `magnifierLinked` — Shift+Z linked loupes across split panels
- `_lastMouseEvent` — cached for refresh without new mouse movement

### Audio Visualization (for video audio tracks)

- `audioVizVisible` — W key toggle
- `audioContext`, `audioNodes` — Web Audio API context and per-slot source nodes
- `waveformData`, `spectrogramData` — precomputed per-slot visualization data
- `spectrogramLogScale`, `currentPaletteIndex` — persisted display preferences

### Video Scopes

- `videoScopesVisible` — V key toggle
- `_scopeOffscreen` — offscreen canvas for frame sampling

### Playback

- `currentAudioSource`, `audioMuteStates`, `isMuted` — audio routing
- `timecodeMode` — `'time'` or `'frames'`
- `videoFrameRates` — per-video FPS cache (measured via `requestVideoFrameCallback`)
- `currentAssetIndex` — active layer in overlay mode
- `globalAnimationId` — rAF handle for 60fps progress updates

### Preferences

Persisted to localStorage via `_prefs.load(key, fallback)` / `_prefs.save(key, value)`:
`magnifierSize`, `magnifierZoom`, `magnifierLinked`, `spectrogramLogScale`, `volume`, `tripartiteLayout3Col`

---

## Subsystems

### File Loading

| Function | Purpose |
|----------|---------|
| `handleMultipleFiles(files)` | Validates 2–3 files, rejects audio/non-audio mixes, sorts by timestamp, dispatches to `loadFile()` |
| `loadFile(slot, file)` | Unified loader for images, videos, audio. Creates DOM hierarchy, attaches handlers |
| `clearAllMedia()` | Full state reset — removes DOM elements, clears all variables |

### View Mode Switching

| Function | Purpose |
|----------|---------|
| `setViewMode(mode)` | Switches between `overlay`, `horizontal`, `vertical`, `tripartite`. Manages CSS class soup |
| `updateModeStrip(activeMode)` | Rebuilds header mode buttons with animation |
| `checkAllLoaded()` | Defers view activation until all files have valid dimensions and fps queue is idle |

Auto-layout picks the best mode based on aspect ratios:
- Audio: always vertical-stack
- 2 landscape images: vertical-stack
- 2 portrait images: horizontal (side-by-side)
- 3 assets: tripartite (L-shaped or equal, persisted preference)

### Zoom & Pan

**Overlay:** `applyZoom()` positions all wrappers with current zoom/pan. `zoomIn()`/`zoomOut()` step by sqrt(2). `clampPanOffsets()` constrains to 25% past viewport edges.

**Split:** `positionLabelsToMedia()` handles all split layouts including tripartite equal-area sizing with shared-dimension anchoring.

### Pixel Magnifier

Circular loupe that follows cursor, rendering magnified native pixels. `drawMagnifierCanvas()` renders with crosshair and zoom label. `findWrapperUnderCursor()` locates which media element to sample. Works in both overlay and split modes.

### Video Playback & Sync

All videos/audio sync via event listeners. `syncVideos(sourceVideo, action)` propagates play/pause/seek to all other media within 0.5s tolerance. Frame stepping uses `requestVideoFrameCallback` for accurate FPS detection and IEEE 754-safe frame boundaries.

Progress updates run at 60fps via rAF loop during playback.

### Audio Visualization

Two modes:
1. **Audio file mode** — waveform (top 40%) + spectrogram (bottom 60%) rendered to canvas per slot
2. **Video audio mode** — W key overlay showing waveform and spectrogram of video audio tracks

In-place radix-2 FFT implementation. Spectrogram supports log/linear scale and viridis/magma/inferno/plasma palettes.

### Video Scopes

V key toggles histogram, waveform monitor, and vectorscope. `sampleVideoFrame()` extracts pixel data via offscreen canvas. Scopes update during playback and on frame step.

---

## DOM Structure

```
.container
  header (.mode-core + .asset-group)
  .overlay-container
    .overlay-layer[original]
      .media-container
        .video-wrapper (img/video/canvas + .asset-info-bar + .split-zoom-indicator)
    .overlay-layer[editA] (same structure)
    .overlay-layer[editB] (same structure)
  .pixel-magnifier
  .spectrogram-panel
  .scopes-panel
  .video-controls (.video-controls-row + progress + timecode + volume + audio-source-selector)
```

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.split-mode` | Any split mode active |
| `.side-by-side` | 2-asset horizontal grid |
| `.vertical-stack` | 2-asset vertical grid (or audio) |
| `.tripartite` | L-shaped 3-asset layout |
| `.tripartite-columns` / `.tripartite-rows` | Equal 3-asset grid |
| `.active` | Visible layer / selected button |
| `.magnifier-active` | Body class when loupe is on |
| `.zoom-100` | Split mode at native pixel zoom |
| `.two-asset` / `.audio-mode` | Body classes for asset-count/type |

---

## Known Structural Limitations

### Hardcoded 3-Slot Model

`mediaData = { original, editA, editB }` and `assetOrder = ['original', 'editA', 'editB']` are fixed. Every function that iterates slots assumes at most 3. This is the primary blocker for scaling to more assets.

### Three Separate Layout Code Paths

`applyZoom()` (overlay), `positionLabelsToMedia()` (split), and tripartite equal-area math are independent implementations with duplicated dimension calculations.

### Global Mutable State

~30 global variables with manual DOM updates. No reactive bindings — changing state requires finding and calling all dependent update functions. State/UI desync bugs are possible when update calls are missed.

### Event Cascade Risk in Sync

`video.play` event triggers `syncVideos()` which calls `.play()` on others, which fires their `play` events. Ad-hoc guards prevent re-entrant loops, but the pattern is fragile across browsers.

### Main-Thread Rendering

FFT, histogram, waveform monitor, vectorscope, and spectrogram all render on the main thread. Noticeable at 4K resolutions during video playback.

---

## Improvement Plan

Ordered by priority. Improvements 1–4 can be done within the single file. The single-file design is intentional and should be preserved — it makes WarpDiff easy to deploy, share, and demo.

### 1. Dynamic Slot Model

**What:** Replace `{ original, editA, editB }` with an array of typed asset entries. Each entry has a `role` (`output`, `reference`, `prompt`), a slot index, media type, source, and metadata.

**Why:** Prerequisite for displaying reference images and prompts alongside outputs. The current fixed model cannot represent 10+ assets.

**Scope:** Every function that iterates `assetOrder` or indexes into `mediaData` by name needs to use the array. A thin adapter layer can preserve backward compatibility during transition.

**Risk:** Touches most subsystems. Must be tested thoroughly against existing 2- and 3-asset workflows to avoid regressions.

### 2. Two-Zone Layout: Primary Viewport + Reference Strip + Prompt Panel

**What:** The main comparison viewport keeps existing overlay/split/tripartite modes for output assets (max 3). Below it, a collapsible reference strip shows thumbnail images in a scrollable row. Below that, a collapsible prompt panel displays the generation prompt text.

**Why:** 10+ assets can't be shown as equal peers. The comparison engine is designed for deep inspection of 2–3 items; references are consulted, not compared pixel-by-pixel.

**Interactions:**
- Click reference thumbnail to open full-resolution lightbox (reuse magnifier code)
- Drag reference into primary viewport to temporarily swap it in for direct comparison
- Shift+click to pin a reference alongside outputs in split view
- `I` key toggles reference strip, `P` key toggles prompt panel

**Why not N-panel grid:** Showing 10 panels equally makes each one too small for meaningful comparison. The hub-and-spoke model (primary outputs under scrutiny, references on demand) matches actual review workflows.

### 3. Manifest Loading and URL Parameters

**What:** Accept assets via URL parameters (Path A) and JSON manifests (Path B) as described in the Integration Paths section above.

**Why:** Eliminates the fragile download-and-timestamp workflow that currently causes slot misassignment. Also the prerequisite for loading reference images and prompt text from the server tool.

**Implementation sequence:**
1. URL parameter parsing (`?original=URL&editA=URL&editB=URL`) — solves slot assignment immediately
2. Manifest loading (`?manifest=URL`) — adds references, prompt text, and metadata
3. `postMessage` API — enables iframe embedding if needed later

**Coexists with drag-and-drop:** File loading still works for standalone use. URL/manifest loading adds parallel entry points. If both are present, URL parameters take precedence over drag-and-drop but the user can still drop files to replace assets.

### 4. Sync Coordinator

**What:** Formalize the sync lock pattern:

```js
function syncAction(sourceSlot, action) {
  if (syncLock) return;
  syncLock = true;
  try {
    for (const slot of otherSlots(sourceSlot)) action(slot);
  } finally {
    syncLock = false;
  }
}
```

**Why:** Prevents event cascade bugs where synced play/pause/seek triggers re-entrant sync calls. Currently handled by ad-hoc guards. Low effort, high reliability.

### 5. Reactive State Store (if complexity warrants)

**What:** Centralize globals into a store with `on(key, callback)` subscriptions. State changes automatically trigger dependent UI updates.

**Why:** With N assets and multiple UI zones (primary viewport, reference strip, prompt panel, controls), manual DOM update calls become easy to miss.

**Tradeoff:** Adds ~50 lines of infrastructure. Risk of over-notifying if subscriptions aren't granular. Worth doing if the codebase grows past ~8K lines; skip if the reference strip and prompt panel stay simple.

### 6. Lazy/Virtualized Reference Loading

**What:** Don't decode all reference images at load time. Show thumbnails first, load full resolution on demand (lightbox open, drag to viewport).

**Why:** 7+ full-resolution images loaded simultaneously will spike memory, especially for high-res photo references.

**Implementation:** `IntersectionObserver` on thumbnail strip, or explicit load-on-click. Thumbnails can be generated from the first frame (video) or downscaled (image) client-side.

---

## What to Preserve

These properties are deliberate strengths, not limitations:

- **Single file** — zero build step, works from `file://`, easy to share and deploy
- **No runtime dependencies** — no React, no framework, no CDN imports
- **Keyboard-first UX** — every feature has a hotkey; mouse is optional after file load
- **60fps progress updates** — rAF loop, cached DOM refs, no selector thrashing during playback
- **Instant startup** — no bundle, no hydration, DOMContentLoaded and go

Any refactoring must preserve these. If a change makes WarpDiff slower to load, harder to share, or less responsive during playback, it's not worth it.

---

## Function Reference

| Subsystem | Key Functions |
|-----------|---------------|
| File Loading | `handleMultipleFiles`, `loadFile`, `clearAllMedia` |
| View Modes | `setViewMode`, `updateModeStrip`, `checkAllLoaded` |
| Asset Selection | `switchToAsset`, `selectAudioSource`, `toggleAudioMute` |
| Zoom/Pan (Overlay) | `applyZoom`, `zoomIn`, `zoomOut`, `resetFitZoom`, `handlePanStart/Move/End`, `clampPanOffsets` |
| Zoom (Split) | `positionLabelsToMedia`, `updateSplitViewZoomIndicators` |
| Magnifier | `toggleMagnifier`, `updateMagnifier`, `drawMagnifierCanvas`, `resizeMagnifier`, `findWrapperUnderCursor` |
| Video Playback | `syncVideos`, `togglePlayPause`, `playAllMedia`, `pauseAllMedia`, `restartAllVideos`, `setupVideoHandlers`, `stepFrame` |
| Audio (File) | `decodeAndComputeAudioSlotViz`, `computeWaveformData`, `computeSpectrogramData`, `drawAudioSlotCanvas` |
| Audio Viz (Video) | `toggleAudioViz`, `drawWaveform`, `drawSpectrogram`, `fft` |
| Video Scopes | `toggleVideoScopes`, `updateVideoScopes`, `sampleVideoFrame`, `drawHistogram`, `drawWaveformMonitor`, `drawVectorscope` |
| Progress & Sync | `updateVideoProgress`, `syncMedia`, `startProgressUpdateLoop` |
| FPS Detection | `measureVideoFramerate` |
| Keyboard | Main `keydown` handler (~20 key cases) |
| UI | `updateResolutionDisplay`, `updateAssetInfoBar`, `showLoadToast`, `showToast` |

## Keyboard Map

| Key | Action | Context |
|-----|--------|---------|
| L | File picker | Always |
| ? / | Quick start popup | Always |
| K | Shortcuts panel | Always |
| O | Toggle overlay/split | Active |
| G | Grid mode toggle | Active |
| Arrow L/R | Switch asset | Overlay |
| Space | Play/pause | Active |
| R | Restart | Active |
| , / . | Frame step back/forward | Active |
| F | Fullscreen | Active |
| + / - | Zoom in/out | Active |
| 0 | Fit to viewport | Active |
| 1 | 100% pixels | Active |
| 3 | Toggle tripartite layout | 3-asset |
| Z | Toggle magnifier | Active |
| Shift+Z | Linked magnifier | Split |
| [ / ] | Resize magnifier | Magnifier on |
| W | Audio waveform/spectrogram | Active |
| Shift+W | Log/linear frequency | Audio viz on |
| Shift+C | Cycle spectrogram palette | Audio viz on |
| V | Video scopes | Active |
| M | Mute/unmute | Active |
