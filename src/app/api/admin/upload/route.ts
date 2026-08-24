import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Accepts a product photo and stores it in R2.
 *
 * Needs an R2 bucket bound as `MEDIA` in wrangler.jsonc. Without one this
 * returns a 503 that explains exactly what to create, rather than a stack
 * trace — the paste-a-URL path in the admin keeps working meanwhile, so the
 * shop is never blocked on infrastructure that hasn't been provisioned.
 */

const MAX_BYTES = 5 * 1024 * 1024;

// Only formats a browser will render as an image. SVG is deliberately absent:
// it is a document format that can carry script, and serving one from our own
// origin would be a stored-XSS hole.
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/gif", "gif"],
]);

type MediaBucket = {
  put: (key: string, value: ArrayBuffer, opts?: unknown) => Promise<unknown>;
};

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof AccessError ? err.message : "Not authorised." },
      { status: 403 },
    );
  }

  let bucket: MediaBucket | undefined;
  try {
    const env = (await getCloudflareContext({ async: true })).env as unknown as {
      MEDIA?: MediaBucket;
    };
    bucket = env.MEDIA;
  } catch {
    bucket = undefined;
  }

  if (!bucket) {
    return NextResponse.json(
      {
        error:
          "No image storage is set up yet. Create an R2 bucket in Cloudflare, bind it as " +
          "MEDIA in wrangler.jsonc, and redeploy. Until then, paste an image URL instead.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was sent." }, { status: 400 });
  }

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return NextResponse.json(
      { error: `${file.type || "That file type"} isn't allowed. Use JPG, PNG, WebP, AVIF or GIF.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.` },
      { status: 413 },
    );
  }

  // A random key, not the original filename. Filenames arrive from a browser
  // and can contain path separators, control characters, or another product's
  // name — none of which should decide where a file lands.
  const key = `products/${crypto.randomUUID()}.${ext}`;

  try {
    const bytes = await file.arrayBuffer();
    await bucket.put(key, bytes, {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
    });
  } catch (err) {
    console.error("[upload] R2 put failed:", err);
    return NextResponse.json({ error: "Storage rejected the file." }, { status: 502 });
  }

  // Served from the CDN subdomain, which must be mapped to the bucket in
  // Cloudflare. Kept in one place so a change of host is a one-line edit.
  return NextResponse.json({ ok: true, url: `https://cdn.duvcollections.com/${key}` });
}
