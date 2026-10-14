"use client";

import { useEffect, useState } from "react";
import PaintWindow from "./PaintWindow";
import { makeShareCard, shrinkPhoto } from "@/lib/card";
import { ERA_LABEL, ERA_YEAR } from "@/lib/world";
import type { GenerateResponse } from "@/lib/types";

const LOADING_LINES = [
  "그림판을 켜는 중...",
  "마우스 펜 도구를 고르는 중...",
  "100년 뒤로 타임워프 중...",
  "미래 직업 제비뽑기 중...",
  "손을 덜덜 떨면서 선 긋는 중...",
  "페인트통으로 대충 색칠하는 중...",
  "삐져나간 색 못 본 척하는 중...",
  "생애를 지어내는 중...",
];

type Phase = "idle" | "loading" | "done";

export default function Studio() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (phase !== "loading") return;
    const t = setInterval(() => setTick((n) => n + 1), 2600);
    return () => clearInterval(t);
  }, [phase]);

  // 결과가 나오면 공유 카드를 미리 합성
  useEffect(() => {
    if (!result) return;
    let url: string | null = null;
    const c = result.character;
    makeShareCard(result.image, { name: c.name, job: c.job, ending: c.ending, era: result.era })
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setCard({ blob, url });
      })
      .catch(() => setCard(null));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [result]);

  function choose(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    setError(null);
    setPhoto(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  }

  async function generate() {
    if (!photo) return;
    setPhase("loading");
    setError(null);
    setResult(null);
    setCard(null);
    setShareUrl(null);
    try {
      const small = await shrinkPhoto(photo);
      const fd = new FormData();
      fd.append("image", small, "photo.jpg");
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({ error: "서버 응답을 읽지 못했어요." }));
      if (!res.ok) throw new Error(data.error || "그림을 그리지 못했어요.");
      setResult(data as GenerateResponse);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "그림을 그리지 못했어요.");
      setPhase("idle");
    }
  }

  async function uploadShare(): Promise<string | null> {
    if (shareUrl) return shareUrl;
    if (!card || !result) return null;
    const c = result.character;
    const fd = new FormData();
    fd.append("card", card.blob, "card.jpg");
    fd.append(
      "meta",
      JSON.stringify({
        name: c.name,
        job: c.job,
        ending: c.ending,
        lifespan: c.lifespan,
        life_story: c.life_story,
        era: result.era,
      }),
    );
    const res = await fetch("/api/share", { method: "POST", body: fd });
    if (!res.ok) return null;
    const { url } = await res.json();
    setShareUrl(url);
    return url;
  }

  async function shareFacebook() {
    if (!card) return;
    // 팝업 차단을 피하려고 클릭 즉시 창을 먼저 연다
    const popup = window.open("about:blank", "fbshare", "width=640,height=640");
    setSharing(true);
    try {
      const url = await uploadShare();
      const target = url ?? window.location.origin;
      if (!url) {
        downloadCard();
        alert("공유 링크 저장소가 설정되지 않아 이미지를 내려받았어요.\n페이스북 글쓰기에 이미지를 직접 첨부해 주세요.");
      }
      const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(target)}`;
      if (popup && !popup.closed) popup.location.href = fb;
      else window.open(fb, "_blank");
    } catch {
      popup?.close();
      setError("공유 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSharing(false);
    }
  }

  async function shareNative() {
    if (!card || !result) return;
    const file = new File([card.blob], `${result.character.name}.jpg`, { type: "image/jpeg" });
    const text = `나는 ${ERA_YEAR}년 ${result.era} 시대의 ${result.character.job}! 당신의 ${result.era} 시대 직업은?`;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, url: shareUrl ?? window.location.origin });
      } else {
        downloadCard();
      }
    } catch {
      /* 사용자가 공유 창을 닫음 */
    }
  }

  function downloadCard() {
    if (!card || !result) return;
    const a = document.createElement("a");
    a.href = card.url;
    a.download = `${result.character.name}_${ERA_LABEL}시대.jpg`;
    a.click();
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setCard(null);
    setShareUrl(null);
    setPhoto(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }

  if (phase === "done" && result) {
    const c = result.character;
    return (
      <PaintWindow title={`${c.name}.bmp - 그림판`}>
        <div className="result">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="portrait" src={result.image} alt={`${c.name}의 그림판 초상`} />
          <dl className="stats">
            <dt>이름</dt>
            <dd>{c.name}</dd>
            <dt>직업</dt>
            <dd>{c.job}</dd>
            <dt>생몰</dt>
            <dd>{c.lifespan}</dd>
            <dt>최후</dt>
            <dd>{c.ending}</dd>
          </dl>
        </div>

        <section className="bio">
          <h2>{c.name}의 생애</h2>
          <p className="bio-scene">📜 연관 사건: {c.linked_scene}</p>
          {c.life_story.split(/\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        <div className="actions">
          <button className="btn btn-fb" onClick={shareFacebook} disabled={!card || sharing}>
            {sharing ? "공유 준비 중..." : "페이스북에 공유하기"}
          </button>
          <button className="btn" onClick={shareNative} disabled={!card}>
            다른 앱으로 공유
          </button>
          <button className="btn" onClick={downloadCard} disabled={!card}>
            공유 이미지 저장
          </button>
          <button className="btn" onClick={reset}>
            새로 그리기
          </button>
        </div>

        {card && (
          <figure className="card-preview">
            <figcaption>공유될 이미지 미리보기</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.url} alt="공유 카드 미리보기" />
          </figure>
        )}
        {shareUrl && (
          <p className="share-link">
            공유 링크: <a href={shareUrl}>{shareUrl}</a>
          </p>
        )}
        {error && <p className="error">⚠️ {error}</p>}
      </PaintWindow>
    );
  }

  return (
    <PaintWindow title="제목 없음 - 그림판">
      <div className="intro">
        <h1>
          {ERA_YEAR}년, <span className="hl">{ERA_LABEL} 시대</span>의 나는?
        </h1>
        <p>
          사람이나 동물 사진을 올리면, 100년 뒤 미래에서 랜덤으로 뽑힌 직업의 모습으로
          <br />
          그림판에서 마우스로 대충 그린 초상화와 그 생애를 만들어 드려요.
        </p>
      </div>

      <label
        className={`dropzone ${preview ? "has-photo" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          choose(e.dataTransfer.files[0]);
        }}
      >
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => choose(e.target.files?.[0])}
          disabled={phase === "loading"}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="올린 사진" />
        ) : (
          <span>
            📷 여기를 눌러 사진 고르기
            <br />
            <small>또는 사진을 끌어다 놓기</small>
          </span>
        )}
      </label>

      <div className="actions">
        <button className="btn btn-primary" onClick={generate} disabled={!photo || phase === "loading"}>
          {phase === "loading" ? LOADING_LINES[tick % LOADING_LINES.length] : "🖌️ 그림판으로 그려줘!"}
        </button>
      </div>
      {phase === "loading" && <p className="hint">보통 30초 ~ 1분 정도 걸려요. 창을 닫지 말아 주세요.</p>}
      {error && <p className="error">⚠️ {error}</p>}
      <p className="hint">올린 사진은 그림 생성에만 쓰이고 이 서비스에 저장되지 않아요.</p>
    </PaintWindow>
  );
}
