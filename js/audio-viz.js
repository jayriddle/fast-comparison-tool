// Audio visualization primitives — waveform/spectrogram computation and rendering
// Extracted from index.html; no app-state dependencies.

// Minimal radix-2 FFT (in-place, complex interleaved)
function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
            tmp = im[i]; im[i] = im[j]; im[j] = tmp;
        }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const half = len >> 1;
        const angle = -2 * Math.PI / len;
        const wRe = Math.cos(angle), wIm = Math.sin(angle);
        for (let i = 0; i < n; i += len) {
            let curRe = 1, curIm = 0;
            for (let j = 0; j < half; j++) {
                const a = i + j, b = a + half;
                const tRe = curRe * re[b] - curIm * im[b];
                const tIm = curRe * im[b] + curIm * re[b];
                re[b] = re[a] - tRe; im[b] = im[a] - tIm;
                re[a] += tRe;        im[a] += tIm;
                const nextRe = curRe * wRe - curIm * wIm;
                curIm = curRe * wIm + curIm * wRe;
                curRe = nextRe;
            }
        }
    }
}

// Spectrogram color palettes (256 entries each)
function buildPalette(fn) {
    const p = new Array(256);
    for (let i = 0; i < 256; i++) p[i] = fn(i / 255);
    return p;
}

const spectrogramPalettes = {
    viridis: buildPalette(t => [
        Math.round(255 * Math.min(1, Math.max(0, -0.85 + 3.2 * t - 1.6 * t * t))),
        Math.round(255 * Math.min(1, Math.max(0, -0.1 + 1.4 * t - 0.3 * t * t))),
        Math.round(255 * Math.min(1, Math.max(0, 0.55 + 1.5 * t - 3.0 * t * t)))
    ]),
    magma: buildPalette(t => [
        Math.round(255 * Math.min(1, Math.max(0, -0.2 + 3.6 * t - 2.8 * t * t))),
        Math.round(255 * Math.min(1, Math.max(0, -0.4 + 1.2 * t + 0.5 * t * t))),
        Math.round(255 * Math.min(1, Math.max(0, 0.1 + 2.0 * t - 2.5 * t * t)))
    ]),
    inferno: buildPalette(t => [
        Math.round(255 * Math.min(1, Math.max(0, -0.1 + 3.2 * t - 2.2 * t * t))),
        Math.round(255 * Math.min(1, Math.max(0, -0.6 + 1.8 * t - 0.2 * t * t))),
        Math.round(255 * Math.min(1, Math.max(0, 0.3 + 1.0 * t - 2.5 * t * t)))
    ]),
    grayscale: buildPalette(t => {
        const v = Math.round(255 * t);
        return [v, v, v];
    }),
    heat: buildPalette(t => [
        Math.round(255 * Math.min(1, t * 2.5)),
        Math.round(255 * Math.min(1, Math.max(0, (t - 0.4) * 2.5))),
        Math.round(255 * Math.min(1, Math.max(0, (t - 0.75) * 4)))
    ])
};

const paletteNames = Object.keys(spectrogramPalettes);

// --- Waveform computation ---

function computeWaveformChannel(channelData, numBuckets) {
    const samplesPerBucket = Math.floor(channelData.length / numBuckets);
    const result = new Float32Array(numBuckets * 2);
    for (let i = 0; i < numBuckets; i++) {
        let min = 1, max = -1;
        const start = i * samplesPerBucket;
        const end = Math.min(start + samplesPerBucket, channelData.length);
        for (let j = start; j < end; j++) {
            if (channelData[j] < min) min = channelData[j];
            if (channelData[j] > max) max = channelData[j];
        }
        result[i * 2] = min;
        result[i * 2 + 1] = max;
    }
    return result;
}

function computeWaveformData(audioBuffer, numBuckets) {
    const L = computeWaveformChannel(audioBuffer.getChannelData(0), numBuckets);
    const R = audioBuffer.numberOfChannels > 1
        ? computeWaveformChannel(audioBuffer.getChannelData(1), numBuckets)
        : null;
    return { L, R };
}

// --- Spectrogram computation ---

