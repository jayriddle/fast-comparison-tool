// Starfield drop-zone border animation
// Uses OffscreenCanvas + Web Worker so animation continues during main-thread work.
// Falls back to main-thread canvas for browsers without OffscreenCanvas support.
(function initStarfield() {
    const canvas = document.getElementById('dropzoneStarfield');
    if (!canvas) return;
    const landing = document.getElementById('landingCta');

    // Shared drawing code (runs in worker or main thread)
    const DRAW_CODE = `
        // Polyfill roundRect for Safari < 16.4
        if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
                r = Math.min(r, w / 2, h / 2);
                this.moveTo(x + r, y);
                this.arcTo(x + w, y, x + w, y + h, r);
                this.arcTo(x + w, y + h, x, y + h, r);
                this.arcTo(x, y + h, x, y, r);
                this.arcTo(x, y, x + w, y, r);
                this.closePath();
            };
        }
        // OffscreenCanvasRenderingContext2D for worker path
        if (typeof OffscreenCanvasRenderingContext2D !== 'undefined' && !OffscreenCanvasRenderingContext2D.prototype.roundRect) {
            OffscreenCanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
                r = Math.min(r, w / 2, h / 2);
                this.moveTo(x + r, y);
                this.arcTo(x + w, y, x + w, y + h, r);
                this.arcTo(x + w, y + h, x, y + h, r);
                this.arcTo(x, y + h, x, y, r);
                this.arcTo(x, y, x + w, y, r);
                this.closePath();
            };
        }
        const STAR_COUNT = 300;
        const RADIUS = 16;
        const SPEED_MIN = 0.0005;
        const SPEED_MAX = 0.003;
        let speedMult = 1, speedTarget = 1;
        let stars = [], w = 0, h = 0, dpr = 1, running = false;
        let ctx, vignette;

        function spawnStar(fromCenter) {
            return {
                angle: Math.random() * Math.PI * 2,
                depth: fromCenter ? 0 : Math.random(),
                speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
                brightness: 0.4 + Math.random() * 0.6,
                hue: 200 + Math.random() * 40
            };
        }
        function initStars() {
            stars = [];
            for (let i = 0; i < STAR_COUNT; i++) stars.push(spawnStar(false));
        }
        function rebuildVignette() {
            vignette = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.6);
            vignette.addColorStop(0, 'rgba(0,0,0,0.3)');
            vignette.addColorStop(0.2, 'rgba(0,0,0,0.08)');
            vignette.addColorStop(0.4, 'rgba(0,0,0,0)');
            vignette.addColorStop(1, 'rgba(0,0,0,0)');
        }
        function draw() {
            if (!running) return;
            // Ramp speed
            const diff = speedTarget - speedMult;
            if (Math.abs(diff) > 0.02) speedMult += diff * (diff > 0 ? 0.08 : 0.12);
            else speedMult = speedTarget;

            ctx.clearRect(0, 0, w, h);
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0, 0, w, h, RADIUS);
            ctx.clip();
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);

            const cx = w/2, cy = h/2, maxR = Math.sqrt(cx*cx + cy*cy);
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                s.depth += s.speed * speedMult;
                if (s.depth > 1) { stars[i] = spawnStar(true); continue; }
                const r = s.depth * maxR;
                const x = cx + Math.cos(s.angle) * r;
                const y = cy + Math.sin(s.angle) * r;
                const trail = s.depth * s.speed * speedMult * maxR * 4;
                const x0 = cx + Math.cos(s.angle) * Math.max(0, r - trail);
                const y0 = cy + Math.sin(s.angle) * Math.max(0, r - trail);
                const alpha = s.brightness * Math.min(1, s.depth * 2.5) * (0.3 + s.depth * 0.7);
                const thickness = 0.3 + s.depth * 2;
                ctx.strokeStyle = 'hsla(' + s.hue + ',70%,' + (70 + s.depth * 30) + '%,' + alpha + ')';
                ctx.lineWidth = thickness;
                ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
                if (s.depth > 0.6) {
                    ctx.fillStyle = 'hsla(' + s.hue + ',40%,95%,' + (alpha * 0.8) + ')';
                    ctx.beginPath(); ctx.arc(x, y, thickness * 0.6, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
            requestAnimationFrame(draw);
        }
    `;

    // --- Worker path ---
    let worker = null;
    const useWorker = typeof canvas.transferControlToOffscreen === 'function';

    if (useWorker) {
        const workerCode = DRAW_CODE + `
            let offscreen;
            self.onmessage = function(e) {
                const msg = e.data;
                if (msg.type === 'init') {
                    offscreen = msg.canvas;
                    dpr = msg.dpr;
                    w = msg.w; h = msg.h;
                    offscreen.width = w * dpr; offscreen.height = h * dpr;
                    ctx = offscreen.getContext('2d');
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    rebuildVignette(); initStars();
                } else if (msg.type === 'resize') {
                    w = msg.w; h = msg.h; dpr = msg.dpr;
                    offscreen.width = w * dpr; offscreen.height = h * dpr;
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    rebuildVignette();
                } else if (msg.type === 'start') {
                    if (!running) { running = true; draw(); }
                } else if (msg.type === 'stop') {
                    running = false;
                } else if (msg.type === 'speed') {
                    speedTarget = msg.value;
                }
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(blob));
        const offscreen = canvas.transferControlToOffscreen();
        const rect = canvas.parentElement.getBoundingClientRect();
        worker.postMessage({
            type: 'init', canvas: offscreen,
            w: rect.width, h: rect.height,
            dpr: window.devicePixelRatio || 1
        }, [offscreen]);

        window.addEventListener('resize', () => {
            const r = canvas.parentElement.getBoundingClientRect();
            worker.postMessage({ type: 'resize', w: r.width, h: r.height, dpr: window.devicePixelRatio || 1 });
        });

        window._starfieldSetSpeed = function(mult) {
            worker.postMessage({ type: 'speed', value: mult });
        };
        window._starfieldSetVisible = function(vis) {
            worker.postMessage({ type: vis ? 'start' : 'stop' });
        };

        const obs = new MutationObserver(() => {
            worker.postMessage({ type: landing.classList.contains('hidden') ? 'stop' : 'start' });
        });
        obs.observe(landing, { attributes: true, attributeFilter: ['class'] });
        if (!landing.classList.contains('hidden')) worker.postMessage({ type: 'start' });

    } else {
        // --- Fallback: main-thread rendering ---
        const ctx = canvas.getContext('2d');
        let w, h, vignette, stars = [], animId = null;
        let speedMult = 1, speedTarget = 1, running = false;
        const STAR_COUNT = 300, RADIUS = 16, SPEED_MIN = 0.0005, SPEED_MAX = 0.003;

        // Inline the helpers for fallback (same logic as DRAW_CODE)
        function spawnStar(fromCenter) {
            return { angle: Math.random()*Math.PI*2, depth: fromCenter?0:Math.random(),
                speed: SPEED_MIN+Math.random()*(SPEED_MAX-SPEED_MIN),
                brightness: 0.4+Math.random()*0.6, hue: 200+Math.random()*40 };
        }
        function initStars() { stars=[]; for(let i=0;i<STAR_COUNT;i++) stars.push(spawnStar(false)); }
        function rebuildVignette() {
            vignette=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*0.6);
            vignette.addColorStop(0,'rgba(0,0,0,0.3)'); vignette.addColorStop(0.2,'rgba(0,0,0,0.08)');
            vignette.addColorStop(0.4,'rgba(0,0,0,0)'); vignette.addColorStop(1,'rgba(0,0,0,0)');
        }
        function resize() {
            const rect=canvas.parentElement.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
            w=rect.width; h=rect.height; canvas.width=w*dpr; canvas.height=h*dpr;
            ctx.setTransform(dpr,0,0,dpr,0,0); rebuildVignette();
        }
        function draw() {
            if (!running) { animId=null; return; }
            const diff=speedTarget-speedMult;
            if(Math.abs(diff)>0.02) speedMult+=diff*(diff>0?0.08:0.12); else speedMult=speedTarget;
            ctx.clearRect(0,0,w,h); ctx.save();
            ctx.beginPath(); ctx.roundRect(0,0,w,h,RADIUS); ctx.clip();
            ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h);
            const cx=w/2,cy=h/2,maxR=Math.sqrt(cx*cx+cy*cy);
            for(let i=0;i<stars.length;i++){
                const s=stars[i]; s.depth+=s.speed*speedMult;
                if(s.depth>1){stars[i]=spawnStar(true);continue;}
                const r=s.depth*maxR,x=cx+Math.cos(s.angle)*r,y=cy+Math.sin(s.angle)*r;
                const trail=s.depth*s.speed*speedMult*maxR*4;
                const x0=cx+Math.cos(s.angle)*Math.max(0,r-trail),y0=cy+Math.sin(s.angle)*Math.max(0,r-trail);
                const alpha=s.brightness*Math.min(1,s.depth*2.5)*(0.3+s.depth*0.7),thickness=0.3+s.depth*2;
                ctx.strokeStyle='hsla('+s.hue+',70%,'+(70+s.depth*30)+'%,'+alpha+')';
                ctx.lineWidth=thickness; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x,y); ctx.stroke();
                if(s.depth>0.6){ctx.fillStyle='hsla('+s.hue+',40%,95%,'+(alpha*0.8)+')';
                ctx.beginPath();ctx.arc(x,y,thickness*0.6,0,Math.PI*2);ctx.fill();}
            }
            ctx.fillStyle=vignette; ctx.fillRect(0,0,w,h); ctx.restore();
            animId=requestAnimationFrame(draw);
        }
        function start() { if(running)return; resize(); if(!stars.length)initStars(); running=true; draw(); }
        function stop() { running=false; }

        window._starfieldSetSpeed = function(mult) { speedTarget = mult; };
        window._starfieldSetVisible = function(vis) { if(vis) start(); else stop(); };
        const obs = new MutationObserver(() => {
            if(landing.classList.contains('hidden')) stop(); else start();
        });
        obs.observe(landing, { attributes: true, attributeFilter: ['class'] });
        window.addEventListener('resize', () => { if(running) resize(); });
        if (!landing.classList.contains('hidden')) start();
    }
})();
