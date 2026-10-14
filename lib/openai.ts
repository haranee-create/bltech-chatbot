import OpenAI, { APIError, toFile } from "openai";
import type { Character } from "./types";
import { ERA_LABEL, ERA_YEAR, FATE_TONES, FUTURE_JOBS, WORLD_SCENES, WORLD_SUMMARY, pick } from "./world";

const IMAGE_MODEL = process.env.IMAGE_MODEL || "gpt-image-2.5-sunburst";
const TEXT_MODEL = process.env.TEXT_MODEL || "gpt-5.6-terra";
const IMAGE_QUALITY = (process.env.IMAGE_QUALITY || "medium") as "low" | "medium" | "high" | "xhigh" | "max";
const TEXT_REASONING = (process.env.TEXT_REASONING || "low") as "none" | "low" | "medium" | "high";

let client: OpenAI | null = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다. .env 파일(또는 Vercel 환경변수)에 키를 넣어주세요.");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/** 작문 모델 출력 스키마 (텍스트 + 그림 프롬프트용 묘사) */
type CharacterDraft = Character & {
  subject_visual: string;
  outfit_prompt: string;
  background_prompt: string;
};

const CHARACTER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "subject_type",
    "subject_visual",
    "name",
    "job",
    "lifespan",
    "outfit_prompt",
    "background_prompt",
    "ending",
    "life_story",
    "linked_scene",
  ],
  properties: {
    subject_type: { type: "string", enum: ["human", "animal"] },
    subject_visual: {
      type: "string",
      description:
        "English. Identifying visual traits of the subject in the photo (species/breed if animal, hair, glasses, face shape, fur color, expression). No names.",
    },
    name: { type: "string", description: "한국어. 직업에 걸맞은 미래식 이름 또는 별명 (예: '번개손 구도삼', '츄르공 나비')." },
    job: { type: "string", description: "한국어. 최종 직업명 (짧게)." },
    lifespan: { type: "string", description: "생몰년. 예: '2091 ~ 2147'. 반드시 2126년을 포함." },
    outfit_prompt: {
      type: "string",
      description:
        "English. Concrete outfit, gear and props for this future job, to be drawn on the subject. Family-friendly: no weapons, blood, injuries or revealing clothes (swap them for harmless props).",
    },
    background_prompt: {
      type: "string",
      description: "English. One or two tiny props from the linked world scene to doodle in the background (a few words).",
    },
    ending: { type: "string", description: "한국어. 최후를 한 줄로 (40자 이내)." },
    life_story: {
      type: "string",
      description: "한국어. 출생부터 최후까지의 생애 서술. 3~4문단, 500~800자. 문단 사이는 빈 줄.",
    },
    linked_scene: { type: "string", description: "한국어. 생애에 엮은 세계관 장면의 짧은 이름." },
  },
} as const;

export async function writeCharacter(imageDataUrl: string): Promise<CharacterDraft> {
  const job = pick(FUTURE_JOBS);
  const scene = pick(WORLD_SCENES);
  const tone = pick(FATE_TONES);

  const instructions = `너는 미래 세계관 작가다. 아래 세계관 안에서, 사진 속 인물(또는 동물)이 ${ERA_YEAR}년에 살아가는 캐릭터의 일생을 지어낸다.

[세계관]
${WORLD_SUMMARY}

[규칙]
- 사진 속 대상이 사람이면 사람으로, 동물이면 그 동물 그대로(말하는 동물 시민 등) 캐릭터를 만든다.
- 배정된 직업을 그대로 쓰거나, 같은 결의 더 구체적인 직함으로 다듬어도 된다. 동물에게 어울리게 변형해도 좋다.
- 생애에는 반드시 배정된 세계관 장면을 하나의 결정적인 사건으로 엮는다. 그 장면 속 구체적인 순간(소리, 냄새, 대사 한 줄)을 묘사하라.
- 결말 톤을 지켜라. 비참하거나 우스꽝스러운 최후도 괜찮고, 판타지적이어도 괜찮다. 단, 세계관과 시대상에는 맞아야 한다.
- 실존 인물의 이름을 붙이거나 사진 속 인물이 누구인지 추측하지 마라. 외모를 비하하지 마라.
- 문체: 담담한 전기체 + 약간의 블랙유머. 한국어.`;

  const userText = `배정된 직업: ${job}
엮을 세계관 장면: ${scene}
결말 톤: ${tone}
사진을 보고 캐릭터를 만들어줘.`;

  const res = await getClient().responses.create({
    model: TEXT_MODEL,
    reasoning: { effort: TEXT_REASONING },
    instructions,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: userText },
          { type: "input_image", image_url: imageDataUrl, detail: "low" },
        ],
      },
    ],
    text: {
      format: { type: "json_schema", name: "future_character", strict: true, schema: CHARACTER_SCHEMA },
    },
  });

  return JSON.parse(res.output_text) as CharacterDraft;
}

