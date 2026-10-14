import { list } from "@vercel/blob";
import type { ShareMeta } from "./types";

export async function getShare(id: string): Promise<{ meta: ShareMeta; cardUrl: string } | null> {
  if (!/^[a-f0-9]{16}$/.test(id) || !process.env.BLOB_READ_WRITE_TOKEN) return null;

  const { blobs } = await list({ prefix: `shares/${id}/` });
  const card = blobs.find((b) => b.pathname.endsWith("card.jpg"));
  const metaBlob = blobs.find((b) => b.pathname.endsWith("meta.json"));
  if (!card || !metaBlob) return null;

  const res = await fetch(metaBlob.url, { cache: "force-cache" });
  if (!res.ok) return null;
  return { meta: (await res.json()) as ShareMeta, cardUrl: card.url };
}
