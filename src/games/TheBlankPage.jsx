import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import BackButton from "../components/BackButton";

/* ── Constants ── */
const BOARD_PX = 320;
const COLORS = [
  { name: "Rojo", body: "#e63946", tip: "#c1121f", shade: "#a4161a" },
  { name: "Azul", body: "#2196F3", tip: "#1565C0", shade: "#0D47A1" },
  { name: "Verde", body: "#4caf50", tip: "#2e7d32", shade: "#1b5e20" },
  { name: "Naranja", body: "#ff9800", tip: "#e65100", shade: "#bf360c" },
  { name: "Morado", body: "#9c27b0", tip: "#6a1b9a", shade: "#4a148c" },
  { name: "Rosa", body: "#e91e8c", tip: "#c2185b", shade: "#880e4f" },
];

const FLOOR = 0, WALL = 1, EXIT = 2, INK = 3, ERASER = 4, SPILL = 5;

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

const MAX_UNDOS = 3;

/* ── Levels (Chapter 1: "Primeros Trazos") ── */
// 0=floor, 1=wall, 2=exit, 3=ink(+10), 4=eraser(-5), 5=spill
const LEVELS = [
  {
    id: 1, name: "Pagina 1", size: 8, ink: 50,
    start: [1, 6],
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,0,1],
      [1,0,0,0,0,1,0,1],
      [1,1,1,0,1,1,0,1],
      [1,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,2,1],
      [1,1,1,1,1,1,1,1],
    ],
    stars: { one: 0, two: 15, three: 30 },
  },
  {
    id: 2, name: "Pagina 2", size: 8, ink: 48,
    start: [1, 1],
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,1],
      [1,0,1,0,0,0,1,1],
      [1,0,1,1,1,0,0,1],
      [1,0,0,0,0,0,1,1],
      [1,1,1,0,1,0,0,1],
      [1,0,0,0,1,0,2,1],
      [1,1,1,1,1,1,1,1],
    ],
    stars: { one: 0, two: 12, three: 25 },
  },
  {
    id: 3, name: "Pagina 3", size: 8, ink: 42,
    start: [1, 1],
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,1],
      [1,0,1,0,0,0,1,1],
      [1,3,1,1,0,0,0,1],
      [1,0,0,0,1,1,0,1],
      [1,1,0,1,0,0,0,1],
      [1,0,0,0,0,1,2,1],
      [1,1,1,1,1,1,1,1],
    ],
    stars: { one: 0, two: 10, three: 20 },
  },
  {
    id: 4, name: "Pagina 4", size: 8, ink: 40,
    start: [6, 1],
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,1],
      [1,1,1,0,1,1,0,1],
      [1,0,0,0,0,1,0,1],
      [1,0,1,1,0,0,0,1],
      [1,0,0,3,0,1,1,1],
      [1,2,1,1,0,0,0,1],
      [1,1,1,1,1,1,1,1],
    ],
    stars: { one: 0, two: 8, three: 18 },
  },
  {
    id: 5, name: "Pagina 5", size: 8, ink: 38,
    start: [1, 1],
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,1,0,0,0,1],
      [1,0,1,0,0,1,0,1],
      [1,0,0,0,1,0,0,1],
      [1,1,0,1,0,0,1,1],
      [1,0,0,0,0,1,0,1],
      [1,0,1,0,3,0,2,1],
      [1,1,1,1,1,1,1,1],
    ],
    stars: { one: 0, two: 8, three: 16 },
  },
  {
    id: 6, name: "Pagina 6", size: 8, ink: 36,
    start: [1, 6],
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,1],
      [1,1,0,1,0,0,1,1],
      [1,0,0,0,0,1,0,1],
      [1,0,1,0,1,0,0,1],
      [1,0,0,0,0,0,1,1],
      [1,0,1,1,3,0,2,1],
      [1,1,1,1,1,1,1,1],
    ],
    stars: { one: 0, two: 6, three: 14 },
  },
  {
    id: 7, name: "Pagina 7", size: 8, ink: 35,
    start: [1, 1],
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,0,0,1,0,1],
      [1,0,1,1,0,0,0,1],
      [1,0,0,4,0,1,0,1],
      [1,1,0,1,0,0,0,1],
      [1,0,0,0,1,0,1,1],
      [1,0,1,0,0,0,2,1],
      [1,1,1,1,1,1,1,1],
    ],
    stars: { one: 0, two: 5, three: 12 },
  },
  {
    id: 8, name: "Pagina 8", size: 8, ink: 34,
    start: [6, 6],
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,2,0,0,1,0,0,1],
      [1,0,1,0,0,0,1,1],
      [1,0,0,0,1,4,0,1],
      [1,1,0,1,0,0,0,1],
      [1,0,0,0,0,1,0,1],
      [1,0,1,3,0,0,0,1],
      [1,1,1,1,1,1,1,1],
    ],
    stars: { one: 0, two: 4, three: 10 },
  },
  {
    id: 9, name: "Pagina 9", size: 8, ink: 32,
    start: [1, 1],
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,1],
      [1,0,1,0,5,0,1,1],
      [1,0,0,1,0,0,0,1],
      [1,1,0,0,0,1,0,1],
      [1,0,0,1,0,0,0,1],
      [1,0,1,0,0,3,2,1],
      [1,1,1,1,1,1,1,1],
    ],
    stars: { one: 0, two: 4, three: 10 },
  },
  {
    id: 10, name: "Pagina 10", size: 8, ink: 30,
    start: [1, 6],
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,2,0,1,0,0,0,1],
      [1,0,1,0,0,1,0,1],
      [1,0,0,0,1,5,0,1],
      [1,1,0,1,0,0,0,1],
      [1,0,0,0,0,1,4,1],
      [1,0,1,3,0,0,0,1],
      [1,1,1,1,1,1,1,1],
    ],
    stars: { one: 0, two: 3, three: 8 },
  },
];