// 주의: "pixel"이라는 단어를 넣으면 픽셀아트 일러스트처럼 너무 잘 그려진다.
const PAINT_STYLE = `Turn this photo into a deliberately BAD, crude doodle that someone made in 3 minutes in old Microsoft Paint using only a computer mouse.

How it must look:
- Thick, shaky, wobbly black outlines drawn with the mouse brush tool; lines overshoot, don't close properly, corners are lumpy.
- Flat paint-bucket fills from the basic Paint palette (pure red, yellow, blue, green, brown, peach skin, grey, purple). Fills leak past the lines or leave white gaps.
- Childish, simplified anatomy: big lopsided head, dot eyes, one-line mouth, sausage arms, mitten hands — like a non-artist drew it.
- Mostly empty pure white canvas.
- Absolutely NOT pixel art, NOT anime, NOT a polished illustration. NO shading, NO gradients, NO texture, NO fine detail, NO text or letters.`;

export async function drawPaintPortrait(image: Buffer, mimeType: string, draft: CharacterDraft): Promise<string> {
  const subject = draft.subject_type === "animal" ? "animal" : "person";
  const prompt = `${PAINT_STYLE}

Keep it recognizable only through a few key traits: ${draft.subject_visual}.
Draw the ${subject} as a worker of the year ${ERA_YEAR} (floating sky cities above a flooded Earth): ${draft.outfit_prompt} — reduced to a few crude shapes.
Tiny background doodle (optional): ${draft.background_prompt}.
Keep it wholesome and family-friendly: no weapons, no blood, no injuries, fully clothed.`;

  try {
    return await editImage(image, mimeType, prompt);
  } catch (e) {
    // 출력 그림이 안전 필터에 걸리면, 배경을 빼고 소품을 순하게 바꿔 한 번 더 시도한다
    if (!(e instanceof APIError) || e.code !== "moderation_blocked") throw e;
    console.warn("moderation_blocked, retrying", JSON.stringify({
      job: draft.job,
      outfit: draft.outfit_prompt,
      details: (e.error as { moderation_details?: unknown } | undefined)?.moderation_details,
    }));
    const safer = `${PAINT_STYLE}

Keep it recognizable only through a few key traits: ${draft.subject_visual}.
Draw the ${subject} smiling, wearing a simple futuristic work uniform with one harmless tool. Plain white background. Cute and wholesome.`;
    return await editImage(image, mimeType, safer);
  }
}

async function editImage(image: Buffer, mimeType: string, prompt: string) {
  const result = await getClient().images.edit({
    model: IMAGE_MODEL,
    image: await toFile(image, mimeType === "image/png" ? "photo.png" : "photo.jpg", { type: mimeType }),
    prompt,
    size: "1024x1024",
    quality: IMAGE_QUALITY,
    output_format: "webp",
    output_compression: 92,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지 생성 결과가 비어 있습니다.");
  return `data:image/webp;base64,${b64}`;
}