function runSTFT(channelData, fftSize, hop) {
    const numFrames = Math.floor((channelData.length - fftSize) / hop) + 1;
    if (numFrames <= 0) return null;

    const win = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));

    const halfBins = fftSize / 2;
    const frames = new Array(numFrames);
    const re = new Float32Array(fftSize);
    const im = new Float32Array(fftSize);

    for (let f = 0; f < numFrames; f++) {
        const offset = f * hop;
        for (let i = 0; i < fftSize; i++) {
            re[i] = (offset + i < channelData.length ? channelData[offset + i] : 0) * win[i];
            im[i] = 0;
        }
        fft(re, im);
        const magnitudes = new Uint8Array(halfBins);
        for (let i = 0; i < halfBins; i++) {
            const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / halfBins;
            const db = 20 * Math.log10(Math.max(mag, 1e-10));
            magnitudes[i] = Math.round(Math.max(0, Math.min(255, ((db + 100) / 100) * 255)));
        }
        frames[f] = magnitudes;
    }

    return { frames, halfBins };
}

function computeSpectrogramChannel(channelData, sampleRate) {
    const hop = 128;
    const loFFT = 8192;
    const hiFFT = 2048;
    const crossoverLoHz = 500;
    const crossoverHiHz = 2000;

    const lo = runSTFT(channelData, loFFT, hop);
    const hi = runSTFT(channelData, hiFFT, hop);
    if (!lo || !hi) return lo ? { frames: lo.frames, fftSize: loFFT } : null;

    const outBins = loFFT / 2;
    const binResLo = sampleRate / loFFT;
    const binResHi = sampleRate / hiFFT;
    const blendLoBin = Math.round(crossoverLoHz / binResLo);
    const blendHiBin = Math.round(crossoverHiHz / binResLo);
    const blendRange = blendHiBin - blendLoBin;

    const loFrames = lo.frames;
    const hiFrames = hi.frames;
    const numFrames = loFrames.length;

    const frames = new Array(numFrames);
    for (let f = 0; f < numFrames; f++) {
        const merged = new Uint8Array(outBins);
        const loFrame = loFrames[f];
        const hiIdx = Math.min(hiFrames.length - 1, Math.round(f * (hiFrames.length - 1) / (numFrames - 1 || 1)));
        const hiFrame = hiFrames[hiIdx];

        for (let b = 0; b < blendLoBin && b < outBins; b++) {
            merged[b] = loFrame[b];
        }
        for (let b = blendLoBin; b < blendHiBin && b < outBins; b++) {
            const t = (b - blendLoBin) / blendRange;
            const freq = b * binResLo;
            const hiBin = Math.min(hi.halfBins - 1, Math.round(freq / binResHi));
            merged[b] = Math.round(loFrame[b] * (1 - t) + hiFrame[hiBin] * t);
        }
        for (let b = blendHiBin; b < outBins; b++) {
            const freq = b * binResLo;
            const hiBin = Math.min(hi.halfBins - 1, Math.round(freq / binResHi));
            merged[b] = hiFrame[hiBin];
        }
        frames[f] = merged;
    }
    lo.frames = null;
    hi.frames = null;

    return { frames, fftSize: loFFT };
}

function computeSpectrogramData(audioBuffer) {
    const sr = audioBuffer.sampleRate;
    const L = computeSpectrogramChannel(audioBuffer.getChannelData(0), sr);
    const R = audioBuffer.numberOfChannels > 1
        ? computeSpectrogramChannel(audioBuffer.getChannelData(1), sr)
        : null;
    return { L, R, sampleRate: sr, duration: audioBuffer.duration };
}

// --- Waveform rendering ---

const WAVEFORM_DB_CLIP = 0.99;
const WAVEFORM_DB_1  = 0.891;
const WAVEFORM_DB_6  = 0.501;
const WAVEFORM_DB_12 = 0.251;

const WAVEFORM_ZONES = [
    { threshold: WAVEFORM_DB_CLIP, color: 'rgba(255, 50, 50, 1)' },
    { threshold: WAVEFORM_DB_1,    color: 'rgba(255, 80, 60, 1)' },
    { threshold: WAVEFORM_DB_6,    color: 'rgba(255, 200, 60, 1)' },
    { threshold: 0,               color: null },
];

