const css = `
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Fredoka+One&display=swap');
@keyframes wobble{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes rainbow{0%{color:#e63946}16%{color:#ff9800}33%{color:#4caf50}50%{color:#2196F3}66%{color:#9c27b0}83%{color:#e91e8c}100%{color:#e63946}}
`;

export default function GameMenu({ games, onSelect }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fef9ef",
        backgroundImage:
          "linear-gradient(rgba(180,210,240,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(180,210,240,.25) 1px,transparent 1px)",
        backgroundSize: "20px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Patrick Hand',cursive",
        userSelect: "none",
        overflow: "hidden",
        position: "relative",
        padding: 20,
      }}
    >
      <style>{css}</style>

      {/* Margin lines */}
      <div style={{ position: "fixed", left: 60, top: 0, bottom: 0, width: 2, background: "rgba(220,80,80,.3)", zIndex: 0 }} />
      <div style={{ position: "fixed", left: 63, top: 0, bottom: 0, width: 1, background: "rgba(220,80,80,.15)", zIndex: 0 }} />

      {/* Title */}
      <h1
        style={{
          fontFamily: "'Fredoka One',cursive",
          fontSize: "clamp(28px,6vw,48px)",
          margin: "0 0 8px",
          animation: "rainbow 4s linear infinite",
          textShadow: "2px 2px 0 rgba(0,0,0,.08)",
          letterSpacing: 2,
          zIndex: 1,
        }}
      >
        Crayon Games
      </h1>

      <p
        style={{
          fontSize: "clamp(14px,3vw,18px)",
          color: "#888",
          margin: "0 0 32px",
          zIndex: 1,
          textAlign: "center",
        }}
      >
        Elige un minijuego para empezar
      </p>

      {/* Game cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          maxWidth: 600,
          width: "100%",
          zIndex: 1,
          animation: "fadeIn .5s ease",
        }}
      >
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelect(game.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "24px 20px",
              background: "rgba(255,255,255,.85)",
              border: "2.5px solid rgba(0,0,0,.1)",
              borderRadius: 18,
              cursor: "pointer",
              boxShadow: "0 3px 12px rgba(0,0,0,.06)",
              transition: "all .2s",
              fontFamily: "'Patrick Hand',cursive",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04) rotate(-0.5deg)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,.1)";
              e.currentTarget.style.borderColor = "rgba(0,0,0,.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,.06)";
              e.currentTarget.style.borderColor = "rgba(0,0,0,.1)";
            }}
          >
            <span style={{ fontSize: "clamp(36px,8vw,48px)", animation: "wobble 2s ease-in-out infinite" }}>
              {game.icon}
            </span>
            <span
              style={{
                fontFamily: "'Fredoka One',cursive",
                fontSize: "clamp(16px,3vw,20px)",
                color: "#444",
              }}
            >
              {game.name}
            </span>
            <span
              style={{
                fontSize: "clamp(12px,2.5vw,15px)",
                color: "#888",
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              {game.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
