# 당신의 부유도시 시대 직업은? 🖌️

사람이나 동물 사진을 올리면 **100년 뒤(2126년) 미래 직업** 하나가 랜덤으로 뽑히고,
그 직업의 옷을 입은 모습을 **그림판에서 마우스로 대충 그린 그림**으로 바꿔 준 뒤
이름 · 직업 · 최후 · 생애를 지어 주는 웹서비스입니다.

- 그림: `gpt-image-2.5-sunburst` (Image API `images.edit`)
- 작문: `gpt-5.6-terra` (Responses API, 구조화 출력)
- 공유: 그림 + 이름/직업/최후 + "당신의 ○○ 시대 직업은?" 버튼을 1200×630 이미지로 합성 → 페이스북 공유

## 로컬 실행

```bash
npm install
```

`.env` 파일의 `OPENAI_API_KEY=` 뒤에 키를 넣고:

```bash
npm run dev
```

http://localhost:3000 접속.

## Vercel 배포

1. Vercel에서 이 GitHub 저장소를 Import
2. **Settings → Environment Variables** 에 `OPENAI_API_KEY` 추가
3. **Storage → Create → Blob** 으로 Blob 저장소를 만들고 프로젝트에 연결
   (`BLOB_READ_WRITE_TOKEN` 이 자동으로 들어갑니다 — 페이스북 공유 링크용)
4. (선택) 커스텀 도메인을 쓰면 `NEXT_PUBLIC_SITE_URL` 에 주소를 넣기
5. Redeploy

> Blob 없이도 서비스는 동작합니다. 이 경우 페이스북 버튼은 공유 이미지를 내려받게 하고
> 사이트 주소만 공유합니다. (페이스북은 링크의 미리보기 이미지만 가져가기 때문에,
> 합성 이미지가 보이게 공유하려면 이미지를 공개 URL로 올려 둘 곳이 필요합니다.)

## 구조

| 파일 | 역할 |
| --- | --- |
| `lib/world.ts` | **세계관 · 장면 · 직업 · 결말 톤 목록** — 여기만 고치면 세계관이 바뀝니다 |
| `lib/openai.ts` | 작문(gpt-5.6-terra) / 그림(gpt-image-2.5-sunburst) 호출과 프롬프트 |
| `app/api/generate` | 사진 → 캐릭터 생성 API |
| `app/api/share` | 합성 카드를 Blob에 올리고 공유 링크 발급 |
| `app/s/[id]` | 공유 페이지 (페이스북 미리보기용 og:image 포함) |
| `lib/card.ts` | 공유 카드 합성(canvas), 업로드 전 사진 축소 |

## 비용 주의

배포된 사이트는 누구나 쓸 수 있고, 한 번 생성할 때마다 내 API 키로 그림 1장 + 글 1편 비용이 나갑니다.
OpenAI 대시보드에서 사용 한도(Usage limit)를 꼭 걸어 두세요. 그림 품질은 `IMAGE_QUALITY`(기본 `medium`)로 조절합니다.
