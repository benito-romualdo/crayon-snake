import { useState, useEffect, useCallback, useRef } from "react";
import BackButton from "../components/BackButton";

/* ── Constants ── */
const CANVAS_W = 400;
const CANVAS_H = 600;
const GRAVITY = 0.10;
const FLAP_FORCE = -3.5;
const MAX_FALL_SPEED = 4;
const PLANE_X = 80;
const PLANE_W = 36;
const PLANE_H = 24;
const HITBOX_SCALE = 0.7;
const PIPE_W = 52;
const PIPE_GAP = 175;
const PIPE_GAP_MIN = 130;
const PIPE_GAP_SHRINK = 1;
const PIPE_SPEED = 2.5;
const PIPE_SPACING = 280;
const STAR_SIZE = 20;
const STAR_CHANCE = 0.6;
const TRAIL_MAX = 150;

const COLORS = [
  { name: "Rojo", body: "#e63946", tip: "#c1121f", shade: "#a4161a" },
  { name: "Azul", body: "#2196F3", tip: "#1565C0", shade: "#0D47A1" },
  { name: "Verde", body: "#4caf50", tip: "#2e7d32", shade: "#1b5e20" },
  { name: "Naranja", body: "#ff9800", tip: "#e65100", shade: "#bf360c" },
  { name: "Morado", body: "#9c27b0", tip: "#6a1b9a", shade: "#4a148c" },
  { name: "Rosa", body: "#e91e8c", tip: "#c2185b", shade: "#880e4f" },
];

/* ── Grace period (frames) before pipes can kill ── */
const GRACE_FRAMES = 120; // ~2 s at 60 fps

/* ── CSS keyframes ── */
const css = `
@keyframes rainbow{0%{color:#e63946}16%{color:#ff9800}33%{color:#4caf50}50%{color:#2196F3}66%{color:#9c27b0}83%{color:#e91e8c}100%{color:#e63946}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes wobble{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes countPop{0%{transform:scale(2);opacity:0}40%{opacity:1}100%{transform:scale(1);opacity:1}}
`;

/* ── Canvas drawing helpers ── */

function drawBackground(ctx, scrollX) {
  // Base color
  ctx.fillStyle = "#fef9ef";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Layer 1 (far): horizontal notebook lines at 0.3x parallax
  ctx.strokeStyle = "rgba(180,210,240,0.15)";
  ctx.lineWidth = 0.5;
  const offset1 = (scrollX * 0.3) % 20;
  for (let y = 0; y < CANVAS_H; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }

  // Layer 2 (near): grid at 0.6x parallax
  ctx.strokeStyle = "rgba(180,210,240,0.10)";
  const offset2 = (scrollX * 0.6) % 20;
  for (let y = 0; y < CANVAS_H; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }
  for (let x = -offset2; x < CANVAS_W; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }

  // Red margin line (fixed)
  ctx.strokeStyle = "rgba(220,80,80,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 0);
  ctx.lineTo(60, CANVAS_H);
  ctx.stroke();
  ctx.strokeStyle = "rgba(220,80,80,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(63, 0);
  ctx.lineTo(63, CANVAS_H);
  ctx.stroke();

  // Floor and ceiling borders
  ctx.fillStyle = "rgba(160,130,100,0.25)";
  ctx.fillRect(0, 0, CANVAS_W, 4);
  ctx.fillRect(0, CANVAS_H - 4, CANVAS_W, 4);
}

