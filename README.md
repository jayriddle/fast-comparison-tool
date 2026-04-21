# *Warp*Diff

A browser-based tool for reviewing and comparing 1–3 images, videos, or audio files. No setup, no install — runs in your browser. Installable as a PWA for offline use.

**[Open WarpDiff →](https://jayriddle.github.io/warpdiff/)**

---

## Features

**View modes**
- **Stack** (`S`) — flip between assets with arrow keys, same position/zoom
- **Grid** (`G`) — side-by-side (2 files) or all three in a row/column (3 files), auto-picks layout; `3` toggles inline / offset
- Active asset highlighted with cyan border and info bar
- Mixed orientations use equal-area layout so each asset has the same visual weight

**Zoom loupe** (`Z`)
- Pixel-level inspection without changing your view
- `+`/`-` magnification (2×–32×), `[`/`]` resize
- `Shift+Z` linked zoom — hover one asset, see the same spot magnified on all others

**Video & audio playback**
- Synced playback across all assets
- Frame-step with `,` and `.`
- `J`/`K` slower/faster (0.25×–2×)
- Per-source audio switching (GT/A/B) with individual mute
- `I`/`O` loop in/out points, Shift+drag on timeline

**Audio file comparison**
- Load 1–3 audio files (MP3, WAV, FLAC, etc.) for side-by-side waveform + spectrogram
- Info bars show sample rate, channels, bit depth/codec, file size, and EBU R128 metrics (integrated LUFS, LRA, true peak)
- `E` cycles waveform / waveform + LUFS envelope / LUFS envelope only

**Frame gallery** (`Shift+G`)
- Capture the current frame from any slot and pin it to a scrollable gallery strip
- `{`/`}` step through captured frames — all videos seek to that timecode
- Gallery clears when new media is loaded

**Analysis**
- `D` difference mode — pixel difference between two assets in Stack mode; arrow keys or `Shift+D` cycle pairs (Source–A, Source–B, A–B)
- `V` video scopes — histogram (RGB / RGB+luma / CDF), waveform (luma / RGB parade / overlay), and vectorscope; click each scope to cycle modes
- `W` audio waveform with dB color coding + spectrogram
- `Shift+W` toggle linear/log frequency, `P` cycle spectrogram palettes

**Keyboard-first**
- Every action has a hotkey — press `?` for help, `H` for all hotkeys
- Reassign any hotkey from the hotkeys panel (click a key to rebind)
- Zoom, pan, and navigate without touching the mouse
- Preferences (loupe, volume, spectrogram settings, custom hotkeys) persist across sessions

**Installable**
- Install as a standalone app from Chrome, Edge, or Safari
- Offline-capable via service worker with network-first caching

## Usage

1. Open the [live app](https://jayriddle.github.io/warpdiff/) — or install it as a PWA
2. Press **L** (or click **Load**, or drag and drop) and select 1–3 image, video, or audio files
3. Use **Stack / Grid** buttons to switch views
4. Press **H** to see all keyboard shortcuts

Files auto-sort oldest → newest by timestamp. See [MANUAL.md](MANUAL.md) for full documentation.

## Bugs & Feature Requests

Found a bug or have an idea? [Open an issue](https://github.com/jayriddle/warpdiff/issues/new/choose) — use the version number shown in the top-left corner of the app when reporting bugs.
