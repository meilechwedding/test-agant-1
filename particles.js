/* MOSTAI hero wave field.
   A coordinated wave of identical small balls — same color, same size — moving in unison.
   Three wave styles selectable via window.__mostai_wave: 'ocean' | 'ripple' | 'orbit'.
   Soft variant for inner pages: same engine, fewer points, lower opacity, slower.
*/
(function(){
  function rgb(){
    const v = getComputedStyle(document.documentElement).getPropertyValue('--sky').trim() || '#5E94D4';
    const m = v.replace('#','').padEnd(6,'0');
    const n = m.length === 3 ? m.split('').map(c=>c+c).join('') : m;
    const i = parseInt(n,16);
    return [(i>>16)&255,(i>>8)&255,i&255];
  }

  function makeField(canvas, opts){
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    let W=0, H=0, dots=[];

    function resize(){
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W*dpr; canvas.height = H*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      seed();
    }

    function seed(){
      const cfg = getCfg();
      // Build a regular grid (this is what makes the wave look coordinated)
      const cols = Math.ceil(Math.sqrt((W*H) / cfg.spacing / cfg.spacing) * (W/H > 1 ? 1.3 : 0.9));
      const rows = Math.ceil(cols * (H/W));
      const stepX = W / cols;
      const stepY = H / rows;
      dots = [];
      for (let r=0; r<=rows; r++){
        for (let c=0; c<=cols; c++){
          const bx = c * stepX + (r % 2) * stepX * 0.5;
          const by = r * stepY;
          dots.push({ bx, by, gx: c, gy: r });
        }
      }
    }

    function getCfg(){
      if (opts.role === 'soft') return CFG.soft;
      const w = window.__mostai_wave || 'orbit';
      const base = CFG[w] || CFG.orbit;
      const t = window.__mostai_wave_tweaks || {};
      // multipliers (defaults = 1)
      const density = t.density != null ? t.density : 1;   // 0.5 .. 2
      const strength= t.strength!= null ? t.strength: 1;   // 0.4 .. 2
      const speed   = t.speed   != null ? t.speed   : 1;   // 0.3 .. 2.5
      const visibility = t.visibility != null ? t.visibility : 1; // 0.3 .. 2
      const size    = t.size    != null ? t.size    : 1;   // 0.6 .. 2
      return {
        ...base,
        spacing:    Math.max(8, base.spacing / density),
        amp:        base.amp * strength,
        speed:      base.speed * speed,
        alpha:      Math.min(1, base.alpha * visibility),
        r:          Math.max(0.4, base.r * size)
      };
    }

    function frame(t){
      const cfg = getCfg();
      ctx.clearRect(0,0,W,H);
      if (!dots.length) { requestAnimationFrame(frame); return; }
      const [R,G,B] = rgb();
      const ts = t * 0.001;
      const cx = W/2, cy = H/2;

      for (const d of dots){
        let dx=0, dy=0;
        if (cfg.style === 'ocean'){
          // sweep wave: traveling wave across X, gentle Y
          const phase = (d.bx / cfg.wavelength) + ts * cfg.speed;
          dy = Math.sin(phase) * cfg.amp;
          dx = Math.cos(phase * 0.7 + d.gy*0.4) * (cfg.amp * 0.4);
        } else if (cfg.style === 'ripple'){
          // radial ripple from center
          const rx = d.bx - cx, ry = d.by - cy;
          const dist = Math.sqrt(rx*rx + ry*ry);
          const wave = Math.sin(dist / cfg.wavelength - ts * cfg.speed);
          const dirx = rx / (dist+0.001), diry = ry / (dist+0.001);
          dx = dirx * wave * cfg.amp;
          dy = diry * wave * cfg.amp;
        } else if (cfg.style === 'orbit'){
          // each ball orbits its base point in a small circle, phase from grid
          const phase = ts * cfg.speed + (d.gx * 0.35 + d.gy * 0.45);
          dx = Math.cos(phase) * cfg.amp;
          dy = Math.sin(phase) * cfg.amp;
        }

        const x = d.bx + dx;
        const y = d.by + dy;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${R},${G},${B},${cfg.alpha})`;
        ctx.arc(x, y, cfg.r, 0, Math.PI*2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);
    return { reseed: seed };
  }

  // Identical-ball presets — uniform color/size, the variation comes from motion.
  // The 'orbit' preset bakes the previous TWEAK_DEFAULTS multipliers (density 2.5,
  // strength 2, speed 3, visibility 1, size 1.4) directly into the base values, so
  // no JS tweaks are required at runtime.
  //   spacing  = baseSpacing / density   →  36 / 2.5 ≈ 14.4
  //   amp      = baseAmp     * strength  →   4 *  2  =  8
  //   speed    = baseSpeed   * speedMul  →  0.7 * 3  ≈ 2.1
  //   alpha    = baseAlpha   * visibility→  0.28*  1 ≈ 0.28
  //   r        = baseR       * size      →  1.0 * 1.4=  1.4
  // Soft variant (inner pages) now uses the orbit motion + same fade as hero.
  const CFG = {
    ocean:   { style:'ocean',  spacing:32,   r:1.1, alpha:0.32, amp:9,  wavelength:80, speed:1.0 },
    ripple:  { style:'ripple', spacing:32,   r:1.1, alpha:0.32, amp:8,  wavelength:48, speed:1.2 },
    // Calmer orbit: smaller dots, wider spacing, slower speed, lower opacity.
    // Atmosphere, not screensaver.
    orbit:   { style:'orbit',  spacing:30,   r:0.9, alpha:0.14, amp:6,  wavelength:1,  speed:0.7 },
    soft:    { style:'orbit',  spacing:18,   r:1.2, alpha:0.16, amp:6,  wavelength:1,  speed:1.6 }
  };

  const heroCanvas = document.getElementById('particles');
  if (heroCanvas) {
    const f = makeField(heroCanvas, { role: 'hero' });
    window.__mostai_reseed = f.reseed;
  }
  const softCanvas = document.getElementById('particles-soft');
  if (softCanvas) {
    makeField(softCanvas, { role: 'soft' });
  }
})();
