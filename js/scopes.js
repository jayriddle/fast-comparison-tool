// Video Scopes — Histogram, Waveform Monitor, Vectorscope
// Pure rendering functions with no app state dependencies.

const _SCOPE_W = 640, _SCOPE_H = 360;
let _scopeOffscreen = null;

function sampleVideoFrame(media) {
    if (!_scopeOffscreen) {
        _scopeOffscreen = document.createElement('canvas');
        _scopeOffscreen.width = _SCOPE_W;
        _scopeOffscreen.height = _SCOPE_H;
    }
    const ctx = _scopeOffscreen.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(media, 0, 0, _SCOPE_W, _SCOPE_H);
    return ctx.getImageData(0, 0, _SCOPE_W, _SCOPE_H);
}

function drawHistogram(imageData, canvas, mode) {
    const w = canvas.clientWidth * devicePixelRatio;
    const h = canvas.clientHeight * devicePixelRatio;
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const pixels = imageData.data;
    const rBins = new Uint32Array(256);
    const gBins = new Uint32Array(256);
    const bBins = new Uint32Array(256);

    for (let i = 0; i < pixels.length; i += 4) {
        rBins[pixels[i]]++;
        gBins[pixels[i + 1]]++;
        bBins[pixels[i + 2]]++;
    }

    const totalPixels = pixels.length / 4;

    if (mode === 'cdf') {
        // Cumulative distribution — running sum normalized to 1.0
        const rCdf = new Float32Array(256);
        const gCdf = new Float32Array(256);
        const bCdf = new Float32Array(256);
        rCdf[0] = rBins[0]; gCdf[0] = gBins[0]; bCdf[0] = bBins[0];
        for (let i = 1; i < 256; i++) {
            rCdf[i] = rCdf[i - 1] + rBins[i];
            gCdf[i] = gCdf[i - 1] + gBins[i];
            bCdf[i] = bCdf[i - 1] + bBins[i];
        }
        for (let i = 0; i < 256; i++) {
            rCdf[i] /= totalPixels;
            gCdf[i] /= totalPixels;
            bCdf[i] /= totalPixels;
        }

        const drawCdf = (cdf, color) => {
            ctx.beginPath();
            for (let i = 0; i < 256; i++) {
                const x = (i / 255) * w;
                const y = h - cdf[i] * h;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5 * devicePixelRatio;
            ctx.stroke();
        };

        drawCdf(rCdf, 'rgba(255, 60, 60, 0.85)');
        drawCdf(gCdf, 'rgba(60, 255, 60, 0.85)');
        drawCdf(bCdf, 'rgba(60, 100, 255, 0.85)');

        // Diagonal reference line (perfectly uniform distribution)
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(w, 0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
    } else {
        // Histogram: RGB or RGB+Luma (log scale)
        let maxLog = 0;
        for (let i = 0; i < 256; i++) {
            const v = Math.max(rBins[i], gBins[i], bBins[i]);
            if (v > 0) { const l = Math.log(v); if (l > maxLog) maxLog = l; }
        }
        if (maxLog === 0) maxLog = 1;

        const drawChannel = (bins, color) => {
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let i = 0; i < 256; i++) {
                const x = (i / 255) * w;
                const y = bins[i] > 0 ? h - (Math.log(bins[i]) / maxLog) * h : h;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        };

        ctx.globalCompositeOperation = 'lighter';
        drawChannel(rBins, 'rgba(255, 40, 40, 0.5)');
        drawChannel(gBins, 'rgba(40, 255, 40, 0.5)');
        drawChannel(bBins, 'rgba(40, 80, 255, 0.5)');
        ctx.globalCompositeOperation = 'source-over';

        if (mode === 'rgb+luma') {
            // Luma overlay as a white stroke line
            const lumaBins = new Uint32Array(256);
            for (let i = 0; i < pixels.length; i += 4) {
                const luma = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
                lumaBins[Math.min(255, luma)]++;
            }
            ctx.beginPath();
            for (let i = 0; i < 256; i++) {
                const x = (i / 255) * w;
                const y = lumaBins[i] > 0 ? h - (Math.log(lumaBins[i]) / maxLog) * h : h;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1.5 * devicePixelRatio;
            ctx.stroke();
        }
    }
}

// Cached buffers for waveform monitor — reused across frames to avoid per-frame GC pressure.
// Reallocated only when canvas dimensions change (rare — only on window resize).
let _wfmBuf = null, _wfmCachedW = 0, _wfmCachedH = 0;
let _wfmHits0 = null, _wfmHits1 = null, _wfmHits2 = null;

function drawWaveformMonitor(imageData, canvas, mode) {
    const w = canvas.clientWidth * devicePixelRatio;
    const h = canvas.clientHeight * devicePixelRatio;
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    const pixels = imageData.data;
    const srcW = imageData.width;
    const srcH = imageData.height;

    // Reallocate cached buffers only when canvas size changes
    if (_wfmCachedW !== w || _wfmCachedH !== h) {
        _wfmBuf   = new ImageData(w, h);
        _wfmHits0 = new Uint16Array(w * h);
        _wfmHits1 = new Uint16Array(w * h);
        _wfmHits2 = new Uint16Array(w * h);
        _wfmCachedW = w;
        _wfmCachedH = h;
    }

    const buf = _wfmBuf;
    const out = buf.data;

    if (mode === 'luma') {
        const hits = _wfmHits0;
        hits.fill(0);
        for (let sx = 0; sx < srcW; sx++) {
            const ox0 = Math.floor((sx / srcW) * w);
            const ox1 = Math.floor(((sx + 1) / srcW) * w);
            for (let sy = 0; sy < srcH; sy++) {
                const idx = (sy * srcW + sx) * 4;
                const luma = (0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]) / 255;
                const oy = Math.floor((1 - luma) * (h - 1));
                for (let ox = ox0; ox < ox1; ox++) {
                    hits[oy * w + ox]++;
                }
            }
        }
        const maxHits = Math.max(1, srcH * 0.02);
        const n = w * h * 4;
        for (let i = 0, p = 0; p < n; i++, p += 4) {
            if (hits[i] > 0) {
                const intensity = Math.min(1, hits[i] / maxHits);
                out[p]     = Math.round(intensity * 80);
                out[p + 1] = Math.round(140 + intensity * 115);
                out[p + 2] = Math.round(intensity * 40);
                out[p + 3] = 255;
            } else {
                out[p] = out[p + 1] = out[p + 2] = out[p + 3] = 0;
            }
        }
    } else if (mode === 'parade') {
        // RGB Parade — three side-by-side waveforms, one per channel
        // Clear the full output buffer up front
        out.fill(0);
        const third = Math.floor(w / 3);
        const channels = [
            { offset: 0, cIdx: 0, color: [255, 60, 60], hits: _wfmHits0 },
            { offset: third, cIdx: 1, color: [60, 255, 60], hits: _wfmHits1 },
            { offset: third * 2, cIdx: 2, color: [60, 100, 255], hits: _wfmHits2 }
        ];
        for (const ch of channels) {
            const cw = ch === channels[2] ? w - ch.offset : third;
            const hits = ch.hits;
            hits.fill(0, 0, cw * h);
            for (let sx = 0; sx < srcW; sx++) {
                const ox0 = Math.floor((sx / srcW) * cw);
                const ox1 = Math.floor(((sx + 1) / srcW) * cw);
                for (let sy = 0; sy < srcH; sy++) {
                    const idx = (sy * srcW + sx) * 4;
                    const val = pixels[idx + ch.cIdx] / 255;
                    const oy = Math.floor((1 - val) * (h - 1));
                    for (let ox = ox0; ox < ox1; ox++) {
                        hits[oy * cw + ox]++;
                    }
                }
            }
            const maxHits = Math.max(1, srcH * 0.02);
            for (let hy = 0; hy < h; hy++) {
                for (let hx = 0; hx < cw; hx++) {
                    const hitVal = hits[hy * cw + hx];
                    if (hitVal > 0) {
                        const intensity = Math.min(1, hitVal / maxHits);
                        const p = (hy * w + ch.offset + hx) * 4;
                        out[p]     = Math.round(intensity * ch.color[0]);
                        out[p + 1] = Math.round(intensity * ch.color[1]);
                        out[p + 2] = Math.round(intensity * ch.color[2]);
                        out[p + 3] = 255;
                    }
                }
            }
        }
    } else {
        // RGB Overlay — all three channels on the same graph in color
        const hitsR = _wfmHits0, hitsG = _wfmHits1, hitsB = _wfmHits2;
        hitsR.fill(0);
        hitsG.fill(0);
        hitsB.fill(0);
        for (let sx = 0; sx < srcW; sx++) {
            const ox0 = Math.floor((sx / srcW) * w);
            const ox1 = Math.floor(((sx + 1) / srcW) * w);
            for (let sy = 0; sy < srcH; sy++) {
                const idx = (sy * srcW + sx) * 4;
                const oyR = Math.floor((1 - pixels[idx] / 255) * (h - 1));
                const oyG = Math.floor((1 - pixels[idx + 1] / 255) * (h - 1));
                const oyB = Math.floor((1 - pixels[idx + 2] / 255) * (h - 1));
                for (let ox = ox0; ox < ox1; ox++) {
                    hitsR[oyR * w + ox]++;
                    hitsG[oyG * w + ox]++;
                    hitsB[oyB * w + ox]++;
                }
            }
        }
        const maxHits = Math.max(1, srcH * 0.02);
        const n = w * h;
        for (let i = 0; i < n; i++) {
            const p = i * 4;
            if (hitsR[i] > 0 || hitsG[i] > 0 || hitsB[i] > 0) {
                out[p]     = Math.min(255, Math.round(Math.min(1, hitsR[i] / maxHits) * 255));
                out[p + 1] = Math.min(255, Math.round(Math.min(1, hitsG[i] / maxHits) * 255));
                out[p + 2] = Math.min(255, Math.round(Math.min(1, hitsB[i] / maxHits) * 255));
                out[p + 3] = 255;
            } else {
                out[p] = out[p + 1] = out[p + 2] = out[p + 3] = 0;
            }
        }
    }

    ctx.putImageData(buf, 0, 0);

    // IRE reference lines on top
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    if (mode === 'parade') {
        // Draw lines across each third + divider lines
        const third = Math.floor(w / 3);
        for (const ire of [0, 25, 50, 75, 100]) {
            const y = Math.round(h - (ire / 100) * h) + 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        for (const x of [third, third * 2]) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, h);
            ctx.stroke();
        }
    } else {
        for (const ire of [0, 25, 50, 75, 100]) {
            const y = Math.round(h - (ire / 100) * h) + 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }
}

// Cached buffers for vectorscope — reused across frames to avoid per-frame GC pressure.
let _vsBuf = null, _vsCachedSize = 0;
let _vsHitR = null, _vsHitG = null, _vsHitB = null, _vsHitN = null;

function drawVectorscope(imageData, canvas) {
    const size = canvas.clientHeight * devicePixelRatio;
    if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
    }
    const ctx = canvas.getContext('2d');

    // Reallocate cached buffers only when canvas size changes
    if (_vsCachedSize !== size) {
        _vsBuf    = new ImageData(size, size);
        _vsHitR   = new Float32Array(size * size);
        _vsHitG   = new Float32Array(size * size);
        _vsHitB   = new Float32Array(size * size);
        _vsHitN   = new Uint16Array(size * size);
        _vsCachedSize = size;
    }

    const buf = _vsBuf;
    const out = buf.data;
    const hitR = _vsHitR, hitG = _vsHitG, hitB = _vsHitB, hitN = _vsHitN;
    hitR.fill(0);
    hitG.fill(0);
    hitB.fill(0);
    hitN.fill(0);

    const cx = size / 2;
    const cy = size / 2;
    const radius = (size / 2) - 4;
    const plotScale = radius / 128;

    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const cb = -0.169 * r - 0.331 * g + 0.500 * b;
        const cr =  0.500 * r - 0.419 * g - 0.081 * b;
        const px = Math.round(cx + cb * plotScale);
        const py = Math.round(cy - cr * plotScale);
        if (px >= 0 && px < size && py >= 0 && py < size) {
            const idx = py * size + px;
            hitR[idx] += r;
            hitG[idx] += g;
            hitB[idx] += b;
            hitN[idx]++;
        }
    }

    // Map accumulated colors to output — boost saturation for visibility
    const maxHits = Math.max(1, pixels.length / 4 * 0.0001);
    const n = size * size;
    for (let i = 0; i < n; i++) {
        const p = i * 4;
        if (hitN[i] > 0) {
            const nv = hitN[i];
            const intensity = Math.min(1, nv / maxHits);
            let ar = hitR[i] / nv, ag = hitG[i] / nv, ab = hitB[i] / nv;
            const maxC = Math.max(ar, ag, ab, 1);
            const boost = 0.4 + 0.6 * intensity;
            out[p]     = Math.round(Math.min(255, (ar / maxC) * 255 * boost));
            out[p + 1] = Math.round(Math.min(255, (ag / maxC) * 255 * boost));
            out[p + 2] = Math.round(Math.min(255, (ab / maxC) * 255 * boost));
            out[p + 3] = 255;
        } else {
            out[p] = out[p + 1] = out[p + 2] = out[p + 3] = 0;
        }
    }

    ctx.putImageData(buf, 0, 0);

    // Draw graticule overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.stroke();

    // Skin tone line
    ctx.strokeStyle = 'rgba(255, 180, 100, 0.25)';
    ctx.beginPath();
    const skinAngle = (123 * Math.PI) / 180;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(skinAngle) * radius, cy - Math.sin(skinAngle) * radius);
    ctx.stroke();

    // Color target labels
    const targets = [
        { label: 'R',  cb: -0.169,  cr:  0.500 },
        { label: 'Y',  cb: -0.437,  cr:  0.081 },
        { label: 'G',  cb: -0.331,  cr: -0.419 },
        { label: 'C',  cb:  0.169,  cr: -0.500 },
        { label: 'B',  cb:  0.437,  cr: -0.081 },
        { label: 'M',  cb:  0.331,  cr:  0.419 },
    ];
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = `${Math.round(size * 0.07)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tScale = radius / 0.55;
    targets.forEach(t => {
        const tx = cx + t.cb * tScale;
        const ty = cy - t.cr * tScale;
        ctx.fillText(t.label, tx, ty);
    });
}
