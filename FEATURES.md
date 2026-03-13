# WarpDiff

Visual & audio comparison for creative review. Compare images, videos, or audio files. No setup, no install — runs in your browser.

## Load and compare instantly

Load 1–3 images, videos, or audio files by dragging and dropping, pressing `L`, or clicking Load. Files auto-sort by save time into Source, A, and B. A landing drop zone with hints appears when no files are loaded.

## View modes

- **Stack** (`S`) — flip between assets with arrow keys, same position and zoom
- **Grid** (`G`) — side-by-side (2 files) or all three in a row/column (3 files), auto-picks the best layout; `3` toggles inline / offset
- Active asset highlighted with cyan border and info bar. Mixed orientations use an equal-area layout so each asset has the same visual weight.
- Responsive grid layout auto-picks horizontal or vertical based on viewport dimensions and asset aspect ratios, re-evaluated on resize.

## Zoom loupe

Press `Z` for a circular zoom loupe that follows your cursor, showing magnified native pixels without changing the overall zoom level.

- `+`/`-` adjust magnification (2×–32×)
- `[`/`]` resize the loupe (100–400px)
- `Shift+Z` enables linked zoom — hover one asset, see the same spot magnified on all others (Grid modes)

## Synchronized video playback

All videos play in sync with shared transport controls. Scrub, frame-step with `,`/`.`, and restart together. Per-source audio switching lets you listen to any asset's audio track independently.

- `J`/`K` cycle playback speed slower/faster (0.25×, 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2×)
- `I`/`O` set loop in/out points; Shift+drag on the progress bar to select a loop region
- Loop markers shown as orange triangles on the progress bar

## Difference mode

Press `D` in Stack mode to overlay a pixel-difference composite of two assets. Identical pixels appear black; differences glow in proportion to the delta. Arrow keys cycle through available pairs (Source–A, Source–B, A–B with 3 files). Works with images and video — updates live during playback and on frame step. Press `D` again to turn it off.

## Video scopes

Press `V` to toggle the video scopes panel. Three scopes are displayed side by side — click the histogram or waveform to cycle through modes:

- **Histogram** — RGB → RGB + luma → CDF (cumulative distribution)
- **Waveform** — luma → RGB parade → RGB overlay
- **Vectorscope** — plots color information (Cb vs Cr) with skin tone line and color target markers

Scopes update in real time during playback and on frame step. Works on both video frames and still images.

## Audio visualization

Press `W` to toggle waveform and spectrogram views. Waveform uses dB color coding — green for normal levels, yellow for caution (>-6dB), red for hot/clipping (>-1dB). Spectrogram supports linear/log frequency scale (`Shift+W`) and multiple color palettes (`Shift+C`).

## Audio file comparison

Load 1–3 audio files (MP3, WAV, FLAC, AAC, OGG, etc.) to compare them side-by-side in Grid mode. Each slot shows a waveform (top) and spectrogram (bottom) with frequency labels. Info bars display sample rate, channels, bit depth (or codec name for lossy formats), file size, and BPM.

Automatic BPM detection uses spectral flux onset analysis with autocorrelation, weighted toward musically common tempos. Spectrogram scale and palette controls (`Shift+W`, `Shift+C`) apply to all audio slots.

## Keyboard-driven workflow

Every action has a hotkey. Press `?` for help, `H` for the full hotkey list, `Esc` to dismiss. Hotkeys are fully customizable — click any key in the hotkeys panel to rebind it. Custom bindings persist across sessions.

## Installable

WarpDiff is a Progressive Web App. Install it from Chrome, Edge, or Safari for a standalone window experience. Offline-capable via service worker with network-first caching — works without an internet connection after first load.

## Works instantly

No install required, no account, no upload. Open in any browser, load your files. Everything stays local on your machine.
