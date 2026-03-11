# WarpDiff User Manual

WarpDiff is a browser-based visual comparison tool for reviewing 1–3 versions of images, videos, or audio files in Stack or Grid mode. Installable as a PWA for offline use.

---

## Loading Files

**Three ways to load files:**
- Press **L**
- Click the **Load** button in the header
- Drag and drop files onto the window (or the landing drop zone)

**File requirements:**
- 1 to 3 files (images, videos, or audio files)
- 1 file → single asset review
- 2 files → assigned to **Edit A** and **Edit B**
- 3 files → assigned to **Original** (Ground Truth), **Edit A**, and **Edit B**
- Files are automatically sorted oldest → newest by last-modified timestamp

**Timestamp warning:** If two or more files have timestamps within 2 seconds of each other, a toast warns that the sort order may be unreliable — check that the right file landed in the right slot.

**Duplicate detection:** If two slots contain the same file (matched by name, size, and timestamp), a warning banner appears at the top of the screen.

**Reset:** Click the **Reset** button (visible after loading) to clear all files and start over.

---

## View Modes

### Stack
The default mode. One asset is visible at a time, layered on top of the others. Use the arrow keys or the asset buttons in the header to switch between assets.

### Grid (2 files)
Both assets displayed side-by-side with a gap between them. Assets are scaled so their shorter sides match — meaning a crop or zoom of another image will appear smaller, keeping the subject at the same physical size on screen.

The layout auto-picks horizontal (left/right) or vertical (top/bottom) based on viewport dimensions and aspect ratios, re-evaluated on resize.

### Grid (3 files)
All three assets displayed in a grid. Press **3** to toggle between Inline (columns or rows, auto-picked by aspect ratio) and Offset (original on the left, edits stacked on the right — more space-efficient so assets appear larger).

---

## Switching Modes

| Action | Result |
|--------|--------|
| Click **STACK** / **GRID** in header | Switch to that mode |
| Press **S** | Switch to Stack mode |
| Press **G** | Switch to Grid mode |

---

## Zoom & Pan

Zoom and pan are available in **Stack mode only**.

| Shortcut | Action |
|----------|--------|
| **+** | Zoom in |
| **−** | Zoom out |
| **0** | Zoom to fit |
| **1** | Zoom to 100% (actual pixels) |
| **Click and drag** | Pan (when zoomed in) |

Zoom range: 5% – 3200%. Each step multiplies/divides by √2 (~1.41×).

In **Grid mode**, pressing **1** toggles between fit-to-panel and 100% native pixels. Assets zoom to their actual pixel size, even if that means overflowing the panel.

A zoom indicator appears in the info bar showing the current scale as a percentage (e.g. `150%`).

---

## Zoom Loupe

Press **Z** to toggle a circular zoom loupe that follows your cursor, showing magnified native pixels without changing the overall zoom level. Works in all view modes.

| Shortcut | Action |
|----------|--------|
| **Z** | Toggle zoom loupe |
| **+** / **−** | Adjust magnification (2×–32×, when loupe is active) |
| **[** / **]** | Resize loupe (100–400px) |
| **Shift+Z** | Toggle linked zoom |

**Linked zoom:** In Grid modes, enabling linked zoom (**Shift+Z**) shows corresponding loupes on all other visible assets at the same relative position — hover over one asset to compare the exact same spot across all versions.

The loupe hides during panning and updates live during video playback and frame stepping. Loupe size and magnification level persist across sessions.

---

## Video Playback

Video controls appear at the bottom of the screen when videos are loaded. All videos play, pause, and seek in sync.

| Control | Description |
|---------|-------------|
| **Progress bar** | Click to seek; drag to scrub |
| **Timecode** (left) | Current position — displays SS:FF or M:SS:FF based on detected frame rate |
| **Duration** (right of bar) | Total length |
| **Speaker icon** | Mute/unmute the active audio source |
| **Volume slider** | Adjust volume |
| **GT / A / B buttons** | Select which asset's audio to hear |

**Keyboard shortcuts:**

| Shortcut | Action |
|----------|--------|
| **Space** | Play / Pause |
| **,** | Step back one frame |
| **.** | Step forward one frame |
| **R** | Restart from beginning |
| **J** | Slower (cycle: 0.25×, 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2×) |
| **K** | Faster (cycle in reverse) |
| **I** | Set loop in-point at current time |
| **O** | Set loop out-point at current time |
| **M** | Mute / Unmute |

**Audio source selector:** Only one audio track plays at a time. Click GT, A, or B to switch sources. Each button has its own mute icon for independent muting. If the active source is muted, audio automatically switches to the next unmuted source.

**Loop points:** Press **I** to set a loop in-point and **O** to set a loop out-point. You can also **Shift+drag** on the progress bar to select a loop region. Loop markers appear as orange triangles on the progress bar. Playback loops between these points. Clear by setting new points or reloading.

---

## Audio Visualization

Press **W** to toggle the waveform and spectrogram panel below the video controls.

**Waveform** uses dB color coding:
- **Green** — normal levels (below -6dB)
- **Yellow** — caution (-6dB to -1dB)
- **Red** — hot/clipping (above -1dB)

Mono tracks display a single waveform with a MONO indicator. Stereo tracks show L and R channels.

**Spectrogram** shows frequency content over time:
- **Shift+W** toggles between linear and log frequency scale
- **Shift+C** cycles through color palettes (Viridis, Magma, Inferno, Plasma)