const WAVEFORM_DB_LEVELS = [
    { db: -1,  amp: WAVEFORM_DB_1 },
    { db: -6,  amp: WAVEFORM_DB_6 },
    { db: -12, amp: WAVEFORM_DB_12 },
    { db: -24, amp: 0.063 },
];

function drawWaveformChannelSmooth(ctx, data, drawW, topY, fullH) {
    const numBuckets = data.length / 2;
    if (numBuckets === 0) return;
    const midY = topY + fullH / 2;
    const halfH = fullH / 2;
    const bucketW = drawW / numBuckets;

    const minSpread = 1 / halfH;
    const path = new Path2D();
    let mn = data[0], mx = data[1];
    if (mx - mn < minSpread) { mx += minSpread / 2; mn -= minSpread / 2; }
    path.moveTo(0, midY - mx * halfH);
    for (let i = 1; i < numBuckets; i++) {
        mn = data[i * 2]; mx = data[i * 2 + 1];
        if (mx - mn < minSpread) { mx += minSpread / 2; mn -= minSpread / 2; }
        path.lineTo(i * bucketW, midY - mx * halfH);
    }
    for (let i = numBuckets - 1; i >= 0; i--) {
        mn = data[i * 2]; mx = data[i * 2 + 1];
        if (mx - mn < minSpread) { mn -= minSpread / 2; }
        path.lineTo(i * bucketW, midY - mn * halfH);
    }
    path.closePath();

    const grad = ctx.createLinearGradient(0, topY, 0, topY + fullH);
    grad.addColorStop(0.0, 'rgba(30, 130, 30, 1)');
    grad.addColorStop(0.5, 'rgba(100, 230, 100, 1)');
    grad.addColorStop(1.0, 'rgba(30, 130, 30, 1)');
    ctx.fillStyle = grad;
    ctx.fill(path);

    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(100, 230, 100, 0.35)';
    ctx.lineWidth = 0.5;
    ctx.stroke(path);

    for (let z = WAVEFORM_ZONES.length - 2; z >= 0; z--) {
        const zone = WAVEFORM_ZONES[z];
        const t = zone.threshold;
        const bandTopPos = midY - halfH;
        const bandBotPos = midY - t * halfH;
        const bandTopNeg = midY + t * halfH;
        const bandBotNeg = midY + halfH;

        ctx.save();
        ctx.clip(path);
        ctx.fillStyle = zone.color;
        ctx.fillRect(0, bandTopPos, drawW, bandBotPos - bandTopPos);
        ctx.fillRect(0, bandTopNeg, drawW, bandBotNeg - bandTopNeg);
        ctx.restore();
    }
}

