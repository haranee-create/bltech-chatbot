const PALETTE = [
  "#000000", "#808080", "#800000", "#808000", "#008000", "#008080", "#000080", "#800080",
  "#ffffff", "#c0c0c0", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff",
];

const MENU = ["파일", "편집", "보기", "이미지", "색", "도움말"];

/** 옛날 그림판 창 모양의 틀 */
export default function PaintWindow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="window">
      <div className="titlebar">
        <span className="titlebar-text">🖌️ {title}</span>
        <span className="titlebar-buttons" aria-hidden>
          <i>_</i>
          <i>□</i>
          <i>×</i>
        </span>
      </div>
      <nav className="menubar" aria-hidden>
        {MENU.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </nav>
      <div className="canvas-area">{children}</div>
      <div className="palette" aria-hidden>
        <span className="palette-current" />
        <div className="palette-grid">
          {PALETTE.map((c) => (
            <span key={c} style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}
