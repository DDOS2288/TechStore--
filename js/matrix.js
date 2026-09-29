(function () {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;";
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d", { alpha: false });

  const FS   = 15;
  const COLS = 50;
  const GLOW_R = 4;

  let W, H, cols, rows;
  let streams = [];
  let glowMap;
  let cellDelay;
  let cellSpeed;

  let mouseCol = -1, mouseRow = -1;
  let isIdle = false;
  let mouseIdleTimer = null;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cols = COLS;
    rows = Math.ceil(H / FS);
    const sz = cols * rows;
    glowMap   = new Float32Array(sz);
    cellDelay = new Int16Array(sz);
    cellSpeed = new Float32Array(sz);

    const cw = W / cols;
    streams = Array.from({ length: cols }, (_, c) => ({
      col:   c,
      x:     c * cw + cw * 0.5,
      head:  -Math.floor(Math.random() * rows),
      speed: 0.3 + Math.random() * 0.5,
      len:   12 + Math.floor(Math.random() * 16),
      chars: mkChars(40),
    }));
  }

  function mkChars(n) {
    return Array.from({ length: n }, () => Math.random() > 0.5 ? "1" : "0");
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  const getCW = () => W / cols;

  document.addEventListener("mousemove", (e) => {
    mouseCol = Math.floor(e.clientX / getCW());
    mouseRow = Math.floor(e.clientY / FS);
    if (isIdle) { isIdle = false; }
    if (mouseIdleTimer) clearTimeout(mouseIdleTimer);
    mouseIdleTimer = setTimeout(triggerDissolve, 2000);
  }, { passive: true });

  document.addEventListener("mouseleave", () => {
    triggerDissolve();
    mouseCol = -1;
    mouseRow = -1;
  }, { passive: true });

  function triggerDissolve() {
    if (isIdle) return;
    isIdle = true;
    const sz = cols * rows;
    for (let i = 0; i < sz; i++) {
      if (glowMap[i] > 0.02) {
        cellDelay[i] = Math.floor(Math.random() * 130);
        cellSpeed[i] = 0.88 + Math.random() * 0.08;
      }
    }
  }

  function updateGlow() {
    if (!isIdle) {
      if (mouseCol >= 0) {
        const mc = mouseCol, mr = mouseRow;
        for (let dc = -GLOW_R; dc <= GLOW_R; dc++) {
          const c = mc + dc;
          if (c < 0 || c >= cols) continue;
          for (let dr = -GLOW_R; dr <= GLOW_R; dr++) {
            const r = mr + dr;
            if (r < 0 || r >= rows) continue;
            const d = Math.sqrt(dc*dc + dr*dr);
            if (d <= GLOW_R) {
              glowMap[r*cols+c] = Math.min(1, glowMap[r*cols+c] + (1-d/GLOW_R)*0.5);
            }
          }
        }
      }

      for (let c = 1; c < cols-1; c++) {
        for (let r = 1; r < rows-1; r++) {
          const v = glowMap[r*cols+c];
          if (v < 0.30) continue;
          const add = v * 0.07;
          const ni1 = r*cols+c-1, ni2 = r*cols+c+1;
          const ni3 = (r-1)*cols+c, ni4 = (r+1)*cols+c;
          if (glowMap[ni1] < 1) glowMap[ni1] = Math.min(1, glowMap[ni1]+add);
          if (glowMap[ni2] < 1) glowMap[ni2] = Math.min(1, glowMap[ni2]+add);
          if (glowMap[ni3] < 1) glowMap[ni3] = Math.min(1, glowMap[ni3]+add);
          if (glowMap[ni4] < 1) glowMap[ni4] = Math.min(1, glowMap[ni4]+add);
        }
      }

      for (let i = 0; i < glowMap.length; i++) {
        if (glowMap[i] > 0) glowMap[i] *= 0.97;
      }

    } else {
      for (let i = 0; i < glowMap.length; i++) {
        if (glowMap[i] > 0) {
          if (cellDelay[i] > 0) {
            cellDelay[i]--;
          } else {
            glowMap[i] *= (cellSpeed[i] || 0.93);
            if (glowMap[i] < 0.01) glowMap[i] = 0;
          }
        }
      }
    }
  }

  const glowChars = [];

  function draw() {
    updateGlow();

    ctx.fillStyle = "rgba(5,10,5,0.38)";
    ctx.fillRect(0, 0, W, H);

    ctx.font = `bold ${FS}px monospace`;
    ctx.textAlign = "center";

    const cw = W / cols;
    glowChars.length = 0;

    ctx.shadowBlur = 0;
    for (let si = 0; si < streams.length; si++) {
      const s = streams[si];
      s.head += s.speed;
      if (s.head - s.len > rows) {
        s.head = -Math.floor(Math.random() * 5);
        s.speed = 0.3 + Math.random() * 0.5;
        s.len   = 12 + Math.floor(Math.random() * 16);
      }
      if (Math.random() < 0.008) {
        s.chars[Math.floor(Math.random() * s.chars.length)] = Math.random() > 0.5 ? "1" : "0";
      }

      const x = s.col * cw + cw * 0.5;
      const headRow = Math.floor(s.head);

      for (let i = 0; i < s.len; i++) {
        const row = headRow - i;
        if (row < 0 || row >= rows) continue;

        const y   = row * FS + FS;
        const idx = row * cols + s.col;
        const g   = glowMap[idx];
        const ch  = s.chars[i % s.chars.length];

        if (g > 0.05) {
          glowChars.push(x, y, g, ch.charCodeAt(0));
        } else {
          const fade = (s.len - i) / s.len;
          ctx.fillStyle = `rgba(0,${40 + Math.round(fade*70)},0,${0.25 + fade*0.4})`;
          ctx.fillText(ch, x, y);
        }
      }
    }

    ctx.shadowColor = "#39ff14";
    ctx.shadowBlur  = 10;

    for (let i = 0; i < glowChars.length; i += 4) {
      const x  = glowChars[i];
      const y  = glowChars[i+1];
      const g  = glowChars[i+2];
      const ch = String.fromCharCode(glowChars[i+3]);

      const rnd = Math.random() < g ? 1 : g;
      const gr  = Math.round(180 + rnd * 75);
      const r2  = Math.round(rnd * 20);
      const b   = Math.round(rnd * 10);
      ctx.fillStyle = `rgba(${r2},${gr},${b},${0.45 + g * 0.55})`;
      ctx.fillText(ch, x, y);
    }

    ctx.shadowBlur = 0;

    requestAnimationFrame(draw);
  }

  draw();
})();
