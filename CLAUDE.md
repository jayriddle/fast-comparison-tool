# WarpDiff

A/B comparison tool for images, video, and audio. Hosted on GitHub Pages.

- **Repo**: https://github.com/jayriddle/warpdiff
- **Architecture**: Single-file app — `index.html` is ~12,700 lines and contains all HTML, CSS, and JS. A few small modules live alongside in `js/` (see below).
- **PWA**: `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png` — installable, offline-capable.
- **No build step**: vanilla HTML/CSS/JS only, served as static files.

### Files

- `index.html` — the app. One `<style>` block at the top, one `<script>` block at the bottom.
- `js/audio-viz.js` — waveform/spectrogram FFT, K-weighting biquads, EBU R128 LUFS/LRA/True-Peak computation, palette tables. Exports functions consumed by the script in `index.html`.
- `js/scopes.js` — video scope rendering (waveform monitor, histogram, vectorscope). Uses `Uint16Array` hit-count buffers + `putImageData`; buffers cached across frames, reallocated on resize.
- `js/hotkeys.js` — registry-based hotkey table + key→action lookup, with localStorage override for custom bindings.
- `js/starfield.js` — landing-page background animation.
- `ffmpeg/` — ffmpeg.wasm bundle (`ffmpeg-core.{js,wasm,worker.js}` + `ffmpeg.min.js`, ~24 MB). Loaded lazily, single-threaded (no `crossOriginIsolated` / `SharedArrayBuffer`).
- `tests/` — Playwright suite. `tests/global-setup.ts` auto-generates the gitignored MP4/WAV/MP3 fixtures via `tests/fixtures/generate.sh` on first run (requires `ffmpeg` on PATH).

## Key Technical Patterns

### Frame & timecode
- Frame stepping uses midpoint seeking `(frame+0.5)/fps` to avoid IEEE 754 boundary issues.
- Timecode display uses `Math.floor(time * fps + 0.01)` epsilon to match frame numbers.
- `_frameStepping` flag pattern suppresses play/pause sync handlers during programmatic seeks.
- Passive fps detection (`_setupFpsDetection`) records frame timestamps via `requestVideoFrameCallback` during first playback, snaps to standard rates (23.976 / 24 / 25 / 29.97 / 30 / 48 / 59.94 / 60). No active probing at load time.