/* ── Utilities ── */
function cellKey(x, y) { return `${x},${y}`; }
function isWalkable(t) { return t !== WALL; }

function getAdjacentShadows(x, y, grid, revealed, size) {
  const shadows = [];
  for (const d of [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT]) {
    const nx = x + d.x, ny = y + d.y;
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
    if (revealed.has(cellKey(nx, ny))) continue;
    if (grid[ny][nx] !== FLOOR && grid[ny][nx] !== WALL) shadows.push([nx, ny]);
  }
  return shadows;
}

function countWalkable(grid, size, axis, idx) {
  let c = 0;
  for (let i = 0; i < size; i++) {
    const t = axis === "row" ? grid[idx][i] : grid[i][idx];
    if (isWalkable(t)) c++;
  }
  return c;
}

/* ── CSS ── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Fredoka+One&display=swap');
@keyframes wobble{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes rainbow{0%{color:#e63946}16%{color:#ff9800}33%{color:#4caf50}50%{color:#2196F3}66%{color:#9c27b0}83%{color:#e91e8c}100%{color:#e63946}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
@keyframes inkDrip{0%{transform:scaleX(1)}50%{transform:scaleX(.98)}100%{transform:scaleX(1)}}
@keyframes blindPulse{0%,100%{opacity:.15}50%{opacity:.35}}
`;

/* ── Sub-components ── */

