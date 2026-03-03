# WarpDiff v3 — Demo Script

**Format:** Screen recording with voiceover
**Duration:** ~5 minutes
**Audience:** Creative professionals (designers, editors, VFX artists, audio engineers) and engineering leads evaluating whether to adopt or integrate WarpDiff into in-house tooling

---

## SCENE 1 — The Problem (0:00–0:30)

**Screen:** Show a file browser with three exported video files named `hero_v1.mp4`, `hero_v2.mp4`, `hero_v3.mp4`.

> **VO:** You've got three versions of the same shot. Maybe it's a color grade, a reframe, a VFX comp pass. Now you need to compare them — pixel-accurate, frame-synced, right now.
>
> Most people alt-tab between windows, or drag clips onto a Premiere timeline, or open three Finder previews. It's slow, it breaks your focus, and you can never quite line things up.
>
> WarpDiff fixes that. It runs in a browser. It loads in under a second. And it does exactly one thing well.

---

## SCENE 2 — Loading Files (0:30–1:00)

**Screen:** Open `jayriddle.github.io/warpdiff` in a browser. The Quick Start popup is visible.

> **VO:** This is WarpDiff. No accounts, no install, no backend — it's a single HTML page. When you come back after an update, a What's New popup shows exactly what changed.

**Action:** Dismiss the popup, then drag and drop three image files onto the window. Files load and Grid mode appears.

> **VO:** Drag your files in — or press L to use the file picker. WarpDiff auto-sorts them by last-modified timestamp, oldest to newest, and assigns them to Original, Edit A, and Edit B. If the timestamps are too close together, you get a warning so you can double-check the order.
>
> It accepts images, videos, and audio files. Two or three at a time.

---

## SCENE 3 — Grid Mode (1:00–1:30)

**Screen:** Grid layout is visible with three images. The active asset has a cyan border and highlighted info bar.

> **VO:** With three files loaded, you start in Grid mode. The app auto-picks the best layout based on your assets' aspect ratios — columns for landscape, rows for portrait.

**Action:** Press **3** to toggle between Inline and Offset layouts.

> **VO:** Press 3 to toggle layouts. Offset puts the original on the left with edits stacked on the right — more space-efficient, so each asset appears larger. Every panel shows its resolution, aspect ratio, and duration. Non-standard aspect ratios flag amber as a heads-up.

**Action:** Briefly click different assets to show the cyan active-asset border moving.

> **VO:** The active asset gets a cyan highlight — that's the one whose audio you hear and whose scopes you see.

---

## SCENE 4 — Overlay Mode (1:30–2:00)

**Action:** Press **O** to switch to Overlay. The view collapses to a single full-size image.

> **VO:** Press O for Overlay. One version at a time, full-size. Arrow keys flip between them.

**Action:** Press left/right arrow keys. Each version snaps into view instantly.

> **VO:** This is the fastest way to spot differences. Your visual cortex does the diff — anything that changes between frames jumps out.

**Action:** Press **+** to zoom in. Click and drag to pan.

> **VO:** Zoom in with plus, out with minus. Zero to fit, one for actual pixels. Click and drag to pan. Zoom and pan hold their position as you flip between assets — you're always looking at the same region.

---

## SCENE 5 — Zoom Loupe (2:00–2:30)

**Action:** Press **Z**. A circular magnification loupe appears under the cursor.

> **VO:** Press Z for the zoom loupe. It gives you pixel-level magnification without changing the overall view — like a jeweler's loupe.

**Action:** Move the cursor over a detail area. Press **+** / **-** to change magnification. Press **[** / **]** to resize.

> **VO:** Plus and minus adjust magnification from 2x up to 32x. Brackets resize the loupe. It follows your cursor and updates live during video playback.

**Action:** Switch to Grid mode. Press **Shift+Z** to enable linked zoom. Hover over one asset — loupes appear on all assets.

> **VO:** Now the real trick. Shift-Z turns on linked zoom. Hover over one asset and every other asset shows a loupe at the exact same spot. You're comparing the same pixel across all three versions simultaneously.

---

## SCENE 6 — Video Sync (2:30–3:15)

**Action:** Click Reset, then load three short video files.

> **VO:** Now videos. Load three clips.

**Action:** Press Space to play. The progress bar and timecode appear.

> **VO:** Hit space. All three play in perfect sync — same timecode, same frame. Seek anywhere on the progress bar and every video jumps together.

**Action:** Use comma and period keys to step frame-by-frame.

> **VO:** Comma and period step one frame at a time. WarpDiff auto-detects the frame rate and snaps to the nearest standard — 23.976, 24, 30, 60, whatever the source is.

**Action:** Click the O / A / B audio source buttons.

> **VO:** Only one audio track plays at a time. Click O, A, or B to switch. Each has its own mute toggle.