### Layout
- Stack mode `applyZoom()` supports two zoom reference modes toggled by `\` (`_stackZoomMode`):
  - **Fit** (default) — `_perAssetFits[slot] = min(viewW/nw, viewH/nh)`; `fitZoom` = smallest per-asset fit; each asset fills the viewport independently.
  - **Match** — `fitZoom = _perAssetFits['original']`; all assets rendered at the GT slot's fit scale so spatial scale is consistent across assets. Only available when the GT slot is loaded; `_toggleStackZoomMode()` no-ops with a toast otherwise. Pill indicator in header shows `Fit` (gray) or `Match · GT` (orange).
- Equal-area layout for mixed orientations (Grid inline mode): `A = min((availW/Σ√ri)², availH²·min(ri))`.
- Grid layout auto-picks horizontal vs vertical via `pickBestGridLayout(n)` — computes rendered area for each option given viewport dimensions and asset aspect ratios; re-evaluated on resize.
- Three-phase layout: measure → compute geometry → DOM write. Debounced functions use the pattern `functionNameDebounced` wrapping `functionName`.

### Loop in/out enforcement (RVFC chain)
Sub-region looping is enforced *frame-accurately* via `requestVideoFrameCallback`, not rAF.

- `_startLoopRvfc(video)` registers an `onFrame` callback that checks `metadata.mediaTime` against `_loopInPoint` / `_loopOutPoint` and seeks back when out of range. The callback always re-registers itself at the end (single chain, no duplicate callbacks).
- **Critical**: never register both `requestVideoFrameCallback` *and* an `'ended'`/`'playing'` event listener as fallbacks at the same site — they create parallel chains on stall and dead chains on non-stall. RVFC's contract is "fire when next frame is presented," which covers both the post-seek and post-stall cases on its own.
- The `'play'` event handler in `setupVideoHandlers` must start the RVFC chain **before** the `_bulkSyncActive` early-return; `playAllMedia` flips that flag for 50 ms and the chain would otherwise never start.
- `playAllMedia` sets `m.loop = !customLoopActive` (not unconditionally `true`) — preserves `setNativeLoop(false)` when in/out points are active. Otherwise native loop fights the RVFC seek-back.
- `setLoopPoint` clamps `media.currentTime` to `_getEffectiveDuration(media)` before storing, so loop markers don't overflow the timeline for files where `video.duration` is inflated past actual content (e.g. Opus / DTS with audio-extension metadata).
- A `'ended'` handler wraps to in-point when custom loops are active — the RVFC out-point check fires on `mediaTime >= _loopOutPoint`, but the last frame's `mediaTime` is typically one frame *short* of duration, so an out-point at the end never trips the check and the video ends instead. The handler restarts playback at in-point.

### Audio decode pipeline (three-tier)
1. **`decodeAudioData()`** — native browser decode. Race against a timeout: 1 s if WebCodecs is available (fast fallback), 30 s otherwise.
2. **WebCodecs `AudioDecoder`** — for codecs `decodeAudioData` doesn't handle (notably Opus in Safari, and Opus in Chrome where decode is "successful" but timing is wrong). Demuxer (`_demuxMP4Audio` / `_demuxWebMAudio`) extracts packets manually.
3. **ffmpeg.wasm transcode** — last resort for unsupported codecs (AC-3 / EAC-3 / DTS family / TrueHD).

The fallback routing is **`_onAllDecodeFailed(slot, audioConfirmed)`**:
- If `audioConfirmed=true` (WebCodecs already extracted packets but couldn't decode them — e.g. DTS-HD MA muxed with `mp4a` fourcc, malformed AAC, HE-AAC marked as LC), always attempt transcode.
- If `audioConfirmed=false` and the byte scanner didn't find a known unsupported-codec signature (`ac-3` / `ec-3` / `dtsc` / `dtse` / `dtsh` / `dtsl` / `mlpa`) inside MP4 box atoms, *and* the file is a video, treat as "no audio track" and skip transcode. (Without this distinction, files with confirmed-but-undecodable audio get silently dropped.)
- Otherwise call `_registerFfmpegCommand` which queues the slot for transcode and pops the ffmpeg panel.

### MP4 audio demuxer (`_demuxMP4Audio`)
- Walks `moov → trak → mdia → mdhd / hdlr / minf / stbl → stsd / stsz / stco / co64 / stsc / stts` and `trak → edts → elst`.
- **Per-track scoping is mandatory** for `mdhd.timescale`. Store in `_lastMdhdTimescale` during `parseMdhd` and only promote to the demuxer-wide `timescale` inside `parseHdlr` when `handler_type === 'soun'`. A previous version used a single global `timescale` that got overwritten by every track visited — so a data/subtitle track at timescale=1000 silently clobbered the audio track's 48000, making elst priming offsets (16512 / 48000 = 344 ms) look like 16.5-second skips. Same scoping for `_lastElstMediaTime` and `_lastElstSegDuration` (these reset at each `parseTkhd`).
- Returned `extracted` shape: `{ chunks: [{timestamp, data}], sampleRate, channels, codec, description, preSkip, maxSamples }`. `preSkip` and `maxSamples` are applied post-decode to trim encoder priming and edit-list-truncated tails.

### ffmpeg.wasm transcode
- Loaded once (~24 MB), single-threaded (the bundled build is built with `--disable-pthreads`). Each `ff.run()` invocation exits the wasm instance, so `_ffmpegLoaded` and `_ffmpegInstance` are reset after every run and the next slot in `_ffmpegQueue` triggers a fresh load.
- `_ffmpegQueue` is sorted by `assetOrder` on each push so Ref → A → B order is preserved regardless of which decode fails first.
- Standard transcode command (use as a template for unsupported-codec → AAC):
  ```
  ffmpeg -ignore_editlist 0 -fflags +bitexact -i input.mp4 \
         -map 0:v:0 -map 0:a:0 \
         -c:v copy \
         -c:a aac -ac 2 -ar 48000 -b:a 192k \
         -shortest -movflags +faststart \
         output_aac.mp4
  ```
  Critical flags:
  - **`-ignore_editlist 0`** — *apply* the input edit list. DTS-HD MA and similar codecs carry an elst that trims ~344 ms of encoder priming silence; ignoring it (`-ignore_editlist 1`) leaves the priming in the decoded PCM and the output AAC plays late by that amount.
  - **`-ac 2`** — explicit stereo downmix. AAC 5.1 playback in browsers is spotty; stereo is rock-solid.
  - **`-shortest`** — caps output duration to the shortest stream (= video). Otherwise audio overhang produces A/V duration mismatch in the muxed output.
  - **`-movflags +faststart`** — moov atom at the front for streaming.
- `ff.setLogger` captures all output (`fferr`, `ffout`, `info`) regardless of type; on completion the captured stderr is dumped to console as `[ffmpeg] <slot> stderr: …`. Diagnostic surface for transcode-related questions.

### Opus / Chrome Web Audio sync replacement
Chrome's `<video>` element produces incorrect A/V timing for Opus audio tracks. For affected slots we mute `<video>` audio and play the decoded `AudioBuffer` via Web Audio.

- `_opusSyncSlots[slot]` flags the slot as needing Web Audio replacement. `_opusSyncActive` is the global toggle.
- `_opusSyncDuration[slot]` stores the corrected duration from the decoded buffer (raw `video.duration` reflects container metadata that often extends past actual audio end). `_getEffectiveDuration()` returns this for Opus slots, raw `video.duration` otherwise. Used by timeline, loop markers, and info-bar / Stack-strip duration display.
- `_startOpusSyncAudio(slot, fromTime)`: creates an `AudioBufferSourceNode` at the slot's video's `playbackRate`, plays from `fromTime`, fades in over `_OPUS_FADE` (15 ms). Records start `ctx.currentTime`, start video time, and the rate per slot.
- `_syncOpusAudioToVideo()`: drift-corrects each slot. `expectedVideoTime = startVideo + (ctx.currentTime - startCtx) * rate`. Restarts the source if drift > 150 ms OR if `video.playbackRate` changed (the AudioBufferSourceNode's rate can't change mid-stream without an audible glitch).
- J/K speed handlers call `_updateOpusSyncRate(rate)` which re-anchors the timeline (`startVideo` updated to current expected position, `startCtx` to current `ctx.currentTime`) before assigning the new `source.playbackRate.value`.

### Scrub audio preview
- 80 ms snippet via Web Audio at scrub time, throttled at `_SCRUB_THROTTLE` ms.
- `source.playbackRate.value = PLAYBACK_RATES[playbackRateIndex]` so scrub preview matches the user's selected speed (not always 1×).
- Storage: full-quality `AudioBuffer` for Chrome Opus slots (needed for Opus sync replacement). Mono 22050 Hz downsample via `_downsampleForScrub()` for everything else — ~5–8× smaller than full stereo 48 kHz.

### Audio & video metrics
- EBU R128 / BS.1770-4 in `computeAudioMetrics(audioBuffer)` (`js/audio-viz.js`). K-weighting via two cascaded biquad IIR stages (high-shelf + RLB, coefficients computed analytically per fs via Audio EQ Cookbook). 400 ms gated blocks → integrated LUFS; 3 s short-term blocks → LRA; 4× Catmull-Rom cubic interpolation for true peak per channel.
- Info bar shows `LUFS · LRA · TP`. CSS `:empty { display: none }` auto-hides absent metrics.
- LUFS envelope (E key cycles modes): Waveform / Waveform+LUFS / LUFS only. Short-term LUFS drawn as stepped chart, reference lines at −14 (streaming) / −16 (podcast) / −23 (broadcast).

### Other
- Scope rendering uses `Uint16Array` hit counts + `putImageData`; hit buffers cached in `js/scopes.js`.
- Images loaded via `URL.createObjectURL` (not FileReader/base64) — no heap inflation.
- Loading overlay (`#loadingOverlay`) shows status during audio decode; hidden at `startFadeIn()`. `checkAllLoaded()` is called from both the audio `loadedmetadata` path AND the end of `decodeAndComputeAudioSlotViz` (defensive — `loadedmetadata` is sometimes delayed indefinitely on `blob:` URLs).
- Service worker (`sw.js`) early-returns for `blob:` URLs — Chrome cannot fetch blob URLs from within a service worker, and intercepting them blocks `<audio>` element loadedmetadata.
- Pixel magnifier for video uses a **CSS-positioned clone `<video>` element** (not `drawImage(video, canvas)`) because the macOS hardware compositor applies BT.709→P3 gamut mapping on the live element that `drawImage` doesn't replicate. Clipping uses `clip-path: circle(50%)` — `overflow:hidden` + `border-radius:50%` does NOT clip hardware-composited video on macOS.