function CrayonPlayer({ x, y, cell, dir, color }) {
  const cx = x * cell + cell / 2;
  const cy = y * cell + cell / 2;
  const angle = dir.x === 1 ? 0 : dir.x === -1 ? 180 : dir.y === -1 ? 270 : 90;
  const s = cell / 20; // scale factor relative to default 20px cell
  return (
    <g transform={`translate(${cx},${cy}) scale(${s}) rotate(${angle})`}>
      <defs>
        <linearGradient id={`bp-cg-${color.name}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity=".25" />
          <stop offset="40%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity=".12" />
        </linearGradient>
      </defs>
      <rect x={-22} y={-6} width={3} height={12} rx={1} fill={color.shade} />
      <rect x={-19} y={-6} width={22} height={12} rx={1.5} fill={color.body} />
      <rect x={-19} y={-6} width={22} height={12} rx={1.5} fill={`url(#bp-cg-${color.name})`} />
      <rect x={-16} y={-6.5} width={16} height={13} rx={1} fill="white" opacity=".88" />
      <rect x={-16} y={-6.5} width={16} height={13} rx={1} fill={color.body} opacity=".12" />
      <line x1={-16} y1={-6} x2={-16} y2={6} stroke={color.shade} strokeWidth={.4} opacity={.3} />
      <line x1={0} y1={-6} x2={0} y2={6} stroke={color.shade} strokeWidth={.4} opacity={.3} />
      <line x1={-14} y1={-2} x2={-2} y2={-2} stroke={color.body} strokeWidth={.6} opacity={.35} />
      <line x1={-14} y1={0.5} x2={-2} y2={0.5} stroke={color.body} strokeWidth={.6} opacity={.25} />
      <line x1={-14} y1={3} x2={-2} y2={3} stroke={color.body} strokeWidth={.6} opacity={.2} />
      <text x={-11} y={-3} fontSize={4} fill={color.body} fontFamily="'Fredoka One',sans-serif" opacity={.7} fontWeight="bold">CRAYON</text>
      <rect x={3} y={-5.5} width={5} height={11} rx={.5} fill={color.body} />
      <rect x={3} y={-5.5} width={5} height={11} rx={.5} fill={`url(#bp-cg-${color.name})`} />
      <polygon points="8,-5 16,0 8,5" fill={color.tip} />
      <polygon points="8,-5 16,0 8,0" fill="white" opacity=".12" />
      <polygon points="13,-2 16,0 13,2" fill={color.shade} opacity=".7" />
      <polygon points="8,-5 16,0 8,5" fill="none" stroke={color.shade} strokeWidth={.4} opacity={.5} />
    </g>
  );
}

function DpadBtn({ label, id, dir, color, pressed, onPress }) {
  const fired = useRef(false);
  const handle = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fired.current) return;
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

/* ── Main Component ── */
export default function TheBlankPage({ onBack }) {
  const [screen, setScreen] = useState("levels");
  const [currentLevel, setCurrentLevel] = useState(null);
  const [completedLevels, setCompletedLevels] = useState(() => {
    try { return JSON.parse(localStorage.getItem("blankpage-completed") || "{}"); } catch { return {}; }
  });
  const [playerPos, setPlayerPos] = useState(null);
  const [playerDir, setPlayerDir] = useState(DIR.RIGHT);
  const [revealed, setRevealed] = useState(new Set());
  const [ink, setInk] = useState(0);
  const [steps, setSteps] = useState(0);
  const [undosLeft, setUndosLeft] = useState(MAX_UNDOS);
  const [history, setHistory] = useState([]);
  const [gridState, setGridState] = useState(null);
  const [gameStatus, setGameStatus] = useState("playing");
  const [selectedColor, setSelectedColor] = useState(0);
  const [pressedBtn, setPressedBtn] = useState(null);

  const touchRef = useRef(null);
  const moveRef = useRef(null); // ref for latest move fn

  useEffect(() => {
    try { localStorage.setItem("blankpage-completed", JSON.stringify(completedLevels)); } catch {}
  }, [completedLevels]);

  const level = currentLevel != null ? LEVELS.find(l => l.id === currentLevel) : null;
  const CELL = level ? Math.floor(BOARD_PX / level.size) : 40;
  const W = level ? level.size * CELL : 0;
  const H = W;
  const color = COLORS[selectedColor];

  /* ── Shadows (memoized) ── */
  const shadowCells = useMemo(() => {
    if (!level || !gridState) return new Set();
    const s = new Set();
    for (const key of revealed) {
      const [x, y] = key.split(",").map(Number);
      const adj = getAdjacentShadows(x, y, gridState, revealed, level.size);
      for (const [sx, sy] of adj) s.add(cellKey(sx, sy));
    }
    return s;
  }, [revealed, gridState, level]);

  /* ── Border numbers (memoized) ── */
  const borderNumbers = useMemo(() => {
    if (!level) return { rows: [], cols: [] };
    const rows = [], cols = [];
    for (let i = 0; i < level.size; i++) {
      rows.push(countWalkable(level.grid, level.size, "row", i));
      cols.push(countWalkable(level.grid, level.size, "col", i));
    }
    return { rows, cols };
  }, [level]);

  /* ── Grid lines (memoized) ── */
  const gridLines = useMemo(() => {
    if (!level) return null;
    const lines = [];
    for (let i = 0; i <= level.size; i++) {
      lines.push(<line key={`v${i}`} x1={i * CELL} y1={0} x2={i * CELL} y2={H} stroke="rgba(150,190,230,.12)" strokeWidth={0.5} />);
      lines.push(<line key={`h${i}`} x1={0} y1={i * CELL} x2={W} y2={i * CELL} stroke="rgba(150,190,230,.12)" strokeWidth={0.5} />);
    }
    return lines;
  }, [level, CELL, W, H]);

  /* ── Start level ── */
  const selectLevel = useCallback((id) => {
    const lvl = LEVELS.find(l => l.id === id);
    if (!lvl) return;
    setCurrentLevel(id);
    setPlayerPos([...lvl.start]);
    setPlayerDir(DIR.RIGHT);
    const initRevealed = new Set();
    initRevealed.add(cellKey(lvl.start[0], lvl.start[1]));
    setRevealed(initRevealed);
    setInk(lvl.ink);
    setSteps(0);
    setUndosLeft(MAX_UNDOS);
    setHistory([]);
    setGridState(lvl.grid.map(row => [...row]));
    setGameStatus("playing");
    setScreen("game");
  }, []);

  /* ── Move logic ── */
  const move = useCallback((direction) => {
    if (!level || !playerPos || !gridState) return;
    if (gameStatus === "won") return;

    const nx = playerPos[0] + direction.x;
    const ny = playerPos[1] + direction.y;

    // Out of bounds
    if (nx < 0 || ny < 0 || nx >= level.size || ny >= level.size) return;

    const cellType = gridState[ny][nx];
    const key = cellKey(nx, ny);
    const wasRevealed = revealed.has(key);

    // Wall — reveal it but don't move
    if (cellType === WALL) {
      if (!wasRevealed) {
        setRevealed(prev => { const n = new Set(prev); n.add(key); return n; });
      }
      return;
    }

    // Save snapshot for undo
    setHistory(prev => [...prev, {
      playerPos: [...playerPos],
      revealed: new Set(revealed),
      ink,
      gridState: gridState.map(r => [...r]),
      steps,
    }]);

    // Move player
    setPlayerPos([nx, ny]);
    setPlayerDir(direction);

    let newInk = ink;
    let newGrid = gridState;
    let newRevealed = revealed;

    if (!wasRevealed) {
      // Reveal and spend ink
      newRevealed = new Set(revealed);
      newRevealed.add(key);
      newInk = ink - 1;

      // Process items
      if (cellType === INK) {
        newInk += 10;
        newGrid = gridState.map(r => [...r]);
        newGrid[ny][nx] = FLOOR;
      } else if (cellType === ERASER) {
        newInk -= 5;
        newGrid = gridState.map(r => [...r]);
        newGrid[ny][nx] = FLOOR;
      } else if (cellType === SPILL) {
        newGrid = gridState.map(r => [...r]);
        newGrid[ny][nx] = FLOOR;
        // Reveal entire row OR column (whichever reveals more)
        let rowCount = 0, colCount = 0;
        for (let i = 0; i < level.size; i++) {
          if (!newRevealed.has(cellKey(i, ny)) && newGrid[ny][i] !== WALL) rowCount++;
          if (!newRevealed.has(cellKey(nx, i)) && newGrid[i][nx] !== WALL) colCount++;
        }
        if (rowCount >= colCount) {
          for (let i = 0; i < level.size; i++) newRevealed.add(cellKey(i, ny));
        } else {
          for (let i = 0; i < level.size; i++) newRevealed.add(cellKey(nx, i));
        }
      }

      setRevealed(newRevealed);
      setInk(newInk);
      setGridState(newGrid);

      if (newInk <= 0 && gameStatus !== "blind") {
        setGameStatus("blind");
      }
      if (newInk > 0 && gameStatus === "blind") {
        setGameStatus("playing");
      }
    }

    // Check exit
    if (cellType === EXIT || gridState[ny][nx] === EXIT) {
      setGameStatus("won");
    }

    setSteps(s => s + 1);
  }, [level, playerPos, gridState, revealed, ink, steps, gameStatus]);

  // Keep ref updated for keyboard/touch handlers
  useEffect(() => { moveRef.current = move; }, [move]);

  /* ── Undo ── */
  const undo = useCallback(() => {
    if (undosLeft <= 0 || history.length === 0) return;
    const snap = history[history.length - 1];
    setPlayerPos(snap.playerPos);
    setRevealed(snap.revealed);
    setInk(snap.ink);
    setGridState(snap.gridState);
    setSteps(snap.steps);
    setHistory(prev => prev.slice(0, -1));
    setUndosLeft(prev => prev - 1);
    if (snap.ink > 0) setGameStatus("playing");
  }, [undosLeft, history]);

  /* ── Keyboard input ── */
  useEffect(() => {
    if (screen !== "game") return;
    const onKey = (e) => {
      const d = KEY_TO_DIR[e.key];
      if (d) { e.preventDefault(); moveRef.current?.(d); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen]);

  /* ── Touch swipe ── */
  useEffect(() => {
    if (screen !== "game") return;
    const onStart = (e) => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; };
    const onEnd = (e) => {
      if (!touchRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchRef.current.x;
      const dy = t.clientY - touchRef.current.y;
      touchRef.current = null;
      if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        moveRef.current?.(dx > 0 ? DIR.RIGHT : DIR.LEFT);
      } else {
        moveRef.current?.(dy > 0 ? DIR.DOWN : DIR.UP);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, [screen]);

  /* ── D-pad callback ── */
  const onDpad = useCallback((dir, id) => {
    setPressedBtn(id);
    setTimeout(() => setPressedBtn(null), 120);
    moveRef.current?.(dir);
  }, []);

  /* ── Star calculation ── */
  const calcStars = useCallback((remainingInk) => {
    if (!level) return 0;
    if (remainingInk >= level.stars.three) return 3;
    if (remainingInk >= level.stars.two) return 2;
    return 1;
  }, [level]);

  const earnedStars = gameStatus === "won" ? calcStars(ink) : 0;

  // Save completion
  useEffect(() => {
    if (gameStatus === "won" && level) {
      setCompletedLevels(prev => {
        const existing = prev[level.id] || 0;
        if (earnedStars > existing) return { ...prev, [level.id]: earnedStars };
        return prev;
      });
    }
  }, [gameStatus, level, earnedStars]);

  /* ── Navigation ── */
  const goToLevels = useCallback(() => {
    setScreen("levels");
    setCurrentLevel(null);
  }, []);

  const nextLevel = useCallback(() => {
    if (!level) return;
    const idx = LEVELS.findIndex(l => l.id === level.id);
    if (idx < LEVELS.length - 1) {
      selectLevel(LEVELS[idx + 1].id);
    } else {
      goToLevels();
    }
  }, [level, selectLevel, goToLevels]);

  const retryLevel = useCallback(() => {
    if (level) selectLevel(level.id);
  }, [level, selectLevel]);

  /* ── Revealed percentage ── */
  const revealedPct = useMemo(() => {
    if (!level || !gridState) return 0;
    let walkable = 0;
    for (let y = 0; y < level.size; y++)
      for (let x = 0; x < level.size; x++)
        if (isWalkable(level.grid[y][x])) walkable++;
    if (walkable === 0) return 100;
    let revWalkable = 0;
    for (const key of revealed) {
      const [rx, ry] = key.split(",").map(Number);
      if (ry >= 0 && ry < level.size && rx >= 0 && rx < level.size && isWalkable(level.grid[ry][rx])) revWalkable++;
    }
    return Math.round((revWalkable / walkable) * 100);
  }, [level, gridState, revealed]);

  /* ══════ Render: Level Select ══════ */
  if (screen === "levels") {
    return (
      <div style={{
        minHeight: "100vh", background: "#fef9ef",
        backgroundImage: "linear-gradient(rgba(180,210,240,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(180,210,240,.25) 1px,transparent 1px)",
        backgroundSize: "20px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "'Patrick Hand',cursive", userSelect: "none", padding: 20, position: "relative",
      }}>
        <style>{css}</style>
        <BackButton onBack={onBack} />

        <div style={{ position: "fixed", left: 60, top: 0, bottom: 0, width: 2, background: "rgba(220,80,80,.3)", zIndex: 0 }} />
        <div style={{ position: "fixed", left: 63, top: 0, bottom: 0, width: 1, background: "rgba(220,80,80,.15)", zIndex: 0 }} />

        <h1 style={{
          fontFamily: "'Fredoka One',cursive", fontSize: "clamp(24px,5vw,40px)",
          margin: "0 0 8px", animation: "rainbow 4s linear infinite",
          textShadow: "2px 2px 0 rgba(0,0,0,.08)", letterSpacing: 2, zIndex: 1,
        }}>The Blank Page</h1>

        <p style={{ fontSize: "clamp(13px,2.5vw,16px)", color: "#888", margin: "0 0 16px", zIndex: 1, textAlign: "center" }}>
          Lo que no pintas, no existe
        </p>

        {/* Color selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, zIndex: 1 }}>
          {COLORS.map((c, i) => (
            <button key={c.name} onClick={() => setSelectedColor(i)} style={{
              width: 28, height: 28, borderRadius: "50%", border: selectedColor === i ? `3px solid ${c.shade}` : "2px solid rgba(0,0,0,.1)",
              background: c.body, cursor: "pointer", transform: selectedColor === i ? "scale(1.2)" : "scale(1)",
              transition: "all .2s", boxShadow: selectedColor === i ? `0 0 8px ${c.body}55` : "none",
            }} />
          ))}
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12,
          maxWidth: 320, width: "100%", zIndex: 1, animation: "fadeIn .5s ease",
        }}>
          {LEVELS.map((lvl) => {
            const stars = completedLevels[lvl.id] || 0;
            const unlocked = lvl.id === 1 || (completedLevels[lvl.id - 1] || 0) >= 1;
            return (
              <button key={lvl.id} onClick={() => unlocked && selectLevel(lvl.id)} disabled={!unlocked} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "14px 12px", background: stars > 0 ? "rgba(76,175,80,.08)" : unlocked ? "rgba(255,255,255,.85)" : "rgba(0,0,0,.04)",
                border: `2.5px solid ${stars > 0 ? "rgba(76,175,80,.3)" : unlocked ? "rgba(0,0,0,.1)" : "rgba(0,0,0,.05)"}`,
                borderRadius: 16, cursor: unlocked ? "pointer" : "default",
                boxShadow: unlocked ? "0 3px 12px rgba(0,0,0,.06)" : "none",
                transition: "all .2s", fontFamily: "'Patrick Hand',cursive", position: "relative",
                opacity: unlocked ? 1 : 0.5,
              }}
                onMouseEnter={(e) => { if (unlocked) e.currentTarget.style.transform = "scale(1.06) rotate(-0.5deg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: "clamp(18px,4vw,24px)", color: unlocked ? "#444" : "#aaa" }}>
                  {lvl.id}
                </span>
                <span style={{ fontSize: "clamp(11px,2vw,12px)", color: "#888" }}>
                  {lvl.name}
                </span>
                <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                  {[1, 2, 3].map(s => (
                    <span key={s} style={{ fontSize: 14, opacity: s <= stars ? 1 : 0.2 }}>
                      ★
                    </span>
                  ))}
                </div>
                {!unlocked && (
                  <span style={{ position: "absolute", top: 6, right: 8, fontSize: 14 }}>🔒</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ══════ Render: Game ══════ */
  if (!level || !gridState || !playerPos) return null;

  const inkPct = Math.max(0, ink / level.ink);
  const inkColor = inkPct > 0.5 ? "#4caf50" : inkPct > 0.25 ? "#ff9800" : "#e63946";

  return (
    <div style={{
      minHeight: "100vh", background: "#fef9ef",
      backgroundImage: "linear-gradient(rgba(180,210,240,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(180,210,240,.25) 1px,transparent 1px)",
      backgroundSize: "20px 20px",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Patrick Hand',cursive", userSelect: "none", padding: "20px 10px", position: "relative",
    }}>
      <style>{css}</style>
      <BackButton onBack={onBack} />

      <div style={{ position: "fixed", left: 60, top: 0, bottom: 0, width: 2, background: "rgba(220,80,80,.3)", zIndex: 0 }} />
      <div style={{ position: "fixed", left: 63, top: 0, bottom: 0, width: 1, background: "rgba(220,80,80,.15)", zIndex: 0 }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, zIndex: 1, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={goToLevels} style={{
          fontFamily: "'Patrick Hand',cursive", fontSize: 14, color: "#666",
          background: "rgba(255,255,255,.85)", border: "2px solid rgba(0,0,0,.12)",
          borderRadius: 14, padding: "5px 12px", cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,.06)",
        }}>← Niveles</button>
        <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: "clamp(14px,3vw,18px)", color: "#444" }}>
          {level.name}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: undosLeft }).map((_, i) => (
            <span key={i} style={{ fontSize: 16, cursor: "pointer", opacity: 0.7 }} onClick={undo} title="Deshacer">🧹</span>
          ))}
          {Array.from({ length: MAX_UNDOS - undosLeft }).map((_, i) => (
            <span key={`u${i}`} style={{ fontSize: 16, opacity: 0.2 }}>🧹</span>
          ))}
        </div>
      </div>

      {/* Board with border numbers */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Column numbers (top) */}
        <div style={{ display: "flex", marginLeft: 18, marginBottom: 2 }}>
          {borderNumbers.cols.map((n, i) => (
            <div key={i} style={{
              width: CELL, textAlign: "center", fontSize: Math.min(CELL * 0.55, 12),
              color: "rgba(120,100,80,.4)", fontFamily: "'Patrick Hand',cursive",
            }}>{n}</div>
          ))}
        </div>

        <div style={{ display: "flex" }}>
          {/* Row numbers (left) */}
          <div style={{ display: "flex", flexDirection: "column", marginRight: 2, justifyContent: "flex-start" }}>
            {borderNumbers.rows.map((n, i) => (
              <div key={i} style={{
                height: CELL, display: "flex", alignItems: "center", justifyContent: "center",
                width: 16, fontSize: Math.min(CELL * 0.55, 12),
                color: "rgba(120,100,80,.4)", fontFamily: "'Patrick Hand',cursive",
              }}>{n}</div>
            ))}
          </div>

          {/* Board */}
          <div style={{
            position: "relative", width: W, height: H,
            maxWidth: "calc(100vw - 60px)", aspectRatio: "1",
            border: "3px solid #999", borderRadius: 12, background: "#fffef7",
            boxShadow: "0 4px 24px rgba(0,0,0,.08),inset 0 0 30px rgba(0,0,0,.02)",
            overflow: "hidden", touchAction: "none",
          }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}
              style={{ position: "absolute", top: 0, left: 0, display: "block" }}>
              <defs>
                <filter id="crayon-rough-bp" x="-5%" y="-5%" width="110%" height="110%">
                  <feTurbulence type="turbulence" baseFrequency=".45" numOctaves="3" seed="3" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>

              {gridLines}

              {/* Render cells */}
              {Array.from({ length: level.size }).map((_, y) =>
                Array.from({ length: level.size }).map((_, x) => {
                  const key = cellKey(x, y);
                  const isRevealed = revealed.has(key);
                  const isShadow = shadowCells.has(key);
                  const cx = x * CELL, cy = y * CELL;
                  const ct = gridState[y][x];

                  if (!isRevealed) {
                    return (
                      <g key={key}>
                        <rect x={cx} y={cy} width={CELL} height={CELL}
                          fill="#e8e4dc" stroke="rgba(180,170,155,.15)" strokeWidth={0.5} />
                        {isShadow && (
                          <rect x={cx} y={cy} width={CELL} height={CELL}
                            fill="rgba(200,180,120,.08)" />
                        )}
                      </g>
                    );
                  }

                  // Revealed
                  if (ct === WALL) {
                    return (
                      <rect key={key} x={cx} y={cy} width={CELL} height={CELL}
                        fill="#555" filter="url(#crayon-rough-bp)" opacity={0.7} />
                    );
                  }

                  // Floor / exit / items
                  const ox = Math.sin(x * 3.7 + y * 2.1) * 0.6;
                  const oy = Math.cos(x * 2.3 + y * 3.9) * 0.6;
                  return (
                    <g key={key}>
                      <rect x={cx + ox} y={cy + oy} width={CELL - 1} height={CELL - 1}
                        fill={color.body} opacity={0.18} filter="url(#crayon-rough-bp)" rx={1} />
                      {ct === EXIT && (
                        <text x={cx + CELL / 2} y={cy + CELL / 2 + 1} textAnchor="middle" dominantBaseline="central"
                          fontSize={CELL * 0.7} style={{ animation: "pulse 1.5s ease-in-out infinite", transformOrigin: `${cx + CELL/2}px ${cy + CELL/2}px` }}>
                          🚪
                        </text>
                      )}
                      {ct === INK && (
                        <text x={cx + CELL / 2} y={cy + CELL / 2 + 1} textAnchor="middle" dominantBaseline="central"
                          fontSize={CELL * 0.6} style={{ animation: "wobble 2s ease-in-out infinite" }}>
                          🖊️
                        </text>
                      )}
                      {ct === ERASER && (
                        <text x={cx + CELL / 2} y={cy + CELL / 2 + 1} textAnchor="middle" dominantBaseline="central"
                          fontSize={CELL * 0.6}>
                          🩷
                        </text>
                      )}
                      {ct === SPILL && (
                        <text x={cx + CELL / 2} y={cy + CELL / 2 + 1} textAnchor="middle" dominantBaseline="central"
                          fontSize={CELL * 0.6} style={{ animation: "pulse 1.5s ease-in-out infinite", transformOrigin: `${cx + CELL/2}px ${cy + CELL/2}px` }}>
                          💧
                        </text>
                      )}
                    </g>
                  );
                })
              )}

              {/* Player */}
              <CrayonPlayer x={playerPos[0]} y={playerPos[1]} cell={CELL} dir={playerDir} color={color} />
            </svg>

            {/* Blind overlay */}
            {gameStatus === "blind" && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(30,20,10,.2)",
                animation: "blindPulse 2s ease-in-out infinite", pointerEvents: "none",
              }} />
            )}

            {/* Paper texture */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", opacity: .4,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23000' opacity='0.02'/%3E%3C/svg%3E")`,
            }} />

            {/* Win overlay */}
            {gameStatus === "won" && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                background: "rgba(254,249,239,.92)", animation: "fadeIn .4s ease", padding: 20, zIndex: 10,
              }}>
                <div style={{
                  fontFamily: "'Fredoka One',cursive", fontSize: "clamp(20px,4.5vw,30px)",
                  color: "#4caf50", marginBottom: 8, textShadow: "2px 2px 0 rgba(0,0,0,.06)",
                }}>
                  ¡Pagina Completa!
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {[1, 2, 3].map(s => (
                    <span key={s} style={{
                      fontSize: 28, transition: "all .3s",
                      opacity: s <= earnedStars ? 1 : 0.2,
                      animation: s <= earnedStars ? `fadeIn ${0.3 + s * 0.15}s ease` : "none",
                    }}>★</span>
                  ))}
                </div>
                <div style={{ fontSize: "clamp(12px,2.5vw,15px)", color: "#888", marginBottom: 12 }}>
                  Tinta restante: {ink}/{level.ink}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  {LEVELS.findIndex(l => l.id === level.id) < LEVELS.length - 1 && (
                    <button onClick={nextLevel} style={{
                      fontFamily: "'Fredoka One',cursive", fontSize: "clamp(12px,2.5vw,15px)", color: "#fff",
                      background: "#4caf50", border: "none", padding: "8px 20px", borderRadius: 25,
                      cursor: "pointer", boxShadow: "0 4px 14px rgba(76,175,80,.3)",
                    }}
                      onMouseEnter={(e) => { e.target.style.transform = "scale(1.08)"; }}
                      onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
                    >Siguiente →</button>
                  )}
                  {earnedStars < 3 && (
                    <button onClick={retryLevel} style={{
                      fontFamily: "'Fredoka One',cursive", fontSize: "clamp(12px,2.5vw,15px)", color: "#ff9800",
                      background: "rgba(255,255,255,.85)", border: "2px solid rgba(255,152,0,.3)",
                      padding: "8px 20px", borderRadius: 25, cursor: "pointer",
                    }}
                      onMouseEnter={(e) => { e.target.style.transform = "scale(1.08)"; }}
                      onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
                    >↻ Reintentar</button>
                  )}
                  <button onClick={goToLevels} style={{
                    fontFamily: "'Fredoka One',cursive", fontSize: "clamp(12px,2.5vw,15px)", color: "#666",
                    background: "rgba(255,255,255,.85)", border: "2px solid rgba(0,0,0,.12)",
                    padding: "8px 20px", borderRadius: 25, cursor: "pointer",
                  }}
                    onMouseEnter={(e) => { e.target.style.transform = "scale(1.08)"; }}
                    onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
                  >Niveles</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ink bar */}
      <div style={{ width: W + 18, maxWidth: "calc(100vw - 40px)", marginTop: 10, zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{
            flex: 1, height: 14, background: "rgba(0,0,0,.06)", borderRadius: 7,
            overflow: "hidden", position: "relative",
          }}>
            <div style={{
              width: `${inkPct * 100}%`, height: "100%", background: inkColor,
              borderRadius: 7, transition: "width .3s ease, background .3s ease",
              animation: "inkDrip 2s ease-in-out infinite",
            }} />
          </div>
          <span style={{ fontSize: "clamp(11px,2.5vw,14px)", color: "#666", fontFamily: "'Patrick Hand',cursive", minWidth: 60, textAlign: "right" }}>
            Tinta: {Math.max(0, ink)}/{level.ink}
          </span>
        </div>
        {gameStatus === "blind" && (
          <div style={{ fontSize: "clamp(11px,2.5vw,13px)", color: "#e63946", textAlign: "center", animation: "blink 1.5s ease-in-out infinite" }}>
            Sin tinta... sigue buscando la salida
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ fontSize: "clamp(11px,2.5vw,13px)", color: "#999", marginTop: 4, zIndex: 1 }}>
        Pasos: {steps} | Revelado: {revealedPct}%
      </div>

      {/* D-pad */}
      <div style={{
        display: "grid", gridTemplateColumns: "48px 48px 48px", gridTemplateRows: "48px 48px 48px",
        gap: 4, marginTop: 12, zIndex: 1,
      }}>
        <div />
        <DpadBtn label="▲" id="up" dir={DIR.UP} color={color} pressed={pressedBtn === "up"} onPress={onDpad} />
        <div />
        <DpadBtn label="◀" id="left" dir={DIR.LEFT} color={color} pressed={pressedBtn === "left"} onPress={onDpad} />
        <div style={{ width: 48, height: 48 }} />
        <DpadBtn label="▶" id="right" dir={DIR.RIGHT} color={color} pressed={pressedBtn === "right"} onPress={onDpad} />
        <div />
        <DpadBtn label="▼" id="down" dir={DIR.DOWN} color={color} pressed={pressedBtn === "down"} onPress={onDpad} />
        <div />
      </div>
    </div>
  );
}