---

## SCENE 7 — Video Scopes (3:15–3:45)

**Action:** Press **V**. The scopes panel appears above the video controls showing three scopes side by side.

> **VO:** Press V for video scopes. You get an RGB histogram, a waveform monitor, and a vectorscope — the same tools you'd find in DaVinci Resolve or Premiere, right here in the browser.

**Action:** Step through frames with comma/period. Show the scopes updating in real time.

> **VO:** They update live during playback and on every frame step. In overlay mode they follow the active asset. In grid mode, switch the active source and the scopes follow.

**Action:** Press **W**. The audio waveform and spectrogram panel appears below the video controls.

> **VO:** Press W for the audio waveform and spectrogram. The waveform uses dB color coding — green is normal, yellow is caution, red is clipping. The spectrogram shows frequency content over time. Shift-W toggles between linear and log scale. Shift-C cycles color palettes.

---

## SCENE 8 — Audio File Comparison (3:45–4:15)

**Action:** Click Reset. Load three audio files (e.g., different masters of the same track — MP3, WAV, FLAC).

> **VO:** WarpDiff also handles pure audio. Load two or three audio files — MP3, WAV, FLAC, whatever — and you get side-by-side waveforms and spectrograms.

**Action:** Show the Grid view with waveform on top and spectrogram on the bottom for each audio file. Point out the info bars.

> **VO:** Each slot shows its waveform and spectrogram. The info bar displays sample rate, channels, bit depth or codec, and file size. You can see at a glance whether a lossy encode lost high-frequency detail compared to the lossless original.

**Action:** Press Space to play. Switch audio sources with O / A / B.

> **VO:** Same synced playback as video — space to play, progress bar to seek, O-A-B to switch which track you hear.

---

## SCENE 9 — For Engineering Leads (4:15–4:45)

**Screen:** Show the GitHub repo briefly, then View Source to show it's a single HTML file.

> **VO:** For engineering teams evaluating this: WarpDiff is a single HTML file. No framework, no build step, no backend, zero runtime dependencies. Vanilla JavaScript, HTML5 media APIs, Web Audio API, Canvas, CSS grid.
>
> That's deliberate. Every feature — synchronized playback, video scopes, zoom loupe with linked magnification, the equal-area layout algorithm — is implemented against web standards. Nothing proprietary to extract.
>
> You can embed the whole thing in an iframe, fork the repo, or cherry-pick individual systems. The video sync engine, the scope renderers, the loupe, the audio analysis pipeline — each is cleanly scoped and easy to read. If you need synced video playback or real-time scopes in your internal review tool, that code is right there.

---

## SCENE 10 — Close (4:45–5:00)

**Screen:** Show the WarpDiff URL. Press **K** to show the keyboard shortcuts panel.

> **VO:** WarpDiff. Images, video, and audio — two or three files, one browser tab, zero friction.
>
> It's live now — open source, free, no setup. Try it at jayriddle.github.io/warpdiff.

---

## Production Notes

**Assets to prepare before recording:**
- 3 image files with visible but subtle differences (e.g., color grade variants of the same photo, slightly different crops)
- 3 short video clips (~10–15s each) with visible differences (e.g., VFX comp passes, color grade variants, different titles/overlays) — ideally with audio
- 3 audio files of the same track in different formats or masters (e.g., WAV original, MP3 320kbps, MP3 128kbps — or different mixes)
- Ensure file timestamps are staggered by at least 5 seconds so auto-sort works cleanly

**Recording setup:**
- 1920x1080 browser window, no bookmarks bar, minimal chrome
- Clean desktop, dark browser theme preferred (matches WarpDiff's dark UI)
- Record at native resolution — avoid scaling artifacts since the tool is about pixel accuracy
- Capture system audio for video and audio playback scenes

**Keyboard shortcut cheat sheet for the presenter:**

| Key | Action |
|-----|--------|
| L | Load files |
| O | Overlay mode |
| G | Grid mode |
| 3 | Toggle grid layout (Inline / Offset) |
| Arrow keys | Switch asset (Overlay) |
| + / - | Zoom in / out (or loupe magnification) |
| [ / ] | Resize loupe |
| 0 | Fit to window |
| 1 | 100% native pixels |
| Z | Toggle zoom loupe |
| Shift+Z | Toggle linked zoom |
| V | Toggle video scopes |
| W | Toggle waveform / spectrogram |
| Shift+W | Toggle linear / log frequency |
| Shift+C | Cycle spectrogram color palette |
| Space | Play / Pause |
| , / . | Frame step back / forward |
| R | Restart playback |
| M | Mute / Unmute |
| ? | Help (Quick Start popup) |
| K | Show shortcuts panel |
| F | Fullscreen |
