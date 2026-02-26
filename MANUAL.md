# WarpDiff User Manual

WarpDiff is a browser-based visual comparison tool for reviewing 2–3 versions of images or videos side-by-side, stacked, or in overlay mode.

---

## Loading Files

**Three ways to load files:**
- Press **L**
- Click the **Load** button in the header
- Drag and drop files onto the window

**File requirements:**
- 2 or 3 files (images or videos)
- 2 files → assigned to **Edit A** and **Edit B**
- 3 files → assigned to **Original**, **Edit A**, and **Edit B**
- Files are automatically sorted oldest → newest by last-modified timestamp

**Timestamp warning:** If two or more files have timestamps within 2 seconds of each other, a toast warns that the sort order may be unreliable — check that the right file landed in the right slot.

**Duplicate detection:** If two slots contain the same file (matched by name, size, and timestamp), a warning banner appears at the top of the screen.

**Reset:** Click the **Reset** button (visible after loading) to clear all files and start over.

---

## View Modes

### Overlay
The default mode. One asset is visible at a time, layered on top of the others. Use the arrow keys or the asset buttons in the header to switch between assets.

### Grid (2 files)
Both assets displayed side-by-side with a gap between them. Assets are scaled so their shorter sides match — meaning a crop or zoom of another image will appear smaller, keeping the subject at the same physical size on screen.

The layout can be switched between **Horizontal** (left/right) and **Vertical** (top/bottom) using the buttons that appear below the media. The app auto-picks the best layout on first load based on the images' aspect ratios.

### Grid (3 files)
All three assets displayed in a row or column, auto-picked by aspect ratio.

### 3-UP (3 files)
Original on the left, Edit A top-right, Edit B bottom-right. More space-efficient than Grid — assets appear larger in the same viewport. Press **3** to toggle between Grid and 1+2 layouts.

---

## Switching Modes

| Action | Result |
|--------|--------|
| Click **OVERLAY** / **GRID** / **3-UP** in header | Switch to that mode |
| Press **O** | Toggle Overlay ↔ Grid/3-UP |
| Press **G** | Toggle Grid/3-UP ↔ Overlay |

---

## Zoom & Pan

Zoom and pan are available in **Overlay mode only**.

| Shortcut | Action |
|----------|--------|
| **+** | Zoom in |
| **−** | Zoom out |
| **0** | Zoom to fit |
| **1** | Zoom to 100% (actual pixels) |
| **Click and drag** | Pan (when zoomed in) |

Zoom range: 5% – 3200%. Each step multiplies/divides by √2 (~1.41×).

In **split modes** (Grid, 3-UP), pressing **1** toggles between fit-to-panel and 100% mode (no upscaling — images smaller than their cell render at actual size).

A zoom indicator appears at the bottom-right corner of each asset showing the current scale (e.g. `1.5×`).

---

## Zoom Loupe

Press **Z** to toggle a circular zoom loupe that follows your cursor, showing magnified native pixels without changing the overall zoom level. Works in all view modes.

| Shortcut | Action |
|----------|--------|
| **Z** | Toggle zoom loupe |
| **+** / **−** | Adjust magnification (2×–32×, when loupe is active) |
| **[** / **]** | Resize loupe (100–400px) |
| **Shift+Z** | Toggle linked zoom |

**Linked zoom:** In Grid and 3-Up modes, enabling linked zoom (**Shift+Z**) shows corresponding loupes on all other visible assets at the same relative position — hover over one asset to compare the exact same spot across all versions.

The loupe hides during panning and updates live during video playback and frame stepping. Loupe size and magnification level persist across sessions.

---

## Video Playback

Video controls appear at the bottom of the screen when videos are loaded. All videos play, pause, and seek in sync.

| Control | Description |
|---------|-------------|
| **Progress bar** | Click to seek; drag to scrub |
| **Timecode** (left) | Current position — click to toggle between time (H:MM:SS) and frame count |
| **Duration** (right of bar) | Total length |
| **Speaker icon** | Mute/unmute the active audio source |
| **Volume slider** | Adjust volume |
| **O / A / B buttons** | Select which asset's audio to hear |

**Keyboard shortcuts:**

| Shortcut | Action |
|----------|--------|
| **Space** | Play / Pause |
| **,** | Step back one frame |
| **.** | Step forward one frame |
| **R** | Restart from beginning |
| **M** | Mute / Unmute |

**Audio source selector:** Only one audio track plays at a time. Click O, A, or B to switch sources. Each button has its own mute icon for independent muting. If the active source is muted, audio automatically switches to the next unmuted source.

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

---

## Video Scopes

Press **V** to toggle the video scopes panel above the video controls. Three scopes are displayed side by side:

- **RGB Histogram** — shows the distribution of red, green, and blue values across the frame as overlapping semi-transparent curves
- **Waveform Monitor** — plots luma (brightness) for each column of the frame, green phosphor style with 0–100 IRE scale
- **Vectorscope** — plots color information (Cb vs Cr) on a circular graph with skin tone line and R/Y/G/C/B/M color target markers

Scopes update in real time during playback and on frame step. In overlay mode they show the active asset; in split modes they show the active audio source.

---

## Mixed Orientation Layout

When loading assets with different orientations (e.g. landscape and portrait videos together), the grid layout uses an **equal-area algorithm** so each asset has roughly the same visual weight regardless of aspect ratio. The 3-UP L-shaped layout is not available for mixed orientations — the app uses the equal-area grid instead.

---

## Keyboard Shortcuts Reference

| Key | Action |
|-----|--------|
| **L** | Load files |
| **Z** | Toggle zoom loupe |
| **Shift+Z** | Toggle linked zoom (Grid/3-Up) |
| **[ ]** | Resize zoom loupe |
| **← →** | Switch asset (Overlay mode) |
| **O** | Toggle Overlay mode |
| **G** | Toggle Grid / 3-UP mode |
| **3** | Toggle 3-UP layout (Grid ↔ 1+2) |
| **F** | Fullscreen |
| **+** / **−** | Zoom in/out (or loupe magnification when active) |
| **0** | Zoom to fit |
| **1** | Zoom to 100% / toggle 100% cap |
| **Space** | Play / Pause |
| **,** / **.** | Frame step back / forward |
| **R** | Restart |
| **M** | Mute |
| **V** | Toggle video scopes (histogram, waveform monitor, vectorscope) |
| **W** | Toggle waveform / spectrogram |
| **Shift+W** | Toggle linear / log frequency |
| **Shift+C** | Cycle spectrogram color palette |
| **K** | Toggle shortcuts panel |
| **Esc** | Dismiss loupe / close panel |

---

## Preferences

The following settings are saved to your browser and persist across sessions and page reloads:

- Zoom loupe size and magnification level
- Linked zoom on/off
- Volume level
- Spectrogram scale (linear/log) and color palette

---

## Info Bar

Each asset displays an info bar showing:
- Slot name (ORIGINAL, IMAGE A / EDIT A, IMAGE B / EDIT B)
- Resolution (e.g. `1920×1080`)
- Aspect ratio (e.g. `16:9`) — shown in amber if it doesn't match a known standard, as a heads-up to check export settings
- Duration for videos (e.g. `0:02:34`), or `—` for images

The frame counter detects frame rate automatically and snaps to the nearest standard rate (23.976, 24, 25, 29.97, 30, 48, 59.94, 60).

In split modes, the info bar of the asset whose audio is currently playing is highlighted.

---

## Limitations

- **2 or 3 files only** — loading 1 or 4+ files is not supported
- **Images and videos only** — other file types are ignored
- **Pan available in Overlay mode only**
- **Audio:** one track at a time; others are automatically muted
