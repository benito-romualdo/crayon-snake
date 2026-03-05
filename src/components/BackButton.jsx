export default function BackButton({ onBack }) {
  return (
    <button
      onClick={onBack}
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 100,
        fontFamily: "'Patrick Hand',cursive",
        fontSize: 16,
        color: "#666",
        background: "rgba(255,255,255,.85)",
        border: "2px solid rgba(0,0,0,.12)",
        borderRadius: 14,
        padding: "6px 14px",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,.06)",
        transition: "all .2s",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "rgba(255,255,255,1)";
        e.target.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "rgba(255,255,255,.85)";
        e.target.style.transform = "scale(1)";
      }}
    >
      ← Volver
    </button>
  );
}
