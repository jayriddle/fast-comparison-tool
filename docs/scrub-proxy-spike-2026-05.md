# Scrub proxy spike — postmortem (2026-05)

Branch `feat/scrub-proxy` (deleted after this writeup). Goal was Safari-style scrub feel on Chrome for sparse-keyframe video by transcoding a 1-second-GOP "proxy" via the already-bundled ffmpeg.wasm and rendering it during drags. The encode worked, the GOP was correct, the architecture was sound — but Chrome's `<video>` element wouldn't paint frames on the proxy when scrubbed, no matter what we did. Killing the branch and recommending WebCodecs if this is revisited.

## What worked

- **Feature gate via `HTMLMediaElement.prototype.fastSeek`** — reliable cross-browser detection. Safari and Firefox stayed out of the proxy path entirely.
- **ffmpeg.wasm transcode flags** — `-c:v libx264 -preset ultrafast -tune fastdecode -g 24 -keyint_min 24 -sc_threshold 0 -crf 23` produced verifiable 1-second GOPs. The Playwright test that ran ffprobe on the output bytes confirmed `avg gap < 1.5s` on every run.
- **Reading proxy source from `mediaData[slot].src` (blob URL) via `fetch().arrayBuffer()`** — works around the fact that `audioFileBuffers[slot]` is deleted after audio decode finishes (`decodeAndComputeAudioSlotViz`, ~line 7258). Tests passed coincidentally because they raced the decode; real-world Shift+T always lost.
- **`display: none` on the original during drag** (not `visibility: hidden`) — required on macOS Chrome because the existing CSS comment is right: "display:none is the only reliable way to remove a hardware overlay from the compositor's layer list." Visibility-hidden left both the original and the proxy in the compositor, producing the dark-double-video artifact.

## What didn't work — the core failure

The proxy `<video>` element wouldn't paint a new frame when scrubbed, even though:

- The seek IS happening (audio reflected the new position; `proxy.currentTime` returned the dragged value)
- The proxy was correctly sized and positioned (verified via `getBoundingClientRect` and computed styles)
- The proxy had a real audio track (`anullsrc` lavfi source — silent stereo AAC at 8kbps), defeating Chrome's no-audio decode optimization
- The proxy was unmuted via the existing scrub-time unmute loop
- `_frameKick` (the existing `play().then(pause)` trick at ~line 8597 that exists *exactly* to defeat Chrome's "skip decode for muted+paused video" optimization) fired on each seek
- The proxy was pre-warmed with a `play().then(pause)` cycle at creation time

Audio updated during scrub. Video did not. Repeatedly.

## Things tried (in order)

1. `-an` (no audio track) — Chrome's no-audio-track optimization defeated decode entirely
2. Skip the proxy from the unmute loop so `_frameKick` would fire on it (gates on `muted=true`) — no effect
3. Add silent AAC track via `anullsrc` so proxy looks like a normal video to Chrome — no effect
4. Pre-warm proxy with `play()`/`pause()` cycle on `loadedmetadata` to prime the pipeline — no effect

After the cumulative ~4 hours of debugging, the pattern is clear: Chrome's `<video>` element compositor and frame-decoder optimizations are tuned for playback, not for arbitrary-position display of paused video that hasn't been the focus of recent playback. The original `<video>` works because it's the element the user has actually been interacting with. A second `<video>` element constructed and seeked from a blob URL is fundamentally a second-class citizen.

## What to try if revisiting

**WebCodecs.** Bypass the `<video>` element entirely for scrubbing:

- Demux the proxy mp4 with [mp4box.js](https://github.com/gpac/mp4box.js/) to get sample-table + keyframe positions
- `VideoDecoder.decode()` arbitrary samples, get back `VideoFrame` objects
- Draw to an `OffscreenCanvas` overlaid on the slot's wrapper during scrub
- Cache decoded frames for the GOP around the current position so back-and-forth scrubbing is instant
- On mouseup, sync the original `<video>.currentTime` and swap the canvas back out

Browser support in 2026 is wide enough that this is no longer Chrome-only (Safari 16.4+, Firefox 130+). The cost is real — ~weeks of work, your own audio sync, manual `VideoFrame.close()` discipline to avoid GPU memory leaks — but it's the only path that actually solves the problem instead of fighting Chrome's `<video>` pipeline.

A simpler interim option, if you don't want to invest in WebCodecs: encourage source files with denser keyframes. Adding `-g 24 -keyint_min 24 -sc_threshold 0` to the encoder that produces the files in the first place gives you smooth Chrome scrub without any client-side machinery. Cost: ~5–15% file-size increase. This is the cheapest path if you control the encoder.

## Specific code references that were useful

- `_frameKick` at `index.html:~8597` — the existing Chrome decode-trigger trick
- `_applyTranscodedFile` at `index.html:~5075` — the model for slot-replacement, including the Opus-sync-state cleanup gotcha
- `audioFileBuffers[slot]` deletion at `index.html:~7258` — the gotcha that broke our first source-byte read
- `body:not(.grid-mode) .asset-layer:not(.active) .video-wrapper { display: none }` at CSS `~line 709` — the macOS hardware compositor explanation that justified our display-none over visibility-hidden choice

## Scope-creep findings noted in passing (not fixed)

- `_transcodeSlotRun` at line 5347 has the same `showToast(message, true)` bug we hit and fixed in our code — error toast flashes for 1ms because `true` coerces to a 1ms duration, not an error flag. Pre-existing.
- 4 of the 5 "Loop in/out points" tests fail on master because the gitignored MP4 fixtures aren't checked in — `loadMedia` errors out with `ENOENT` before any `seekVideos` call runs. (My earlier read that this was a `seeked`-event timing issue was wrong.) `tests/fixtures/generate.sh` produces them, and a Playwright `globalSetup` can run that automatically.
