# *Warp*Diff

A browser-based visual comparison tool for reviewing 2–3 versions of images or videos. No setup, no install — just click to start.

**[Open WarpDiff →](https://jayriddle.github.io/warpdiff/)**

---

## Features

**View modes**
- **Overlay** (`O`) — flip between assets with arrow keys, same position/zoom
- **Grid** (`G`) — side-by-side (2 files) or all three in a row/column (3 files), auto-picks layout
- **Grid** (`3`) — inline (equal columns/rows) or offset (original left, edits stacked right)

**Zoom loupe** (`Z`)
- Pixel-level inspection without changing your view
- `+`/`-` magnification (2×–32×), `[`/`]` resize
- `Shift+Z` linked zoom — hover one asset, see the same spot magnified on all others

**Video**
- Synced playback across all assets
- Frame-step with `,` and `.`
- Per-source audio switching (O/A/B) with individual mute
- `W` for waveform with dB color coding + spectrogram

**Keyboard-first**
- Every action has a hotkey — press `K` to see them all, `Esc` to dismiss
- Zoom, pan, and navigate without touching the mouse
- Preferences (loupe, volume, spectrogram settings) persist across sessions

## Usage

1. Open the [live app](https://jayriddle.github.io/warpdiff/)
2. Press **L** (or click **Load**) and select 2–3 image or video files
3. Use **Overlay / Grid** buttons to switch views
4. Press **K** to see all keyboard shortcuts

Files auto-sort oldest → newest by timestamp. See [MANUAL.md](MANUAL.md) for full documentation.

## Bugs & Feature Requests

Found a bug or have an idea? [Open an issue](https://github.com/jayriddle/warpdiff/issues/new/choose) — use the version number shown in the top-left corner of the app when reporting bugs.