function drawPipe(ctx, pipe, isTop) {
  const col = pipe.color;
  const x = pipe.x;
  let y, h, tipDir;

  if (isTop) {
    y = 0;
    h = pipe.topH;
    tipDir = 1; // tip points down
  } else {
    y = pipe.topH + pipe.gap;
    h = CANVAS_H - y;
    tipDir = -1; // tip points up
  }

  if (h <= 12) return;

  const tipH = 12;
  const bodyH = h - tipH;

  ctx.save();

  // Body
  const bodyY = isTop ? y : y + tipH;
  ctx.fillStyle = col.body;
  ctx.fillRect(x + 2, bodyY, PIPE_W - 4, bodyH);

  // Gradient shine on body
  const grad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
  grad.addColorStop(0, "rgba(255,255,255,0.18)");
  grad.addColorStop(0.4, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.10)");
  ctx.fillStyle = grad;
  ctx.fillRect(x + 2, bodyY, PIPE_W - 4, bodyH);

  // Wrapper / label section (white band)
  const wrapY = isTop ? bodyY + bodyH - 30 : bodyY;
  const wrapH = Math.min(30, bodyH);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(x + 4, wrapY, PIPE_W - 8, wrapH);
  // "CRAYON" text on wrapper
  ctx.save();
  ctx.fillStyle = col.shade;
  ctx.font = "bold 7px sans-serif";
  ctx.textAlign = "center";
  ctx.globalAlpha = 0.4;
  ctx.fillText("CRAYON", x + PIPE_W / 2, wrapY + wrapH / 2 + 2.5);
  ctx.restore();

  // Tip (triangle)
  const tipBaseY = isTop ? y + bodyH : y + tipH;
  const tipPointY = isTop ? y + bodyH + tipH : y;
  ctx.fillStyle = col.tip;
  ctx.beginPath();
  ctx.moveTo(x + 6, tipBaseY);
  ctx.lineTo(x + PIPE_W - 6, tipBaseY);
  ctx.lineTo(x + PIPE_W / 2, tipPointY);
  ctx.closePath();
  ctx.fill();

  // Slight outline
  ctx.strokeStyle = col.shade;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  ctx.strokeRect(x + 2, bodyY, PIPE_W - 4, bodyH);
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawPlane(ctx, planeY, vy, color) {
  ctx.save();
  const cx = PLANE_X + PLANE_W / 2;
  const cy = planeY + PLANE_H / 2;
  const rotation = Math.max(-30, Math.min(60, vy * 3)) * Math.PI / 180;

  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // Paper airplane shape (pointing right)
  // Main body triangle
  ctx.beginPath();
  ctx.moveTo(PLANE_W / 2, 0);           // nose
  ctx.lineTo(-PLANE_W / 2, -PLANE_H / 2); // top back
  ctx.lineTo(-PLANE_W / 4, 0);          // center notch
  ctx.lineTo(-PLANE_W / 2, PLANE_H / 2);  // bottom back
  ctx.closePath();
  ctx.fillStyle = `rgba(255,255,255,0.95)`;
  ctx.fill();
  ctx.strokeStyle = color.body;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center fold line
  ctx.beginPath();
  ctx.moveTo(PLANE_W / 2, 0);
  ctx.lineTo(-PLANE_W / 4, 0);
  ctx.strokeStyle = color.tip;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Wing fold line (upper)
  ctx.beginPath();
  ctx.moveTo(PLANE_W / 4, -2);
  ctx.lineTo(-PLANE_W / 3, -PLANE_H / 3);
  ctx.strokeStyle = color.body;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.3;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawTrail(ctx, trail, color) {
  if (trail.length < 2) return;
  ctx.save();

  for (let i = 1; i < trail.length; i++) {
    const t = 1 - i / trail.length;
    const p0 = trail[i - 1];
    const p1 = trail[i];
    // wobble for crayon texture
    const wobX = Math.sin(i * 0.8) * 1.2;
    const wobY = Math.cos(i * 1.1) * 1.2;

    ctx.beginPath();
    ctx.moveTo(p0.x + wobX, p0.y + wobY);
    ctx.lineTo(p1.x - wobX, p1.y - wobY);
    ctx.strokeStyle = color.body;
    ctx.globalAlpha = t * 0.5;
    ctx.lineWidth = Math.max(1, t * 6);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawStar(ctx, star, frameCount) {
  if (star.collected) return;
  ctx.save();
  const pulse = 1 + Math.sin(frameCount * 0.1 + star.x) * 0.15;
  const rot = frameCount * 0.03 + star.x * 0.1;
  ctx.translate(star.x, star.y);
  ctx.rotate(rot);
  ctx.scale(pulse, pulse);

  // 5-pointed star
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const r = STAR_SIZE / 2;
    const method = i === 0 ? "moveTo" : "lineTo";
    ctx[method](Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fillStyle = "#ffd700";
  ctx.fill();
  ctx.strokeStyle = "#e6a800";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner glow
  ctx.fillStyle = "rgba(255,255,200,0.5)";
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillRect(-3, -2, 6, 4);
    ctx.restore();
  }
}

function drawHUD(ctx, score, stars, best, playing) {
  ctx.save();
  // Score (big, centered)
  ctx.font = "bold 36px 'Fredoka One', cursive, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillText(score, CANVAS_W / 2 + 2, 50 + 2);
  ctx.fillStyle = "#333";
  ctx.fillText(score, CANVAS_W / 2, 50);

  // Stars (left)
  ctx.font = "16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#e6a800";
  ctx.fillText("\u2605 " + stars, 12, 30);

  // Best (right, only when not playing)
  if (!playing) {
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "#999";
    ctx.fillText("Best: " + best, CANVAS_W - 12, 30);
  }

  ctx.restore();
}

/* ── Spawn helpers ── */
function spawnConfetti(x, y) {
  const particles = [];
  const confettiColors = ["#e63946", "#ff9800", "#4caf50", "#2196F3", "#9c27b0", "#e91e8c", "#ffd700"];
  for (let i = 0; i < 8; i++) {
    particles.push({
      x, y: y + (Math.random() - 0.5) * 40,
      vx: -Math.random() * 2 - 1,
      vy: (Math.random() - 0.5) * 4,
      life: 30 + Math.random() * 15,
      maxLife: 45,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      rot: Math.random() * Math.PI * 2,
    });
  }
  return particles;
}

function spawnFlapParticle(planeY, color) {
  return {
    x: PLANE_X,
    y: planeY + PLANE_H / 2,
    vx: -Math.random() * 2 - 0.5,
    vy: (Math.random() - 0.5) * 2,
    life: 15,
    maxLife: 15,
    color: color.body + "88",
    rot: Math.random() * Math.PI * 2,
  };
}

/* ── Component ── */
export default function CrayonFlappy({ onBack }) {
  const [gameState, setGameState] = useState("idle");
  const [countdown, setCountdown] = useState(null); // 3 | 2 | 1 | null
  const [score, setScore] = useState(0);
  const [starCount, setStarCount] = useState(0);
  const [best, setBest] = useState(() => {
    try { return JSON.parse(localStorage.getItem("flappy-best") || "0"); } catch { return 0; }
  });
  const [selectedColor, setSelectedColor] = useState(0);

  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const gsRef = useRef("idle");
  const colorRef = useRef(COLORS[0]);
  const rafRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { gsRef.current = gameState; }, [gameState]);
  useEffect(() => { colorRef.current = COLORS[selectedColor]; }, [selectedColor]);

  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  function initGame() {
    return {
      plane: { y: CANVAS_H / 2 - PLANE_H / 2, vy: 0 },
      pipes: [],
      trail: [],
      stars: [],
      particles: [],
      scrollX: 0,
      frameCount: 0,
      score: 0,
      starCount: 0,
      pipeGap: PIPE_GAP,
      lastPipeX: CANVAS_W + 100,
      graceFrames: GRACE_FRAMES, // immunity frames at start
    };
  }

  // Kick off the 3-2-1 countdown, then transition to "playing"
  const beginCountdown = useCallback(() => {
    if (gsRef.current === "countdown" || gsRef.current === "playing") return;
    // Pre-initialise game state so canvas keeps rendering the idle plane
    const g = initGame();
    gameRef.current = g;
    gsRef.current = "countdown";
    setGameState("countdown");
    setScore(0);
    setStarCount(0);

    let count = 3;
    setCountdown(count);

    countdownTimerRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
        // Give the plane an upward boost so it starts mid-air
        if (gameRef.current) gameRef.current.plane.vy = FLAP_FORCE;
        gsRef.current = "playing";
        setGameState("playing");
      }
    }, 1000);
  }, []);

  const startGame = useCallback(() => {
    // Clear any running countdown
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    const g = initGame();
    gameRef.current = g;
    gsRef.current = "playing"; // sync immediately for game loop
    setCountdown(null);
    setScore(0);
    setStarCount(0);
    setGameState("playing");
  }, []);

  const gameOver = useCallback(() => {
    if (gsRef.current === "over") return; // prevent double-call
    const g = gameRef.current;
    if (!g) return;
    gsRef.current = "over"; // sync immediately
    setScore(g.score);
    setStarCount(g.starCount);
    setBest(prev => {
      const newBest = Math.max(prev, g.score);
      try { localStorage.setItem("flappy-best", JSON.stringify(newBest)); } catch {}
      return newBest;
    });
    setGameState("over");
  }, []);

  const flap = useCallback(() => {
    if (gsRef.current === "idle") {
      beginCountdown();
      return; // don't apply force yet; player will flap on their own
    }
    if (gsRef.current === "over") return;
    const g = gameRef.current;
    if (!g) return;
    g.plane.vy = FLAP_FORCE;
    g.particles.push(spawnFlapParticle(g.plane.y, colorRef.current));
  }, [beginCountdown]);

  // Input handlers
  useEffect(() => {
    function onKey(e) {
      if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        flap();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  const handleClick = useCallback((e) => {
    e.preventDefault();
    flap();
  }, [flap]);

  const handleTouch = useCallback((e) => {
    e.preventDefault();
    flap();
  }, [flap]);

  // Game loop
  useEffect(() => {
    if (!gameRef.current) gameRef.current = initGame();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function loop() {
      const g = gameRef.current;
      const gs = gsRef.current;
      const playing = gs === "playing";
      const countdown = gs === "countdown";
      const color = colorRef.current;

      if (playing || countdown) {
        // Physics: gravity only active while playing (not during countdown)
        if (playing) {
          g.plane.vy += GRAVITY;
          if (g.plane.vy > MAX_FALL_SPEED) g.plane.vy = MAX_FALL_SPEED;
          g.plane.y += g.plane.vy;
        }

        // Scroll
        g.scrollX += PIPE_SPEED;

        if (playing) {
          // Move pipes left
          for (const pipe of g.pipes) pipe.x -= PIPE_SPEED;
          for (const star of g.stars) star.x -= PIPE_SPEED;

          // Generate new pipes
          const rightmostPipe = g.pipes.length > 0 ? Math.max(...g.pipes.map(p => p.x)) : 0;
          if (g.pipes.length === 0 || rightmostPipe < CANVAS_W - PIPE_SPACING) {
            const gap = Math.max(PIPE_GAP_MIN, PIPE_GAP - g.score * PIPE_GAP_SHRINK);
            const minTop = 60;
            const maxTop = CANVAS_H - gap - 60;
            const topH = minTop + Math.random() * (maxTop - minTop);
            const newPipe = {
              x: CANVAS_W + 20,
              topH,
              gap,
              color: COLORS[Math.floor(Math.random() * COLORS.length)],
              scored: false,
            };
            g.pipes.push(newPipe);
            g.pipeGap = gap;

            // Maybe spawn star in the gap
            if (Math.random() < STAR_CHANCE) {
              g.stars.push({
                x: CANVAS_W + 20 + PIPE_W / 2,
                y: topH + gap / 2 + (Math.random() - 0.5) * (gap * 0.4),
                collected: false,
              });
            }
          }

          // Remove offscreen pipes/stars
          g.pipes = g.pipes.filter(p => p.x + PIPE_W > -20);
          g.stars = g.stars.filter(s => s.x > -STAR_SIZE && !s.collected);

          // Scoring
          for (const pipe of g.pipes) {
            if (!pipe.scored && pipe.x + PIPE_W < PLANE_X) {
              pipe.scored = true;
              g.score++;
              // Confetti
              g.particles.push(...spawnConfetti(PLANE_X + PLANE_W, g.plane.y + PLANE_H / 2));
            }
          }

          // Star collection
          for (const star of g.stars) {
            if (star.collected) continue;
            const dx = (PLANE_X + PLANE_W / 2) - star.x;
            const dy = (g.plane.y + PLANE_H / 2) - star.y;
            if (Math.abs(dx) < PLANE_W / 2 + STAR_SIZE / 2 && Math.abs(dy) < PLANE_H / 2 + STAR_SIZE / 2) {
              star.collected = true;
              g.starCount++;
            }
          }

          // Count down grace frames
          if (g.graceFrames > 0) g.graceFrames--;

          // Collision: ceiling / floor (always active)
          if (g.plane.y < 0 || g.plane.y + PLANE_H > CANVAS_H) {
            gameOver();
          }

          // Collision: pipes (hitbox reduced) — skipped during grace period
          if (g.graceFrames === 0) {
            const hbW = PLANE_W * HITBOX_SCALE;
            const hbH = PLANE_H * HITBOX_SCALE;
            const hbX = PLANE_X + (PLANE_W - hbW) / 2;
            const hbY = g.plane.y + (PLANE_H - hbH) / 2;
            for (const pipe of g.pipes) {
              // Top pipe
              if (hbX + hbW > pipe.x && hbX < pipe.x + PIPE_W && hbY < pipe.topH) {
                gameOver();
                break;
              }
              // Bottom pipe
              const bottomY = pipe.topH + pipe.gap;
              if (hbX + hbW > pipe.x && hbX < pipe.x + PIPE_W && hbY + hbH > bottomY) {
                gameOver();
                break;
              }
            }
          }
        }

        // During countdown: avion stays static (no gravity, no collision checks)

        // Trail
        g.trail.unshift({ x: PLANE_X + PLANE_W / 2, y: g.plane.y + PLANE_H / 2 });
        if (g.trail.length > TRAIL_MAX) g.trail.length = TRAIL_MAX;
        // Shift trail left to simulate scrolling
        for (let i = 1; i < g.trail.length; i++) {
          g.trail[i].x -= PIPE_SPEED;
        }
        // Remove trail points that went offscreen
        while (g.trail.length > 1 && g.trail[g.trail.length - 1].x < -10) {
          g.trail.pop();
        }

        // Particles
        for (const p of g.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.1;
          p.life--;
        }
        g.particles = g.particles.filter(p => p.life > 0);

        g.frameCount++;
      }

      // ── DRAW ──
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground(ctx, g.scrollX);
      drawTrail(ctx, g.trail, colorRef.current);

      for (const pipe of g.pipes) {
        drawPipe(ctx, pipe, true);
        drawPipe(ctx, pipe, false);
      }

      for (const star of g.stars) {
        drawStar(ctx, star, g.frameCount);
      }

      drawPlane(ctx, g.plane.y, g.plane.vy, colorRef.current);
      drawParticles(ctx, g.particles);

      if (playing) {
        drawHUD(ctx, g.score, g.starCount, best, true);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [gameOver, best]);

  const color = COLORS[selectedColor];

  return (
    <div style={{
      minHeight: "100vh", background: "#fef9ef",
      backgroundImage: "linear-gradient(rgba(180,210,240,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(180,210,240,.25) 1px,transparent 1px)",
      backgroundSize: "20px 20px",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Patrick Hand',cursive", userSelect: "none", overflow: "hidden",
      position: "relative", touchAction: "none",
    }}>
      <style>{css}</style>

      {onBack && <BackButton onBack={onBack} />}

      {/* Margin lines */}
      <div style={{ position: "fixed", left: 60, top: 0, bottom: 0, width: 2, background: "rgba(220,80,80,.3)", zIndex: 0 }} />
      <div style={{ position: "fixed", left: 63, top: 0, bottom: 0, width: 1, background: "rgba(220,80,80,.15)", zIndex: 0 }} />

      {/* Title */}
      <h1 style={{
        fontFamily: "'Fredoka One',cursive", fontSize: "clamp(22px,5vw,36px)",
        margin: "0 0 4px", animation: "rainbow 4s linear infinite",
        textShadow: "2px 2px 0 rgba(0,0,0,.08)", letterSpacing: 2, zIndex: 1,
      }}>Crayon Flappy</h1>

      {/* Color picker (when not playing or counting down) */}
      {gameState !== "playing" && gameState !== "countdown" && (
        <div style={{
          display: "flex", gap: 6, marginBottom: 8, animation: "fadeIn .5s ease",
          background: "rgba(255,255,255,.7)", padding: "6px 14px", borderRadius: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,.06)", zIndex: 1,
        }}>
          <span style={{ fontSize: 13, color: "#666", alignSelf: "center", marginRight: 4 }}>Color:</span>
          {COLORS.map((c, i) => (
            <button key={c.name} onClick={() => setSelectedColor(i)} title={c.name} style={{
              width: 28, height: 28, borderRadius: "50%", background: c.body,
              border: selectedColor === i ? "3px solid #333" : "2px solid rgba(0,0,0,.15)",
              cursor: "pointer", transition: "all .2s",
              transform: selectedColor === i ? "scale(1.2)" : "scale(1)",
              boxShadow: selectedColor === i ? `0 0 10px ${c.body}55` : "none",
            }} />
          ))}
        </div>
      )}

      {/* Score display (while playing or counting down) */}
      {(gameState === "playing" || gameState === "countdown") && (
        <div style={{
          display: "flex", justifyContent: "space-between",
          width: Math.min(CANVAS_W, typeof window !== "undefined" ? window.innerWidth - 32 : CANVAS_W),
          maxWidth: CANVAS_W, marginBottom: 6, fontSize: "clamp(14px,3vw,18px)", zIndex: 1,
        }}>
          <span style={{ color: "#555" }}>
            Puntos: <span style={{ color: color.body, fontWeight: "bold", fontFamily: "'Fredoka One',cursive" }}>{score}</span>
          </span>
          <span style={{ color: "#555" }}>
            Record: <span style={{ color: "#ff9800", fontWeight: "bold", fontFamily: "'Fredoka One',cursive" }}>{best}</span>
          </span>
        </div>
      )}

      {/* Canvas container */}
      <div style={{
        position: "relative",
        width: "100%", maxWidth: CANVAS_W,
        aspectRatio: `${CANVAS_W}/${CANVAS_H}`,
        zIndex: 1,
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            width: "100%", height: "100%", borderRadius: 12,
            border: `3px solid ${color.body}`,
            boxShadow: `0 4px 24px rgba(0,0,0,.08),inset 0 0 30px rgba(0,0,0,.02),0 0 0 1px ${color.body}22`,
            cursor: "pointer", display: "block",
          }}
          onClick={handleClick}
          onTouchStart={handleTouch}
        />

        {/* IDLE overlay */}
        {gameState === "idle" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(254,249,239,.92)", animation: "fadeIn .5s ease",
            padding: 20, borderRadius: 12,
          }}>
            <div style={{ fontSize: "clamp(50px,12vw,80px)", marginBottom: 8, animation: "wobble 2s ease-in-out infinite" }}>
              ✈️
            </div>
            <div style={{
              fontFamily: "'Fredoka One',cursive", fontSize: "clamp(14px,3vw,20px)",
              color: "#555", textAlign: "center", marginBottom: 16, lineHeight: 1.6,
            }}>
              Vuela, pinta el cielo<br />y no te estrelles
            </div>
            <button onClick={(e) => { e.stopPropagation(); beginCountdown(); }} style={{
              fontFamily: "'Fredoka One',cursive", fontSize: "clamp(14px,3vw,18px)", color: "#fff",
              background: color.body, border: "none", padding: "12px 32px", borderRadius: 25,
              cursor: "pointer", boxShadow: `0 4px 14px ${color.body}44`, transition: "all .2s", letterSpacing: 1,
            }}
              onMouseEnter={(e) => { e.target.style.transform = "scale(1.08)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
            >Toca para volar</button>
            <div style={{ fontSize: "clamp(11px,2vw,14px)", marginTop: 16, color: "#999", textAlign: "center", lineHeight: 1.8 }}>
              Tap / Espacio / Flecha arriba / W
            </div>
          </div>
        )}

        {/* COUNTDOWN overlay */}
        {gameState === "countdown" && countdown !== null && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(254,249,239,.55)", borderRadius: 12, pointerEvents: "none",
          }}>
            <div key={countdown} style={{
              fontFamily: "'Fredoka One',cursive",
              fontSize: "clamp(80px,20vw,130px)",
              color: color.body,
              textShadow: `3px 3px 0 rgba(0,0,0,.1)`,
              animation: "countPop .9s ease forwards",
              lineHeight: 1,
            }}>
              {countdown}
            </div>
            <div style={{
              fontFamily: "'Fredoka One',cursive",
              fontSize: "clamp(14px,3vw,20px)",
              color: "#666",
              marginTop: 8,
            }}>
              Prepárate…
            </div>
          </div>
        )}

        {/* GAME OVER overlay */}
        {gameState === "over" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(254,249,239,.92)", animation: "fadeIn .4s ease",
            padding: 20, borderRadius: 12,
          }}>
            <div style={{
              fontFamily: "'Fredoka One',cursive", fontSize: "clamp(22px,5vw,32px)",
              color: "#e63946", marginBottom: 8, textShadow: "2px 2px 0 rgba(0,0,0,.06)",
            }}>
              Se estrello! ✈️💥
            </div>
            <div style={{
              fontFamily: "'Fredoka One',cursive", fontSize: "clamp(16px,3vw,22px)",
              color: color.body, marginBottom: 4,
            }}>
              Puntos: {score}
            </div>
            <div style={{
              fontFamily: "'Fredoka One',cursive", fontSize: "clamp(13px,2.5vw,16px)",
              color: "#e6a800", marginBottom: 4,
            }}>
              Estrellas: {starCount}
            </div>
            {score >= best && score > 0 && (
              <div style={{
                fontFamily: "'Fredoka One',cursive", fontSize: "clamp(12px,2.5vw,16px)",
                color: "#ff9800", marginBottom: 10, animation: "wobble 1s ease-in-out infinite",
              }}>
                Nuevo record!
              </div>
            )}
            <button onClick={(e) => { e.stopPropagation(); beginCountdown(); }} style={{
              fontFamily: "'Fredoka One',cursive", fontSize: "clamp(14px,3vw,18px)", color: "#fff",
              background: color.body, border: "none", padding: "12px 32px", borderRadius: 25,
              cursor: "pointer", boxShadow: `0 4px 14px ${color.body}44`, transition: "all .2s", marginTop: 6,
            }}
              onMouseEnter={(e) => { e.target.style.transform = "scale(1.08)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
            >Otra vez</button>
          </div>
        )}
      </div>

      {/* Info below canvas */}
      {gameState !== "playing" && gameState !== "countdown" && (
        <div style={{ marginTop: 10, fontSize: "clamp(11px,2vw,14px)", color: "#999", zIndex: 1 }}>
          Mejor: {best} puntos
        </div>
      )}
    </div>
  );
}
