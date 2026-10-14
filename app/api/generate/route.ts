import { NextResponse } from "next/server";
import { APIError } from "openai";
import { drawPaintPortrait, writeCharacter } from "@/lib/openai";
import { ERA_LABEL } from "@/lib/world";
import type { GenerateResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) return error("이미지를 올려주세요.", 400);
    if (!ALLOWED.includes(file.type)) return error("JPG, PNG, WEBP 이미지만 올릴 수 있어요.", 400);
    if (file.size > MAX_BYTES) return error("이미지가 너무 커요 (최대 4MB).", 413);

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const draft = await writeCharacter(dataUrl);
    const image = await drawPaintPortrait(buffer, file.type, draft);

    const body: GenerateResponse = {
      era: ERA_LABEL,
      image,
      character: {
        subject_type: draft.subject_type,
        name: draft.name,
        job: draft.job,
        lifespan: draft.lifespan,
        ending: draft.ending,
        life_story: draft.life_story,
        linked_scene: draft.linked_scene,
      },
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error(e);
    if (e instanceof APIError) {
      if (e.code === "moderation_blocked" || e.code === "content_policy_violation") {
        return error("이 사진은 그릴 수 없다고 하네요. 다른 사진으로 시도해 주세요.", 400);
      }
      if (e.status === 401) return error("OpenAI API 키가 올바르지 않습니다.", 500);
      if (e.status === 429) return error("요청이 몰려 있어요. 잠시 후 다시 시도해 주세요.", 429);
      return error(`OpenAI 오류: ${e.message}`, 502);
    }
    return error(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.", 500);
  }
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
