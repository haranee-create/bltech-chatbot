import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getShare } from "@/lib/shares";
import PaintWindow from "@/components/PaintWindow";

type Props = { params: Promise<{ id: string }> };

const load = cache(getShare);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const share = await load(id);
  if (!share) return { title: "그림을 찾을 수 없어요" };

  const { meta, cardUrl } = share;
  const title = `${meta.name} — ${meta.era} 시대의 ${meta.job}`;
  const description = `최후: ${meta.ending} · 당신의 ${meta.era} 시대 직업은?`;
  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      images: [{ url: cardUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [cardUrl] },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const share = await load(id);
  if (!share) notFound();
  const { meta, cardUrl } = share;

  return (
    <main className="desktop">
      <PaintWindow title={`${meta.name}.bmp - 그림판`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="share-card" src={cardUrl} alt={`${meta.name}의 초상`} />
        <section className="bio">
          <h2>
            {meta.name} <small>({meta.lifespan})</small>
          </h2>
          <p className="bio-job">{meta.job}</p>
          {meta.life_story.split(/\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
        <div className="actions">
          <Link href="/" className="btn btn-primary">
            당신의 {meta.era} 시대 직업은? ▶
          </Link>
        </div>
      </PaintWindow>
    </main>
  );
}
