# WarpDiff

Visual & audio comparison for creative review. Compare images, videos, or audio files. No setup, no install — runs in your browser.

## Load and compare instantly

Load 2–3 images, videos, or audio files by dragging and dropping, pressing `L`, or clicking Load. Files auto-sort by save time into Original, Edit A, and Edit B.

## View modes

- **Overlay** (`O`) — flip between assets with arrow keys, same position and zoom
- **Grid** (`G`) — side-by-side (2 files) or all three in a row/column (3 files), auto-picks the best layout; `3` toggles inline / offset
- Active asset highlighted with cyan border and info bar. Mixed orientations use an equal-area layout so each asset has the same visual weight.

## Zoom loupe

Press `Z` for a circular zoom loupe that follows your cursor, showing magnified native pixels without changing the overall zoom level.

- `+`/`-` adjust magnification (2×–32×)
- `[`/`]` resize the loupe (100–400px)
- `Shift+Z` enables linked zoom — hover one asset, see the same spot magnified on all others (Grid modes)

## Synchronized video playback

All videos play in sync with shared transport controls. Scrub, frame-step with `,`/`.`, and restart together. Per-source audio switching lets you listen to any asset's audio track independently.

## Video scopes

Press `V` to toggle RGB histogram, waveform monitor, and vectorscope. Scopes update in real time during playback and on frame step.

## Audio visualization

Press `W` to toggle waveform and spectrogram views. Waveform uses dB color coding — green for normal levels, yellow for caution (>-6dB), red for hot/clipping (>-1dB). Spectrogram supports linear/log frequency scale (`Shift+W`) and multiple color palettes (`Shift+C`).

## Audio file comparison

Load 2–3 audio files (MP3, WAV, FLAC, AAC, OGG, etc.) to compare them side-by-side in Grid mode. Each slot shows a waveform (top) and spectrogram (bottom) with frequency labels. Info bars display sample rate, channels, bit depth (or codec name for lossy formats), and file size. Spectrogram scale and palette controls (`Shift+W`, `Shift+C`) apply to all audio slots.

## Keyboard-driven workflow

Every action has a hotkey. Press `?` for help, `K` for the full hotkey list, `Esc` to dismiss. Your preferences — loupe size, magnification, volume, spectrogram settings — persist across sessions.

## Works instantly

No install, no account, no upload. Open in any browser, load your files. Everything stays local on your machine.
