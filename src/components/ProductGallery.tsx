"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * The photo viewer on a product page: one large image plus a thumbnail strip.
 *
 * Only rendered when there is at least one real photograph. A product with no
 * photos keeps the illustrated `ProductImage` fallback instead, so the "no
 * photography yet" path stays exactly as it was.
 *
 * Deliberate choices:
 *
 * 1. **A single photo renders no thumbnail strip.** A row of one thumbnail is
 *    visual noise that tells the customer nothing.
 *
 * 2. **Thumbnails are real buttons in a real list.** Keyboard users tab to
 *    them and press Enter; screen readers announce "image 2 of 5". Divs with
 *    click handlers would look identical and be unusable without a mouse.
 *
 * 3. **Every image stays mounted, hidden with opacity.** Swapping `src` on one
 *    element makes each thumbnail click trigger a fresh network fetch and a
 *    visible flash. Mounting all of them lets the browser cache do its job, so
 *    the second look at a photo is instant.
 *
 * 4. **Only the first image is eager.** The rest carry `loading="lazy"`, so a
 *    five-photo product does not push four unseen images into the critical
 *    path on a phone connection.
 */
export function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  // Defensive: an out-of-range index would render a blank frame. This can only
  // happen if the product is edited to have fewer photos while a page is open.
  const current = Math.min(active, images.length - 1);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-duv-line bg-white">
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={
              images.length > 1
                ? `${title} — photo ${i + 1} of ${images.length}`
                : title
            }
            fill
            sizes="(max-width: 1024px) 100vw, 600px"
            className="object-contain transition-opacity duration-200"
            style={{ opacity: i === current ? 1 : 0 }}
            priority={i === 0}
            loading={i === 0 ? undefined : "lazy"}
            // Hide the inactive copies from assistive tech, so a screen reader
            // does not read five alt texts for what looks like one image.
            aria-hidden={i === current ? undefined : true}
          />
        ))}
      </div>

      {images.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-2.5" role="list">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === current ? "true" : undefined}
                className={`relative block h-16 w-16 overflow-hidden rounded-xl border-2 bg-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-duv-violet ${
                  i === current
                    ? "border-duv-violet"
                    : "border-duv-line hover:border-duv-faint"
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain"
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
