# *Warp*Diff

A browser-based comparison tool for reviewing 2–3 versions of images, videos, or audio files. No setup, no install — just click to start.

**[Open WarpDiff →](https://jayriddle.github.io/warpdiff/)**

---

## Features

**View modes**
- **Overlay** (`O`) — flip between assets with arrow keys, same position/zoom
- **Grid** (`G`) — side-by-side (2 files) or all three in a row/column (3 files), auto-picks layout; `3` toggles inline / offset
- Active asset highlighted with cyan border and info bar
- Mixed orientations use equal-area layout so each asset has the same visual weight

**Zoom loupe** (`Z`)
- Pixel-level inspection without changing your view
- `+`/`-` magnification (2×–32×), `[`/`]` resize
- `Shift+Z` linked zoom — hover one asset, see the same spot magnified on all others

**Video**
- Synced playback across all assets
- Frame-step with `,` and `.`
- Per-source audio switching (O/A/B) with individual mute

**Audio file comparison**
- Load 2–3 audio files (MP3, WAV, FLAC, etc.) for side-by-side waveform + spectrogram
- Info bars show sample rate, channels, bit depth/codec, file size

**Analysis**
- `V` video scopes — RGB histogram, waveform monitor, vectorscope
- `W` audio waveform with dB color coding + spectrogram

**Keyboard-first**
- Every action has a hotkey — press `?` for help, `K` for all hotkeys
- Zoom, pan, and navigate without touching the mouse
- Preferences (loupe, volume, spectrogram settings) persist across sessions

## Usage

1. Open the [live app](https://jayriddle.github.io/warpdiff/)
2. Press **L** (or click **Load**) and select 2–3 image, video, or audio files
3. Use **Overlay / Grid** buttons to switch views
4. Press **K** to see all keyboard shortcuts

Files auto-sort oldest → newest by timestamp. See [MANUAL.md](MANUAL.md) for full documentation.

## Bugs & Feature Requests

Found a bug or have an idea? [Open an issue](https://github.com/jayriddle/warpdiff/issues/new/choose) — use the version number shown in the top-left corner of the app when reporting bugs.
