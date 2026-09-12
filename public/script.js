(() => {
  "use strict";

  const container = document.querySelector("#renderer");
  const canvas = document.querySelector("#renderer-canvas");
  const fallback = document.querySelector("#renderer-fallback");
  const toggle = document.querySelector("#renderer-toggle");
  const status = document.querySelector("#renderer-status");
  if (!container || !canvas || !fallback || !toggle || !status) return;

  let context;
  let frame = 0;
  let visible = false;
  let initialized = false;
  let failed = false;
  let lastTime = 0;
  let angle = 0.55;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = motion.matches;
  const vertices = [];
  const rings = 24;
  const sides = 12;

  // A compact parametric torus; this demo is independent of the flagship projects.
  for (let ring = 0; ring < rings; ring++) {
    const u = (ring / rings) * Math.PI * 2;
    for (let side = 0; side < sides; side++) {
      const v = (side / sides) * Math.PI * 2;
      const radius = 1.15 + 0.43 * Math.cos(v);
      vertices.push([radius * Math.cos(u), radius * Math.sin(u), 0.43 * Math.sin(v)]);
    }
  }

  function fail() {
    failed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.hidden = true;
    toggle.hidden = true;
    fallback.hidden = false;
    status.textContent = "Static preview. Live rendering is unavailable in this browser.";
  }

  function draw() {
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const tilt = 0.9;
    const projected = vertices.map(([x, y, z]) => {
      const rx = x * cos - z * sin;
      const rz = x * sin + z * cos;
      const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
      const depth = y * Math.sin(tilt) + rz * Math.cos(tilt) + 5;
      // Geometry remains in front of the camera; no near-plane clipping is needed.
      const scale = height * 1.05 / depth;
      return [width / 2 + rx * scale, height / 2 + ry * scale, depth];
    });
    context.lineWidth = Math.max(0.8, width / 560);
    for (let ring = 0; ring < rings; ring++) {
      for (let side = 0; side < sides; side++) {
        const index = ring * sides + side;
        const point = projected[index];
        context.strokeStyle = `rgba(120, 131, 75, ${0.24 + (7 - point[2]) * 0.16})`;
        context.beginPath();
        for (const neighbor of [ring * sides + (side + 1) % sides, ((ring + 1) % rings) * sides + side]) {
          context.moveTo(point[0], point[1]);
          context.lineTo(projected[neighbor][0], projected[neighbor][1]);
        }
        context.stroke();
      }
    }
  }

  function resize() {
    if (!initialized || failed) return;
    try {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      if (canvas.width !== width) {
        canvas.width = width;
        canvas.height = Math.round(width * 5 / 8);
      }
      draw();
    } catch { fail(); }
  }

  function tick(time) {
    frame = 0;
    if (failed || paused || !visible || document.hidden) return;
    try {
      if (lastTime) angle += Math.min((time - lastTime) / 1000, 0.05) * 0.35;
      lastTime = time;
      draw();
      frame = requestAnimationFrame(tick);
    } catch { fail(); }
  }

  function sync() {
    if (!initialized || failed) return;
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    toggle.textContent = paused ? "Resume animation" : "Pause animation";
    status.textContent = paused
      ? "Animation paused. The geometry remains visible."
      : "Animation pauses automatically when offscreen or in a hidden tab.";
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function initialize() {
    if (initialized || failed) return;
    try {
      context = canvas.getContext("2d");
      if (!context) return fail();
      initialized = true;
      canvas.hidden = false;
      resize();
      if (failed) return;
      fallback.hidden = true;
      toggle.hidden = false;
    } catch { fail(); }
  }

  toggle.addEventListener("click", () => { paused = !paused; sync(); });
  document.addEventListener("visibilitychange", sync);
  motion.addEventListener("change", () => { paused = motion.matches; sync(); });
  window.addEventListener("resize", resize);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) initialize();
      sync();
    });
    observer.observe(canvas.parentElement);
  }
  // Without IntersectionObserver, retain the static, zero-animation fallback.
})();
