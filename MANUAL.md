# WarpDiff User Manual

WarpDiff is a browser-based visual comparison tool for reviewing 2–3 versions of images or videos side-by-side or stacked on top of each other.

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

### Compare (2 files)
Both assets displayed side-by-side with a 16px gap between them. Assets are scaled so their shorter sides match — meaning a crop or zoom of another image will appear smaller, keeping the subject at the same physical size on screen.

The layout can be switched between **Horizontal** (left/right) and **Vertical** (top/bottom) using the buttons that appear below the media. The app auto-picks the best layout on first load based on the images' aspect ratios.

### 3-UP (3 files)
All three assets displayed in a grid: Original on the left, Edit A top-right, Edit B bottom-right. All three are scaled to the same logical size. A 16px gap separates the left and right columns.

---

## Switching Modes

| Action | Result |
|--------|--------|
| Click **OVERLAY** / **COMPARE** / **3-UP** in header | Switch to that mode |
| Press **O** | Toggle Overlay ↔ Compare/3-UP |
| Press **C** | Toggle Compare/3-UP ↔ Overlay |

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

In **split modes** (Compare, 3-UP), pressing **1** toggles between fit-to-panel and 100% mode (no upscaling — images smaller than their cell render at actual size).

A zoom indicator appears at the bottom-right corner of each asset showing the current scale (e.g. `1.5×`).

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
| **R** | Restart from beginning |
| **M** | Mute / Unmute |

**Audio source selector:** Only one audio track plays at a time. Click O, A, or B to switch sources. Each button has its own mute icon for independent muting. If the active source is muted, audio automatically switches to the next unmuted source.

---

## Keyboard Shortcuts Reference

| Key | Action |
|-----|--------|
| **L** | Load files |
| **← →** | Switch asset (Overlay mode) |
| **O** | Toggle Overlay mode |
| **C** | Toggle Compare / 3-UP mode |
| **F** | Fullscreen |
| **+** | Zoom in |
| **−** | Zoom out |
| **0** | Zoom to fit |
| **1** | Zoom to 100% / toggle 100% cap |
| **Space** | Play / Pause |
| **R** | Restart |
| **M** | Mute |
| **K** | Toggle shortcuts panel |

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