function drawWaveformDbGrid(ctx, w, topY, halfH) {
    const midY = topY + halfH;
    for (const { amp } of WAVEFORM_DB_LEVELS) {
        const yOff = amp * halfH;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, midY - yOff);
        ctx.lineTo(w, midY - yOff);
        ctx.moveTo(0, midY + yOff);
        ctx.lineTo(w, midY + yOff);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// --- Spectrogram rendering ---

function drawSpectrogramRegion(pixels, canvasW, frames, numBins, startY, regionH, sampleRate, palette, logScale) {
    const numFrames = frames.length;
    const nyquist = sampleRate / 2;
    const fMin = 20;
    const logMin = Math.log(fMin);
    const logMax = Math.log(nyquist);
    const logRange = logMax - logMin;

    for (let x = 0; x < canvasW; x++) {
        const frameIdx = Math.min(numFrames - 1, Math.floor((x / canvasW) * numFrames));
        const frame = frames[frameIdx];
        for (let dy = 0; dy < regionH; dy++) {
            const y = startY + dy;
            const t = (regionH - 1 - dy) / regionH;
            let binF;
            if (logScale) {
                const freq = Math.exp(logMin + t * logRange);
                binF = freq / nyquist * numBins;
            } else {
                binF = t * numBins;
            }
            const b0 = Math.max(0, Math.min(numBins - 1, Math.floor(binF)));
            const b1 = Math.min(numBins - 1, b0 + 1);
            const frac = binF - b0;
            const val = Math.round(frame[b0] * (1 - frac) + frame[b1] * frac);
            const [r, g, b] = palette[val];
            const idx = (y * canvasW + x) * 4;
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
            pixels[idx + 3] = 255;
        }
    }
}

// ── EBU R128 / ITU-R BS.1770-4 loudness & true peak metrics ──────────────────
//
// K-weighting filter: two cascaded biquad IIR stages per BS.1770-4 §4
//   Stage 1 — pre-filter    : high-shelf, +4 dB, Q = 1/√2, fc ≈ 1500 Hz
//   Stage 2 — RLB high-pass : 2nd-order Butterworth, fc = 38.13506 Hz
// Coefficients derived analytically via the Audio EQ Cookbook for any fs.
//
// Integrated loudness (LUFS):
//   400 ms blocks at 75% overlap → absolute gate −70 LUFS → relative gate −10 LU
//   Power-domain mean of gated blocks.
//
// Loudness range (LRA, LU):
//   3 s short-term blocks at 1 s step → abs gate −70 LUFS → rel gate −20 LU
//   10th–95th percentile spread of gated distribution.
//
// True peak (dBTP):
//   4-point Catmull-Rom cubic interpolation at ×4 density per channel.
//   Catches inter-sample peaks without requiring async OfflineAudioContext.

function _kwCoeffs(fs) {
    // Stage 1: high-shelf pre-filter (+4 dB, Q = 1/√2, fc = 1500 Hz)
    const A    = Math.pow(10, 4.0 / 40.0);      // sqrt(10^(4/20))
    const w0   = 2 * Math.PI * 1500.0 / fs;
    const cos0 = Math.cos(w0), sin0 = Math.sin(w0);
    const alp0 = sin0 / Math.SQRT2;             // Q = 1/√2
    const sqA  = Math.sqrt(A);
    const a0hs = (A + 1) - (A - 1) * cos0 + 2 * sqA * alp0;
    const hs   = [
         A * ((A + 1) + (A - 1) * cos0 + 2 * sqA * alp0) / a0hs,  // b0
        -2 * A * ((A - 1) + (A + 1) * cos0)               / a0hs,  // b1
         A * ((A + 1) + (A - 1) * cos0 - 2 * sqA * alp0) / a0hs,  // b2
         2 * ((A - 1) - (A + 1) * cos0)                   / a0hs,  // a1
            ((A + 1) - (A - 1) * cos0 - 2 * sqA * alp0)  / a0hs,  // a2
    ];

    // Stage 2: RLB high-pass (2nd-order Butterworth, fc = 38.13506 Hz)
    const w1   = 2 * Math.PI * 38.13506 / fs;
    const cos1 = Math.cos(w1), sin1 = Math.sin(w1);
    const alp1 = sin1 / Math.SQRT2;
    const a0hp = 1 + alp1;
    const hp   = [
         (1 + cos1) / 2 / a0hp,   // b0
        -(1 + cos1)     / a0hp,   // b1
         (1 + cos1) / 2 / a0hp,   // b2
        -2 * cos1       / a0hp,   // a1
         (1 - alp1)     / a0hp,   // a2
    ];

    return { hs, hp };
}

function _biquad(src, b0, b1, b2, a1, a2) {
    const dst = new Float32Array(src.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < src.length; i++) {
        const x0 = src[i];
        const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = x0; y2 = y1; y1 = y0;
        dst[i] = y0;
    }
    return dst;
}

function _kweight(data, c) {
    const s1 = _biquad(data, c.hs[0], c.hs[1], c.hs[2], c.hs[3], c.hs[4]);
    return      _biquad(s1,  c.hp[0], c.hp[1], c.hp[2], c.hp[3], c.hp[4]);
}

// 4× Catmull-Rom interpolation true peak for one channel
function _truePeakCh(data) {
    const n = data.length;
    let peak = 0;
    for (let i = 0; i < n; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
        // Interpolate t = 0.25, 0.5, 0.75 between sample i and i+1
        const x0 = data[Math.max(0, i - 1)];
        const x1 = data[i];
        const x2 = data[Math.min(n - 1, i + 1)];
        const x3 = data[Math.min(n - 1, i + 2)];
        for (let k = 1; k <= 3; k++) {
            const t = k / 4, t2 = t * t, t3 = t2 * t;
            const v = 0.5 * (
                (-x0 + 3 * x1 - 3 * x2 + x3) * t3 +
                (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 +
                (-x0 + x2) * t +
                2 * x1
            );
            const av = Math.abs(v);
            if (av > peak) peak = av;
        }
    }
    return peak;
}

// Power-domain mean of LUFS block values:
// L̄ = 10·log₁₀( mean( 10^(lᵢ/10) ) )  — the −0.691 offsets cancel out.
function _lufsAvg(arr) {
    return 10 * Math.log10(arr.reduce((s, l) => s + Math.pow(10, l / 10), 0) / arr.length);
}

function computeAudioMetrics(audioBuffer) {
    if (!audioBuffer || !audioBuffer.getChannelData) return null;

    const fs    = audioBuffer.sampleRate;
    const nCh   = audioBuffer.numberOfChannels;
    const nSamp = audioBuffer.length;
    const c     = _kwCoeffs(fs);

    // K-weight every channel (BS.1770 channel weight = 1.0 for L/R/C; 1.41 for Ls/Rs,
    // but browsers decode multichannel to stereo/mono so all channels use 1.0 here)
    const kw = [];
    for (let ch = 0; ch < nCh; ch++) kw.push(_kweight(audioBuffer.getChannelData(ch), c));

    // ── Integrated loudness ───────────────────────────────────────────────────
    const blkSz  = Math.round(0.400 * fs);   // 400 ms block
    const blkStp = Math.round(0.100 * fs);   // 75% overlap → 100 ms step
    const blks   = [];

    for (let s = 0; s + blkSz <= nSamp; s += blkStp) {
        let z = 0;
        for (let ch = 0; ch < nCh; ch++) {
            const d = kw[ch];
            let sq = 0;
            for (let i = s; i < s + blkSz; i++) sq += d[i] * d[i];
            z += sq / blkSz;
        }
        blks.push(-0.691 + 10 * Math.log10(z || 1e-20));
    }

    let integratedLUFS = null;
    const absGated = blks.filter(l => l > -70);
    if (absGated.length > 0) {
        const ungated  = _lufsAvg(absGated);
        const relGated = absGated.filter(l => l > ungated - 10);
        if (relGated.length > 0) integratedLUFS = _lufsAvg(relGated);
    }

    // ── Loudness range (LRA) ──────────────────────────────────────────────────
    const stSz  = Math.round(3.0 * fs);   // 3 s short-term window
    const stStp = Math.round(1.0 * fs);   // 1 s step
    const stBlks = [];

    for (let s = 0; s + stSz <= nSamp; s += stStp) {
        let z = 0;
        for (let ch = 0; ch < nCh; ch++) {
            const d = kw[ch];
            let sq = 0;
            for (let i = s; i < s + stSz; i++) sq += d[i] * d[i];
            z += sq / stSz;
        }
        stBlks.push(-0.691 + 10 * Math.log10(z || 1e-20));
    }

    let lra = null;
    const stAbsGated = stBlks.filter(l => l > -70);
    if (stAbsGated.length >= 2) {
        const stRelGated = stAbsGated.filter(l => l > _lufsAvg(stAbsGated) - 20)
                                     .sort((a, b) => a - b);
        if (stRelGated.length >= 2) {
            const p10 = stRelGated[Math.floor(stRelGated.length * 0.10)];
            const p95 = stRelGated[Math.min(stRelGated.length - 1, Math.floor(stRelGated.length * 0.95))];
            lra = p95 - p10;
        }
    }

    // ── True peak (4× Catmull-Rom per channel) ────────────────────────────────
    let maxPeak = 0;
    for (let ch = 0; ch < nCh; ch++) {
        const p = _truePeakCh(audioBuffer.getChannelData(ch));
        if (p > maxPeak) maxPeak = p;
    }

    return {
        integratedLUFS: integratedLUFS !== null ? integratedLUFS.toFixed(1) : null,
        lra:            lra            !== null ? lra.toFixed(1)            : null,
        truePeakDBTP:   (20 * Math.log10(maxPeak || 1e-10)).toFixed(1),
        sampleRate:     fs,
        channels:       nCh,
        duration:       audioBuffer.duration,
        // Short-term LUFS blocks (1 s step, 3 s window) — used for envelope visualization.
        // Each entry is the raw LUFS value (unformatted float) at that time position.
        stBlks,
    };
}

// ── LUFS envelope rendering ────────────────────────────────────────────────────
//
// Draws the short-term LUFS envelope as a filled area chart on top of (or instead
// of) the waveform. Y-axis is fixed −50…0 LUFS. Reference lines at −14/−16/−23.
// Integrated LUFS shown as a horizontal dashed line.
//
// ctx       — 2D canvas context (already translated/clipped as needed)
// stBlks    — Float64 array of short-term LUFS values (1 value per second, approx)
// intLUFS   — integrated LUFS string (e.g. "−14.6") or null
// x0        — left edge of drawable area (pixels, in ctx coordinates)
// w         — width of drawable area (pixels)
// topY      — top of drawing area (pixels)
// h         — height of drawing area (pixels)
// dpr       — device pixel ratio (for crisp lines)

function drawLufsEnvelope(ctx, stBlks, intLUFS, x0, w, topY, h, dpr) {
    ctx.save();

    const LUFS_MIN = -50, LUFS_MAX = 0, LUFS_RANGE = LUFS_MAX - LUFS_MIN;
    const lufsToY = v => topY + h * (1 - (Math.max(LUFS_MIN, Math.min(LUFS_MAX, v)) - LUFS_MIN) / LUFS_RANGE);

    // ── Reference lines: −14 (streaming), −16 (podcast), −23 (broadcast) ────
    const refs = [
        { lufs: -14, label: '-14', lineA: 0.28, textA: 0.45 },
        { lufs: -16, label: '-16', lineA: 0.18, textA: 0.32 },
        { lufs: -23, label: '-23', lineA: 0.13, textA: 0.26 },
    ];
    const fs7 = Math.max(7, Math.round(7.5 * dpr));
    ctx.font = fs7 + 'px monospace';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    for (const ref of refs) {
        const ry = lufsToY(ref.lufs);
        ctx.strokeStyle = `rgba(125,232,125,${ref.lineA})`;
        ctx.lineWidth = 0.75 * dpr;
        ctx.setLineDash([4 * dpr, 5 * dpr]);
        ctx.beginPath(); ctx.moveTo(x0, ry); ctx.lineTo(x0 + w, ry); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(125,232,125,${ref.textA})`;
        ctx.fillText(ref.label, x0 + 3 * dpr, ry - 1.5 * dpr);
    }

    // ── Integrated LUFS — dashed horizontal line ──────────────────────────────
    if (intLUFS !== null && intLUFS !== undefined) {
        const iv = parseFloat(intLUFS);
        if (!isNaN(iv)) {
            const iy = lufsToY(iv);
            ctx.setLineDash([6 * dpr, 4 * dpr]);
            ctx.strokeStyle = 'rgba(125,232,125,0.55)';
            ctx.lineWidth = 1.25 * dpr;
            ctx.beginPath(); ctx.moveTo(x0, iy); ctx.lineTo(x0 + w, iy); ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // ── Short-term LUFS envelope ──────────────────────────────────────────────
    if (stBlks && stBlks.length >= 2) {
        const n = stBlks.length;
        // Build (x,y) points spanning x0…x0+w
        const pts = [];
        for (let i = 0; i < n; i++) {
            pts.push({ x: x0 + (i / (n - 1)) * w, y: lufsToY(stBlks[i]) });
        }

        // Filled area
        const fillPath = new Path2D();
        fillPath.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < n; i++) fillPath.lineTo(pts[i].x, pts[i].y);
        fillPath.lineTo(pts[n - 1].x, topY + h);
        fillPath.lineTo(pts[0].x,     topY + h);
        fillPath.closePath();
        ctx.fillStyle = 'rgba(125,232,125,0.18)';
        ctx.fill(fillPath);

        // Stroke top edge
        const linePath = new Path2D();
        linePath.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < n; i++) linePath.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = 'rgba(125,232,125,0.88)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        ctx.stroke(linePath);
    }

    ctx.restore();
}
