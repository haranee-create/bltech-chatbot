import Link from "next/link";
import PaintWindow from "@/components/PaintWindow";

export default function NotFound() {
  return (
    <main className="desktop">
      <PaintWindow title="오류 - 그림판">
        <div className="intro">
          <h1>그림을 찾을 수 없어요</h1>
          <p>링크가 잘못되었거나 지워진 그림이에요.</p>
        </div>
        <div className="actions">
          <Link href="/" className="btn btn-primary">나도 그려보기 ▶</Link>
        </div>
      </PaintWindow>
    </main>
  );
}
