"use client";

import { useState } from "react";
import { checkImageUrl, MAX_IMAGES } from "@/lib/product-images";

/**
 * Photo list for one product.
 *
 * Two ways in — paste a URL, or upload a file. The paste path works today; the
 * upload path needs an R2 bucket bound as `MEDIA`, and says so plainly rather
 * than failing with a stack trace when one isn't there.
 *
 * Order matters: the first image is the one shown on the shop tile, in search
 * results and in the Google feed, so reordering is a real editorial act rather
 * than a nicety.
 */
export function ImageEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function addUrl() {
    const checked = checkImageUrl(url);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    if (value.includes(checked.url)) {
      setError("That image is already on this product.");
      return;
    }
    if (value.length >= MAX_IMAGES) {
      setError(`${MAX_IMAGES} images is the limit.`);
      return;
    }
    setError(null);
    setUrl("");
    onChange([...value, checked.url]);
  }

  async function upload(file: File) {
    setError(null);

    // Checked here as well as on the server. This one is about telling the
    // person immediately rather than after a slow upload that ends in a 400.
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`);
      return;
    }
    if (value.length >= MAX_IMAGES) {
      setError(`${MAX_IMAGES} images is the limit.`);
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? `Upload failed (${res.status}).`);
      } else {
        onChange([...value, data.url]);
      }
    } catch {
      setError("Couldn't reach the server.");
    }
    setUploading(false);
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="rounded-2xl border border-duv-line bg-white p-5">
      <h3 className="text-[13px] font-bold text-duv-plum">Photos</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-duv-faint-ink">
        The first image is the one shown on the shop tile and sent to Google. Drag order with
        the arrows. Until a product has one, the site draws a labelled illustration instead.
      </p>

      {value.length > 0 && (
        <ul className="mt-4 space-y-2">
          {value.map((src, i) => (
            <li
              key={src}
              className="flex items-center gap-3 rounded-xl border border-duv-line p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary remote URL; not worth the optimiser */}
              <img
                src={src}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-lg border border-duv-line object-contain"
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-duv-muted">
                {i === 0 && (
                  <span className="mr-2 rounded-full bg-duv-mint/30 px-2 py-0.5 text-[10.5px] font-bold text-duv-green-ink">
                    MAIN
                  </span>
                )}
                {src}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move image ${i + 1} earlier`}
                  className="rounded-lg border border-duv-line px-2 py-1 text-[12px] text-duv-muted hover:border-duv-violet disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === value.length - 1}
                  aria-label={`Move image ${i + 1} later`}
                  className="rounded-lg border border-duv-line px-2 py-1 text-[12px] text-duv-muted hover:border-duv-violet disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, n) => n !== i))}
                  aria-label={`Remove image ${i + 1}`}
                  className="rounded-lg border border-duv-line px-2 py-1 text-[12px] font-bold text-duv-coral hover:border-duv-coral"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            // Enter inside a nested field would otherwise submit the whole
            // product form, saving a half-finished edit.
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="https://i.ebayimg.com/… or paste any image URL"
          aria-label="Image URL"
          className="w-full rounded-xl border border-duv-line bg-white px-3.5 py-2.5 text-[13.5px] focus:border-duv-violet focus:outline-none"
        />
        <button
          type="button"
          onClick={addUrl}
          className="rounded-xl border border-duv-line px-4 py-2.5 text-[13.5px] font-bold text-duv-plum hover:border-duv-violet hover:text-duv-violet"
        >
          Add URL
        </button>
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-duv-line px-4 py-3 text-[13px] text-duv-muted hover:border-duv-violet">
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            // Reset so re-picking the same file fires change again.
            e.target.value = "";
          }}
        />
        <span className="font-bold text-duv-plum">
          {uploading ? "Uploading…" : "Upload a photo"}
        </span>
        <span className="text-duv-faint-ink">JPG, PNG or WebP · up to 5 MB</span>
      </label>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-duv-coral/15 px-4 py-2.5 text-[12.5px] font-semibold text-duv-coral">
          {error}
        </p>
      )}
    </div>
  );
}