## Naming Conventions

- UI shows two view modes: **Stack** and **Grid** (never "Overlay" or "3-UP").
- Grid sub-layouts (3 files): **Inline** (equal cols/rows) and **Offset** (L-shaped 1+2).
- Internal code still uses `tripartite`, `tripartiteLayout3Col`, etc. — only user-facing text was renamed.
- Slots are named `original`, `editA`, `editB` internally; UI shows "Ref"/"A"/"B" for video/image and "GT"/"A"/"B" for audio (`slotLabel(slot)` returns context-aware labels).

## Coding Conventions

- No build step, no dependencies — vanilla HTML/CSS/JS only.
- Prefer editing `index.html` over creating new files.
- CSS is in a single `<style>` block at the top; JS is in a single `<script>` block at the bottom.
- Use `_prefixed` names for module-level private state (e.g., `_frameStepping`, `_audioSlotVizData`).
- Debounced layout functions use the pattern `functionNameDebounced` wrapping `functionName`.
- **`APP_VERSION` in `index.html` and `CACHE_NAME` in `sw.js` must be kept in sync on every version bump.** The service worker uses `CACHE_NAME` to invalidate the cache for installed PWA users.
- Add a "What's New" entry inside `#changelogPopup` (search for `<h3>v3.x.y</h3>`) on each version bump. The popup auto-shows on version change.