Click and drag on the waveform or spectrogram to scrub playback. Shift+drag to set a loop region.

---

## Audio File Comparison

Load 2–3 audio files (MP3, WAV, FLAC, AAC, OGG, etc.) to compare them side-by-side in Grid mode. Each audio slot displays a waveform (top 40%) and spectrogram (bottom 60%) with frequency labels.

**Info bar** shows audio metadata: sample rate (e.g. `48 kHz`), channels (`Mono` / `Stereo`), bit depth (e.g. `24-bit` for lossless, or codec name like `MP3` for lossy), file size, duration, and BPM.

**BPM detection** runs automatically on load using spectral flux onset analysis with autocorrelation, weighted toward musically common tempos.

**Spectrogram controls** work in audio mode:
- **Shift+W** toggles linear / log frequency scale
- **Shift+C** cycles color palettes

Audio files use the same synced playback controls as video: Space to play/pause, progress bar to seek, GT/A/B buttons to select which track to hear.

---

## Video Scopes

Press **V** to toggle the video scopes panel above the video controls. Three scopes are displayed side by side — click the histogram or waveform canvas to cycle through modes:

- **Histogram** — RGB → RGB + luma → CDF (cumulative distribution function)
- **Waveform** — luma → RGB parade → RGB overlay
- **Vectorscope** — plots color information (Cb vs Cr) on a circular graph with skin tone line and R/Y/G/C/B/M color target markers

Scopes update in real time during playback and on frame step. Works on both video frames and still images.

---

## Mixed Orientation Layout

When loading assets with different orientations (e.g. landscape and portrait videos together), the grid layout uses an **equal-area algorithm** so each asset has roughly the same visual weight regardless of aspect ratio. The Offset grid layout is not available for mixed orientations — the app uses the equal-area inline grid instead.

---

## Keyboard Shortcuts Reference

All hotkeys are customizable — press **H** to open the shortcuts panel, then click any key to rebind it. Custom bindings persist across sessions.

### Files
| Key | Action |
|-----|--------|
| **L** | Load files |

### View Mode
| Key | Action |
|-----|--------|
| **S** | Stack mode |
| **G** | Grid mode |
| **3** | Toggle Grid layout (Inline ↔ Offset) |
| **F** | Fullscreen |

### Zoom & Pan
| Key | Action |
|-----|--------|
| **0** | Zoom to fit |
| **1** | Zoom to 100% / fit to panel |
| **+** / **−** | Zoom in/out (or loupe magnification) |
| **Z** | Toggle zoom loupe |
| **Shift+Z** | Toggle linked zoom (Grid) |
| **[** / **]** | Resize zoom loupe |

### Transport
| Key | Action |
|-----|--------|
| **← → ↑ ↓** | Switch asset (Stack mode) |
| **Space** | Play / Pause |
| **,** / **.** | Frame step back / forward |
| **R** | Restart |
| **J** / **K** | Slower / Faster |
| **I** / **O** | Loop in / out |
| **M** | Mute |

### Analysis
| Key | Action |
|-----|--------|
| **V** | Toggle video scopes |
| **W** | Toggle waveform / spectrogram |
| **Shift+W** | Toggle linear / log frequency |
| **Shift+C** | Cycle spectrogram color palette |

### Panels
| Key | Action |
|-----|--------|
| **?** | Help (Getting Started) |
| **H** | Shortcuts panel |
| **Esc** | Dismiss loupe / close panel |

---

## Preferences

The following settings are saved to your browser and persist across sessions and page reloads:

- Zoom loupe size and magnification level
- Linked zoom on/off
- Volume level
- Spectrogram scale (linear/log) and color palette
- Custom hotkey bindings

---

## Info Bar

Each asset displays an info bar showing:
- Slot name (ORIGINAL, EDIT A, EDIT B — or GROUND-TRUTH AUDIO, AUDIO A, AUDIO B for audio files)
- Resolution (e.g. `1920×1080`) and aspect ratio (e.g. `16:9`) for images/videos
- Zoom level (e.g. `1.5×`)
- For audio files: sample rate, channels, bit depth/codec, file size, BPM
- Duration for videos and audio, or `—` for images

The frame counter detects frame rate automatically and snaps to the nearest standard rate (23.976, 24, 25, 29.97, 30, 48, 59.94, 60). Video timecode displays as SS:FF or M:SS:FF. Audio timecode displays as S.cc or M:SS.cc (centiseconds).

In Grid mode, the active asset is indicated with a cyan border and highlighted info bar.

---

## PWA & Offline

WarpDiff is a Progressive Web App — install it from Chrome, Edge, or Safari for a standalone window experience. After the first load, it works offline via a service worker with network-first caching.

---

## Welcome & Changelog

On your first visit, a **Getting Started** popup appears with an overview of the main features. On subsequent visits after an update, a **What's New** popup shows what changed in the latest version. Both dismiss automatically when you load files, or you can close them with the ✕ button, Escape key, or clicking the backdrop.

Press **?** or click the **Help** button in the header to reopen the Getting Started popup at any time.

---

## Limitations

- **1 to 3 files only** — loading 4+ files is not supported
- **Images, videos, and audio only** — other file types are ignored
- **Pan available in Stack mode only**
- **Audio:** one track at a time; others are automatically muted
