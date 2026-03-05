import { useState, useEffect, useCallback, useRef } from "react";
import BackButton from "../components/BackButton";

/* ── Constants ── */
const CELL = 20;
const COLS = 22;
const ROWS = 22;
const W = COLS * CELL;
const H = ROWS * CELL;
const INIT_SPEED = 140;
const SPEED_INC = 3;
const MIN_SPEED = 50;
const CENTER_X = Math.floor(COLS / 2);
const CENTER_Y = Math.floor(ROWS / 2);
const INIT_LEN = 4;
const GRACE_TICKS = 3; // ticks of invulnerability at start

const COLORS = [
  { name: "Rojo", body: "#e63946", tip: "#c1121f", shade: "#a4161a" },
  { name: "Azul", body: "#2196F3", tip: "#1565C0", shade: "#0D47A1" },
  { name: "Verde", body: "#4caf50", tip: "#2e7d32", shade: "#1b5e20" },
  { name: "Naranja", body: "#ff9800", tip: "#e65100", shade: "#bf360c" },
  { name: "Morado", body: "#9c27b0", tip: "#6a1b9a", shade: "#4a148c" },
  { name: "Rosa", body: "#e91e8c", tip: "#c2185b", shade: "#880e4f" },
];

const DIR = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const KEY_TO_DIR = {
  ArrowUp: DIR.UP, ArrowDown: DIR.DOWN, ArrowLeft: DIR.LEFT, ArrowRight: DIR.RIGHT,
  w: DIR.UP, W: DIR.UP, s: DIR.DOWN, S: DIR.DOWN,
  a: DIR.LEFT, A: DIR.LEFT, d: DIR.RIGHT, D: DIR.RIGHT,
};

function isOpposite(a, b) { return a.x + b.x === 0 && a.y + b.y === 0; }
function sameDir(a, b) { return a.x === b.x && a.y === b.y; }

function makeInitSnake() {
  // Head at center, body extends to the left
  return Array.from({ length: INIT_LEN }, (_, i) => ({ x: CENTER_X - i, y: CENTER_Y }));
}