## Testing

- Playwright. `npm test` or `npx playwright test` runs the suite from project root.
- `playwright.config.ts` declares `globalSetup: './tests/global-setup.ts'`, which auto-generates the gitignored MP4 / WAV / MP3 fixtures via `tests/fixtures/generate.sh` if `tests/fixtures/landscape_a.mp4` is missing. Requires `ffmpeg` on PATH; setup errors out with an install hint if it isn't.
- `tests/fixtures/*.{mp4,wav,mp3}` are gitignored (deterministic outputs of the generator script — don't commit them).
- Tests use the `__testAPI` global on `window` to inspect internal state (`zoomLevel`, `fitZoom`, `isGridMode`, `_loopInPoint`, etc.) — add to `__testAPI` when introducing testable state.
- Server: `./start.sh` runs `npx serve -l 8080 .` from project root; Playwright auto-detects and reuses it (`reuseExistingServer: true`).

## Additional Resources

- See `memory.md` for detailed memory management patterns, buffer caching strategies, audio downsampling, typed array usage, and GC avoidance techniques (critical for scopes, audio viz, and large media handling).
- `FEATURES.md`, `MANUAL.md`, and `README.md` provide user-facing documentation.
- `docs/scrub-proxy-spike-2026-05.md` — postmortem on a failed attempt to give Chrome Safari-style scrub feel via an ffmpeg.wasm-transcoded 1-second-GOP proxy. Read before reattempting; the recommendation is WebCodecs + `mp4box.js`, not another `<video>` element.
