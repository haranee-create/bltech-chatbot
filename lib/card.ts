"use client";

import { ERA_YEAR } from "./world";

export const CARD_W = 1200;
export const CARD_H = 630;
const FONT = "Gaegu";

type CardInfo = { name: string; job: string; ending: string; era: string };

/** 생성된 그림 + 이름/직업/최후 + 버튼을 1200×630 페이스북 공유용 이미지로 합성 */
export async function makeShareCard(imageSrc: string, info: CardInfo): Promise<Blob> {
  // 구글 폰트는 한글을 글자 범위별로 쪼개 내려주므로, 실제로 쓸 글자를 넘겨서 미리 받아둔다
  const text = `${ERA_YEAR}년 · 시대 이름 직업 최후 : 당신의 직업은? ▶…${info.era}${info.name}${info.job}${info.ending}`;
  await Promise.all([document.fonts.load(`700 40px ${FONT}`, text), document.fonts.load(`400 40px ${FONT}`, text)]).catch(
    () => {},
  );
  const img = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;

  // 배경
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 왼쪽: 그림
  const pad = 24;
  const side = CARD_H - pad * 2;
  ctx.drawImage(img, pad, pad, side, side);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#000";
  ctx.strokeRect(pad, pad, side, side);

  // 오른쪽: 텍스트
  const x = pad * 2 + side + 6;
  const maxW = CARD_W - x - pad;
  let y = 70;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#6b6b6b";
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(`${ERA_YEAR}년 · ${info.era} 시대`, x, y);
  y += 22;

  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, maxW, 3);
  y += 58;

  y = drawField(ctx, "이름", info.name, x, y, maxW, 46, 2);
  y += 18;
  y = drawField(ctx, "직업", info.job, x, y, maxW, 40, 2);
  y += 18;
  drawField(ctx, "최후", info.ending, x, y, maxW, 36, 4);

  // 하단 버튼
  const label = `당신의 ${info.era} 시대 직업은? ▶`;
  const bx = x;
  const by = CARD_H - pad - 84;
  const bw = maxW;
  const bh = 76;
  ctx.fillStyle = "#000";
  ctx.fillRect(bx + 6, by + 6, bw, bh);
  ctx.fillStyle = "#ffe14d";
  ctx.fillRect(bx, by, bw, bh);
  ctx.lineWidth = 4;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = "#000";
  ctx.font = `700 ${fitFont(ctx, label, bw - 30, 36)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(label, bx + bw / 2, by + bh / 2 + 12);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("카드 생성 실패"))), "image/jpeg", 0.9),
  );
}

function drawField(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  maxW: number,
  size: number,
  maxLines: number,
) {
  ctx.font = `700 ${size}px ${FONT}`;
  const head = `${label} : `;
  const headW = ctx.measureText(head).width;
  ctx.fillStyle = "#000080";
  ctx.fillText(head, x, y);

  ctx.fillStyle = "#000";
  ctx.font = `400 ${size}px ${FONT}`;
  const lines = wrap(ctx, value, maxW - headW, maxLines);
  const lh = Math.round(size * 1.2);
  lines.forEach((line, i) => ctx.fillText(line, x + headW, y + i * lh));
  return y + (lines.length - 1) * lh + lh;
}

/** 띄어쓰기 기준 줄바꿈, 한 단어가 너무 길면 글자 단위로 자른다 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const fits = (t: string) => ctx.measureText(t).width <= maxW;
  const lines: string[] = [];
  let cur = "";
  for (const word of text.trim().split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (fits(next)) {
      cur = next;
      continue;
    }
    if (cur) lines.push(cur);
    cur = "";
    for (const ch of Array.from(word)) {
      if (!fits(cur + ch) && cur) {
        lines.push(cur);
        cur = "";
      }
      cur += ch;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines;

  const out = lines.slice(0, maxLines);
  let last = out[maxLines - 1];
  while (last && !fits(last + "…")) last = last.slice(0, -1);
  out[maxLines - 1] = last + "…";
  return out;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number) {
  let size = start;
  while (size > 18) {
    ctx.font = `700 ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 2;
  }
  return size;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = src;
  });
}

/** 업로드 전에 사진을 최대 1024px JPEG로 줄인다 (Vercel 요청 크기 제한 대비) */
export async function shrinkPhoto(file: File, max = 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("사진 변환 실패"))), "image/jpeg", 0.9),
  );
}