function randomPos(exclude) {
  let p;
  do { p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
  while (exclude.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

/* ── Crayon Head SVG — realistic elongated crayon ── */
function CrayonHead({ x, y, dir, color }) {
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  const angle = dir.x === 1 ? 0 : dir.x === -1 ? 180 : dir.y === -1 ? 270 : 90;
  // Crayon is drawn pointing RIGHT, then rotated
  // Total length ~40px, centered so tip aligns with head cell
  return (
    <g transform={`translate(${cx},${cy}) rotate(${angle})`} style={{ animation: "scribble .3s infinite" }}>
      <defs>
        <linearGradient id={`cg-${color.name}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity=".25" />
          <stop offset="40%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity=".12" />
        </linearGradient>
      </defs>

      {/* ── Back end (flat) ── */}
      <rect x={-22} y={-6} width={3} height={12} rx={1} fill={color.shade} />

      {/* ── Main body ── */}
      <rect x={-19} y={-6} width={22} height={12} rx={1.5} fill={color.body} />
      {/* Shiny highlight on body */}
      <rect x={-19} y={-6} width={22} height={12} rx={1.5} fill={`url(#cg-${color.name})`} />

      {/* ── Paper wrapper / label ── */}
      <rect x={-16} y={-6.5} width={16} height={13} rx={1} fill="white" opacity=".88" />
      <rect x={-16} y={-6.5} width={16} height={13} rx={1} fill={color.body} opacity=".12" />
      {/* Wrapper border lines */}
      <line x1={-16} y1={-6} x2={-16} y2={6} stroke={color.shade} strokeWidth={.4} opacity={.3} />
      <line x1={0} y1={-6} x2={0} y2={6} stroke={color.shade} strokeWidth={.4} opacity={.3} />
      {/* Wrapper wavy texture lines */}
      <line x1={-14} y1={-2} x2={-2} y2={-2} stroke={color.body} strokeWidth={.6} opacity={.35} />
      <line x1={-14} y1={0.5} x2={-2} y2={0.5} stroke={color.body} strokeWidth={.6} opacity={.25} />
      <line x1={-14} y1={3} x2={-2} y2={3} stroke={color.body} strokeWidth={.6} opacity={.2} />
      {/* Label icon */}
      <text x={-11} y={-3} fontSize={4} fill={color.body} fontFamily="'Fredoka One',sans-serif" opacity={.7} fontWeight="bold">CRAYON</text>

      {/* ── Exposed crayon (between wrapper and tip) ── */}
      <rect x={3} y={-5.5} width={5} height={11} rx={.5} fill={color.body} />
      <rect x={3} y={-5.5} width={5} height={11} rx={.5} fill={`url(#cg-${color.name})`} />

      {/* ── Conical tip (pointy!) ── */}
      <polygon points="8,-5 16,0 8,5" fill={color.tip} />
      {/* Tip highlight */}
      <polygon points="8,-5 16,0 8,0" fill="white" opacity=".12" />
      {/* Very tip - darker point */}
      <polygon points="13,-2 16,0 13,2" fill={color.shade} opacity=".7" />
      {/* Tip outline */}
      <polygon points="8,-5 16,0 8,5" fill="none" stroke={color.shade} strokeWidth={.4} opacity={.5} />
    </g>
  );
}

/* ── D-Pad Button ── */
function DpadBtn({ label, id, dir, color, pressed, onPress }) {
  const fired = useRef(false);
  const handle = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fired.current) return; // block double fire (touch + mouse)
    fired.current = true;
    setTimeout(() => { fired.current = false; }, 80);
    onPress(dir, id);
  }, [dir, id, onPress]);

  return (
    <button
      onTouchStart={handle}
      onMouseDown={handle}
      style={{
        width: 48, height: 48, fontSize: 20, fontFamily: "sans-serif",
        background: pressed ? `${color.body}35` : `${color.body}15`,
        border: `2px solid ${pressed ? color.body : color.body + "44"}`,
        color: color.body, borderRadius: 12, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        WebkitTapHighlightColor: "transparent", transition: "all .1s",
        transform: pressed ? "scale(.9)" : "scale(1)", outline: "none",
        touchAction: "manipulation",
      }}
    >{label}</button>
  );
}

/* ── CSS ── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Fredoka+One&display=swap');
@keyframes wobble{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1deg)}}
@keyframes starSpin{0%{transform:rotate(0) scale(1)}50%{transform:rotate(180deg) scale(1.3)}100%{transform:rotate(360deg) scale(1)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes scribble{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(.5px,-.5px) rotate(.5deg)}50%{transform:translate(-.5px,.5px) rotate(-.5deg)}75%{transform:translate(.5px,.5px) rotate(.3deg)}}
@keyframes rainbow{0%{color:#e63946}16%{color:#ff9800}33%{color:#4caf50}50%{color:#2196F3}66%{color:#9c27b0}83%{color:#e91e8c}100%{color:#e63946}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
`;

/* ══════════════════════════════════════════════════════════════ */
export default function CrayonSnake({ onBack }) {
  const initSnake = makeInitSnake();
  const [snake, setSnake] = useState(initSnake);
  const [food, setFood] = useState(() => randomPos(initSnake));
  const [bonus, setBonus] = useState(null);
  const [dir, setDir] = useState(DIR.RIGHT);
  const [gs, setGs] = useState("idle"); // idle | playing | over
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [speed, setSpeed] = useState(INIT_SPEED);
  const [color, setColor] = useState(COLORS[0]);
  const [particles, setParticles] = useState([]);
  const [pressedBtn, setPressedBtn] = useState(null);
  const [graceTick, setGraceTick] = useState(0);

  // Refs for accessing latest values in intervals/callbacks
  const r = useRef({});
  useEffect(() => { Object.assign(r.current, { dir, snake, food, bonus, score, speed, gs, graceTick }); });
  const lastDir = useRef(DIR.RIGHT);
  const queue = useRef([]);
  const dpadRef = useRef(null);

  /* ── particles ── */
  const boom = useCallback((x, y, c, n = 6) => {
    const ps = Array.from({ length: n }, (_, i) => ({
      id: Date.now() + Math.random(),
      x: x * CELL + CELL / 2, y: y * CELL + CELL / 2,
      color: c, angle: (Math.PI * 2 * i) / n + Math.random() * .5,
      dist: 12 + Math.random() * 14,
    }));
    setParticles((p) => [...p, ...ps]);
    setTimeout(() => setParticles((p) => p.filter((pp) => !ps.includes(pp))), 500);
  }, []);

  /* ── start game ── */
  const startGame = useCallback(() => {
    const s = makeInitSnake();
    setSnake(s);
    setFood(randomPos(s));
    setBonus(null);
    setDir(DIR.RIGHT);
    lastDir.current = DIR.RIGHT;
    queue.current = [];
    setScore(0);
    setSpeed(INIT_SPEED);
    setGraceTick(GRACE_TICKS);
    setGs("playing");
    setParticles([]);
  }, []);

  /* ── push a direction (from any input source) ── */
  const pushDir = useCallback((nd) => {
    if (r.current.gs !== "playing") {
      startGame();
      // Only queue the direction if it's compatible with initial RIGHT
      if (!isOpposite(nd, DIR.RIGHT) && !sameDir(nd, DIR.RIGHT)) {
        queue.current = [nd];
      }
      return;
    }
    const q = queue.current;
    const eff = q.length > 0 ? q[q.length - 1] : lastDir.current;
    if (isOpposite(nd, eff) || sameDir(nd, eff)) return;
    if (q.length < 2) queue.current = [...q, nd];
  }, [startGame]);

  /* ── tick ── */
  const tick = useCallback(() => {
    const st = r.current;
    if (st.gs !== "playing") return;

    // Consume queued direction
    if (queue.current.length > 0) {
      const next = queue.current.shift();
      if (!isOpposite(next, lastDir.current)) {
        r.current.dir = next;
        setDir(next);
      }
    }

    const d = r.current.dir;
    lastDir.current = d;
    const cur = r.current.snake;
    const head = cur[0];
    const nh = { x: head.x + d.x, y: head.y + d.y };

    // Grace period: count down but skip collision checks
    const grace = r.current.graceTick;
    if (grace > 0) {
      setGraceTick(grace - 1);
      // Still move but don't die
      const oob = nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS;
      const selfHit = cur.some((s) => s.x === nh.x && s.y === nh.y);
      if (oob || selfHit) return; // just skip this tick during grace
    } else {
      // Wall collision
      if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS) {
        setGs("over");
        setBest((p) => Math.max(p, r.current.score));
        return;
      }
      // Self collision
      if (cur.some((s) => s.x === nh.x && s.y === nh.y)) {
        setGs("over");
        setBest((p) => Math.max(p, r.current.score));
        return;
      }
    }

    let ns = [nh, ...cur];
    let ate = false;

    // Food
    const cf = r.current.food;
    if (nh.x === cf.x && nh.y === cf.y) {
      ate = true;
      setScore((s) => s + 10);
      boom(cf.x, cf.y, "#e63946");
      const nf = randomPos(ns);
      setFood(nf);
      setSpeed((s) => Math.max(MIN_SPEED, s - SPEED_INC));
      if (!r.current.bonus && Math.random() < .2) {
        const b = randomPos([...ns, nf]);
        setBonus(b);
        setTimeout(() => setBonus((prev) => prev && prev.x === b.x && prev.y === b.y ? null : prev), 5000);
      }
    }

    // Bonus
    const cb = r.current.bonus;
    if (cb && nh.x === cb.x && nh.y === cb.y) {
      ate = true;
      setScore((s) => s + 50);
      boom(cb.x, cb.y, "#ff9800", 10);
      setBonus(null);
    }

    if (!ate) ns.pop();
    setSnake(ns);
  }, [boom]);

  /* ── game loop ── */
  useEffect(() => {
    if (gs !== "playing") return;
    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [gs, speed, tick]);

  /* ── keyboard ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (r.current.gs !== "playing") startGame();
        return;
      }
      const nd = KEY_TO_DIR[e.key];
      if (!nd) return;
      e.preventDefault();
      pushDir(nd);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [startGame, pushDir]);

  /* ── swipe ── */
  const tRef = useRef(null);
  const onTS = useCallback((e) => {
    if (dpadRef.current?.contains(e.target)) return;
    tRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const onTE = useCallback((e) => {
    if (!tRef.current || dpadRef.current?.contains(e.target)) { tRef.current = null; return; }
    const dx = e.changedTouches[0].clientX - tRef.current.x;
    const dy = e.changedTouches[0].clientY - tRef.current.y;
    tRef.current = null;
    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) {
      if (r.current.gs !== "playing") startGame();
      return;
    }
    const nd = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? DIR.RIGHT : DIR.LEFT)
      : (dy > 0 ? DIR.DOWN : DIR.UP);
    pushDir(nd);
  }, [startGame, pushDir]);

  /* ── D-pad ── */
  const onDpad = useCallback((nd, id) => {
    setPressedBtn(id);
    setTimeout(() => setPressedBtn(null), 120);
    pushDir(nd);
  }, [pushDir]);

  /* ══ RENDER ══ */
  return (
    <div
      style={{
        minHeight: "100vh", background: "#fef9ef",
        backgroundImage: "linear-gradient(rgba(180,210,240,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(180,210,240,.25) 1px,transparent 1px)",
        backgroundSize: "20px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "'Patrick Hand',cursive", userSelect: "none", overflow: "hidden",
        position: "relative", touchAction: "none",
      }}
      onTouchStart={onTS}
      onTouchEnd={onTE}
    >
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
      }}>🖍️ Crayon Snake</h1>

      {/* Color picker */}
      {gs !== "playing" && (
        <div style={{
          display: "flex", gap: 6, marginBottom: 8, animation: "fadeIn .5s ease",
          background: "rgba(255,255,255,.7)", padding: "6px 14px", borderRadius: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,.06)", zIndex: 1,
        }}>
          <span style={{ fontSize: 13, color: "#666", alignSelf: "center", marginRight: 4 }}>Color:</span>
          {COLORS.map((c) => (
            <button key={c.name} onClick={() => setColor(c)} title={c.name} style={{
              width: 28, height: 28, borderRadius: "50%", background: c.body,
              border: color.name === c.name ? "3px solid #333" : "2px solid rgba(0,0,0,.15)",
              cursor: "pointer", transition: "all .2s",
              transform: color.name === c.name ? "scale(1.2)" : "scale(1)",
              boxShadow: color.name === c.name ? `0 0 10px ${c.body}55` : "none",
            }} />
          ))}
        </div>
      )}

      {/* Score */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        width: Math.min(W, typeof window !== "undefined" ? window.innerWidth - 32 : W),
        maxWidth: W, marginBottom: 6, fontSize: "clamp(14px,3vw,18px)", zIndex: 1,
      }}>
        <span style={{ color: "#555" }}>
          Puntos: <span style={{ color: color.body, fontWeight: "bold", fontFamily: "'Fredoka One',cursive" }}>{score}</span>
        </span>
        <span style={{ color: "#555" }}>
          Récord: <span style={{ color: "#ff9800", fontWeight: "bold", fontFamily: "'Fredoka One',cursive" }}>{best}</span>
        </span>
      </div>

      {/* ═══ Board ═══ */}
      <div style={{
        position: "relative", width: W, height: H,
        maxWidth: "calc(100vw - 24px)", maxHeight: "calc(100vw - 24px)", aspectRatio: "1",
        border: `3px solid ${color.body}`, borderRadius: 12, background: "#fffef7",
        boxShadow: `0 4px 24px rgba(0,0,0,.08),inset 0 0 30px rgba(0,0,0,.02),0 0 0 1px ${color.body}22`,
        overflow: "hidden", zIndex: 1,
      }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", top: 0, left: 0, display: "block" }}>
          {/* Grid */}
          {Array.from({ length: COLS + 1 }, (_, i) => (
            <line key={`v${i}`} x1={i * CELL} y1={0} x2={i * CELL} y2={H} stroke="rgba(150,190,230,.12)" strokeWidth={.5} />
          ))}
          {Array.from({ length: ROWS + 1 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * CELL} x2={W} y2={i * CELL} stroke="rgba(150,190,230,.12)" strokeWidth={.5} />
          ))}

          {/* Trail — waxy crayon strokes */}
          {snake.length > 1 && (
            <g>
              {/* SVG filter for crayon rough texture */}
              <defs>
                <filter id="crayon-rough" x="-5%" y="-5%" width="110%" height="110%">
                  <feTurbulence type="turbulence" baseFrequency=".45" numOctaves="3" seed="2" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
              {snake.slice(1).map((seg, i) => {
                const prev = snake[i];
                const op = .4 + .5 * (1 - i / Math.max(snake.length - 1, 1));
                const sx = seg.x * CELL + CELL / 2, sy = seg.y * CELL + CELL / 2;
                const px = prev.x * CELL + CELL / 2, py = prev.y * CELL + CELL / 2;
                // Slight wavy offset to mimic hand-drawn feel
                const ox1 = Math.sin(i * 2.1) * 1.2;
                const oy1 = Math.cos(i * 1.7) * 1.2;
                const ox2 = Math.sin(i * 1.3 + 1) * 1.2;
                const oy2 = Math.cos(i * 2.3 + 1) * 1.2;
                return (
                  <g key={`t${i}`} filter="url(#crayon-rough)">
                    {/* Main waxy stroke */}
                    <line x1={sx + ox1} y1={sy + oy1} x2={px + ox2} y2={py + oy2}
                      stroke={color.body} strokeWidth={CELL - 5}
                      strokeLinecap="round" opacity={op} />
                    {/* Highlight streak (wax shine) */}
                    <line x1={sx + ox1 - 1} y1={sy + oy1 - 2} x2={px + ox2 - 1} y2={py + oy2 - 2}
                      stroke="white" strokeWidth={2}
                      strokeLinecap="round" opacity={op * .15} />
                    {/* Darker edge (pressure) */}
                    <line x1={sx + ox1 + 1} y1={sy + oy1 + 2} x2={px + ox2 + 1} y2={py + oy2 + 2}
                      stroke={color.shade} strokeWidth={2.5}
                      strokeLinecap="round" opacity={op * .18} />
                  </g>
                );
              })}
            </g>
          )}

          {/* Crayon head (blinks during grace) */}
          {snake.length > 0 && (
            <g style={graceTick > 0 ? { animation: "blink .3s infinite" } : undefined}>
              {/* Contact mark — where the tip touches paper */}
              <circle
                cx={snake[0].x * CELL + CELL / 2}
                cy={snake[0].y * CELL + CELL / 2}
                r={4}
                fill={color.tip}
                opacity={.35}
              />
              <CrayonHead x={snake[0].x} y={snake[0].y} dir={dir} color={color} />
            </g>
          )}

          {/* Food */}
          <g style={{ animation: "wobble 1s ease-in-out infinite" }}>
            <text x={food.x * CELL + CELL / 2} y={food.y * CELL + CELL / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={14}>🍎</text>
          </g>

          {/* Bonus */}
          {bonus && (
            <g style={{ animation: "starSpin 1.5s ease-in-out infinite" }}>
              <text x={bonus.x * CELL + CELL / 2} y={bonus.y * CELL + CELL / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={16}>⭐</text>
            </g>
          )}

          {/* Particles */}
          {particles.map((p) => (
            <circle key={p.id} cx={p.x + Math.cos(p.angle) * p.dist} cy={p.y + Math.sin(p.angle) * p.dist}
              r={3 + Math.random() * 2} fill={p.color} opacity={.6} style={{ transition: "all .4s ease-out" }} />
          ))}
        </svg>

        {/* Paper texture */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: .4, backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23000' opacity='0.02'/%3E%3C/svg%3E")` }} />

        {/* IDLE */}
        {gs === "idle" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(254,249,239,.92)", animation: "fadeIn .5s ease", padding: 20 }}>
            <div style={{ fontSize: "clamp(50px,12vw,80px)", marginBottom: 8, animation: "wobble 2s ease-in-out infinite" }}>🖍️</div>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "clamp(14px,3vw,20px)", color: "#555", textAlign: "center", marginBottom: 16, lineHeight: 1.6 }}>
              ¡Pinta tu camino<br />sin salirte del cuaderno!
            </div>
            <button onClick={startGame} style={{
              fontFamily: "'Fredoka One',cursive", fontSize: "clamp(14px,3vw,18px)", color: "#fff",
              background: color.body, border: "none", padding: "12px 32px", borderRadius: 25,
              cursor: "pointer", boxShadow: `0 4px 14px ${color.body}44`, transition: "all .2s", letterSpacing: 1,
            }}
              onMouseEnter={(e) => { e.target.style.transform = "scale(1.08)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
            >▶ ¡A Pintar!</button>
            <div style={{ fontSize: "clamp(11px,2vw,14px)", marginTop: 16, color: "#999", textAlign: "center", lineHeight: 1.8 }}>
              WASD / Flechas / Swipe / D-Pad
            </div>
          </div>
        )}

        {/* GAME OVER */}
        {gs === "over" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(254,249,239,.92)", animation: "fadeIn .4s ease", padding: 20 }}>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "clamp(22px,5vw,32px)", color: "#e63946", marginBottom: 8, textShadow: "2px 2px 0 rgba(0,0,0,.06)" }}>
              ¡Se rompió! ✏️💥
            </div>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "clamp(16px,3vw,22px)", color: color.body, marginBottom: 4 }}>
              Puntos: {score}
            </div>
            {score >= best && score > 0 && (
              <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "clamp(12px,2.5vw,16px)", color: "#ff9800", marginBottom: 10, animation: "wobble 1s ease-in-out infinite" }}>
                ⭐ ¡Nuevo récord! ⭐
              </div>
            )}
            <button onClick={startGame} style={{
              fontFamily: "'Fredoka One',cursive", fontSize: "clamp(14px,3vw,18px)", color: "#fff",
              background: color.body, border: "none", padding: "12px 32px", borderRadius: 25,
              cursor: "pointer", boxShadow: `0 4px 14px ${color.body}44`, transition: "all .2s", marginTop: 6,
            }}
              onMouseEnter={(e) => { e.target.style.transform = "scale(1.08)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
            >↻ Otra vez</button>
          </div>
        )}
      </div>

      {/* ═══ D-PAD ═══ */}
      <div
        ref={dpadRef}
        style={{ marginTop: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, zIndex: 1 }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <DpadBtn label="▲" id="up" dir={DIR.UP} color={color} pressed={pressedBtn === "up"} onPress={onDpad} />
        <div style={{ display: "flex", gap: 4 }}>
          <DpadBtn label="◀" id="left" dir={DIR.LEFT} color={color} pressed={pressedBtn === "left"} onPress={onDpad} />
          <div style={{ width: 48, height: 48 }} />
          <DpadBtn label="▶" id="right" dir={DIR.RIGHT} color={color} pressed={pressedBtn === "right"} onPress={onDpad} />
        </div>
        <DpadBtn label="▼" id="down" dir={DIR.DOWN} color={color} pressed={pressedBtn === "down"} onPress={onDpad} />
      </div>

      <div style={{ marginTop: 10, fontSize: "clamp(11px,2vw,14px)", color: "#999", zIndex: 1 }}>
        🍎 = 10 pts &nbsp;&nbsp; ⭐ = 50 pts
      </div>
    </div>
  );
}
