import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import type { ShareMeta } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BYTES = 3 * 1024 * 1024;

/** 합성된 공유 카드 이미지를 Vercel Blob에 올리고 공유 페이지 주소를 돌려준다. */
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "공유 저장소(Vercel Blob)가 설정되지 않았습니다." }, { status: 501 });
  }

  const form = await req.formData();
  const card = form.get("card");
  const metaRaw = form.get("meta");
  if (!(card instanceof File) || card.type !== "image/jpeg" || card.size > MAX_BYTES || typeof metaRaw !== "string") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let meta: ShareMeta;
  try {
    const m = JSON.parse(metaRaw);
    meta = {
      name: clip(m.name, 40),
      job: clip(m.job, 40),
      ending: clip(m.ending, 80),
      lifespan: clip(m.lifespan, 30),
      life_story: clip(m.life_story, 2000),
      era: clip(m.era, 20),
    };
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await Promise.all([
    put(`shares/${id}/card.jpg`, card, { access: "public", contentType: "image/jpeg", addRandomSuffix: false }),
    put(`shares/${id}/meta.json`, JSON.stringify(meta), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    }),
  ]);

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  return NextResponse.json({ id, url: `${origin}/s/${id}` });
}

function clip(v: unknown, max: number) {
  return String(v ?? "").slice(0, max);
}
