import { useEffect, useRef } from "react";
import "./Starfield.css";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const TWINKLE_FRAME_INTERVAL = 50; // ~20fps — twinkling doesn't need 60fps

// Same deterministic layout each generation (seeded PRNG) so a resize
// reshuffles the field instead of producing a random new one each time.
function generateField(w, h) {
  const count = Math.floor((w * h) / 2600);
  let seed = 1337;
  function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * w,
      y: rand() * h,
      r: rand() * 1.1 + 0.3,
      baseOpacity: rand() * 0.6 + 0.15,
      phase: rand() * Math.PI * 2,
      speed: 0.4 + rand() * 0.6,
    });
  }

  const brightCount = Math.max(6, Math.floor(count / 60));
  const brightStars = [];
  for (let j = 0; j < brightCount; j++) {
    brightStars.push({
      x: rand() * w,
      y: rand() * h,
      phase: rand() * Math.PI * 2,
      speed: 0.3 + rand() * 0.4,
    });
  }

  return { stars, brightStars };
}

function drawField(ctx, w, h, field, time, twinkle) {
  ctx.clearRect(0, 0, w, h);

  for (const s of field.stars) {
    const o = twinkle ? s.baseOpacity * (0.6 + 0.4 * Math.sin(time * 0.0012 * s.speed + s.phase)) : s.baseOpacity;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(238, 241, 248, ${Math.max(0, o).toFixed(2)})`;
    ctx.fill();
  }

  for (const b of field.brightStars) {
    const o = twinkle ? 0.55 + 0.35 * Math.sin(time * 0.0012 * b.speed + b.phase) : 0.9;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(238, 241, 248, ${o.toFixed(2)})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(238, 241, 248, ${(o * 0.4).toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b.x - 4, b.y);
    ctx.lineTo(b.x + 4, b.y);
    ctx.moveTo(b.x, b.y - 4);
    ctx.lineTo(b.x, b.y + 4);
    ctx.stroke();
  }
}

// Persistent, fixed-position starfield mounted once at the app root so it
// never restarts or flickers as views switch — every screen shares the
// exact same star field rather than each rendering its own.
function Starfield() {
  const canvasRef = useRef(null);
  const fieldRef = useRef({ stars: [], brightStars: [] });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia && window.matchMedia(REDUCED_MOTION_QUERY).matches;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fieldRef.current = generateField(w, h);
      if (reduceMotion) drawField(ctx, w, h, fieldRef.current, 0, false);
    }

    resize();

    let resizeTimer;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }
    window.addEventListener("resize", handleResize);

    let rafId;
    if (!reduceMotion) {
      let lastFrame = 0;
      const loop = (t) => {
        if (t - lastFrame > TWINKLE_FRAME_INTERVAL) {
          lastFrame = t;
          drawField(ctx, window.innerWidth, window.innerHeight, fieldRef.current, t, true);
        }
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="starfield-root" aria-hidden="true">
      <div className="starfield-nebula"></div>
      <canvas ref={canvasRef} className="starfield-canvas"></canvas>
    </div>
  );
}

export default Starfield;
