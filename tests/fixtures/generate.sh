#!/usr/bin/env bash
# Regenerate the gitignored media fixtures (mp4 / wav / mp3) used by tests/warpdiff.spec.ts.
# Each video uses 1-second solid-color segments at known timestamps so tests can sample
# specific pixel values without decoding intermediate frames. Mtimes are pinned to fix
# the GT/A/B slot ordering (oldest → original/GT).

set -euo pipefail

OUT="$(cd "$(dirname "$0")" && pwd)"

ENC_AV="-c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 23 -c:a aac -b:a 96k -movflags +faststart"

make_video() {
    local out="$1" w="$2" h="$3" fps="$4"; shift 4
    local colors=("$@")
    local tmpdir; tmpdir=$(mktemp -d)
    : > "$tmpdir/list.txt"
    local i=0
    for c in "${colors[@]}"; do
        ffmpeg -hide_banner -loglevel error -y \
            -f lavfi -i "color=c=${c}:s=${w}x${h}:r=${fps}:d=1" \
            -f lavfi -i "sine=frequency=$((220 + 110*i)):sample_rate=44100:duration=1" \
            -ac 2 $ENC_AV "$tmpdir/seg_${i}.mp4"
        echo "file '$tmpdir/seg_${i}.mp4'" >> "$tmpdir/list.txt"
        i=$((i+1))
    done
    ffmpeg -hide_banner -loglevel error -y \
        -f concat -safe 0 -i "$tmpdir/list.txt" -c copy "$out"
    rm -rf "$tmpdir"
}

make_video "$OUT/landscape_a.mp4" 960 540 24 red    green   blue
make_video "$OUT/landscape_b.mp4" 960 540 24 yellow magenta cyan  white
make_video "$OUT/portrait.mp4"    540 960 24 orange purple  teal  gray pink

ffmpeg -hide_banner -loglevel error -y -f lavfi -i "sine=frequency=440:sample_rate=44100:duration=3" -ac 2 -c:a pcm_s16le  "$OUT/stereo.wav"
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "sine=frequency=880:sample_rate=22050:duration=3" -ac 1 -c:a pcm_s16le  "$OUT/mono.wav"
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "sine=frequency=220:sample_rate=44100:duration=3" -ac 2 -c:a libmp3lame -b:a 128k "$OUT/track.mp3"

touch -t 202401010000 "$OUT/landscape_a.mp4" "$OUT/stereo.wav"
touch -t 202401020000 "$OUT/landscape_b.mp4" "$OUT/mono.wav"
touch -t 202401030000 "$OUT/portrait.mp4"    "$OUT/track.mp3"
