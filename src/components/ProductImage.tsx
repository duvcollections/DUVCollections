import Image from "next/image";
import { categories } from "@/lib/catalog";
import { ProductArt } from "@/components/ProductArt";
import bundledImages from "@/data/product-images.json";

const PHOTOS = bundledImages as Record<string, string[]>;

/**
 * Photos for a SKU.
 *
 * Images saved through the admin (held on the product itself) win over the
 * bundled ingest file, because those are live and the JSON needs a rebuild.
 * The JSON stays as a fallback so anything already processed keeps working.
 */
export const photosFor = (sku: string, own?: string[]): string[] =>
  own && own.length > 0 ? own : (PHOTOS[sku] ?? []);

export const hasPhoto = (sku: string, own?: string[]) => photosFor(sku, own).length > 0;

/**
 * Photo URLs ready to hand to `next/image`.
 *
 * `photosFor` returns two different kinds of string: an absolute URL saved
 * through the admin, or a bare slug from the bundled ingest file that still
 * needs its directory and extension. Callers that render several photos at
 * once must not have to know the difference — getting it wrong yields a broken
 * image for exactly one of the two sources, which is the kind of bug that
 * survives review because the other source still looks fine.
 */
export const photoUrls = (sku: string, own?: string[]): string[] =>
  photosFor(sku, own).map((photo) =>
    photo.startsWith("http") ? photo : `/products/${photo}.webp`,
  );


/**
 * A product tile. Uses a real photograph the moment one exists at
 * public/products/<sku>.webp (run `npm run images:ingest`), and falls back to a
 * labelled illustration until then.
 *
 * The fallback is a drawing on purpose. A stock photo of "a gold chain" standing
 * in for CH004 would show the customer something they aren't going to receive —
 * which is how stores earn "item not as described" chargebacks.
 */
export function ProductImage({
  sku,
  category,
  art,
  title,
  className = "",
  compact = false,
  priority = false,
  productImages,
}: {
  sku: string;
  category: string;
  art: string;
  title: string;
  className?: string;
  compact?: boolean;
  priority?: boolean;
  /** Live image URLs from the product record; beats the bundled file. */
  productImages?: string[];
}) {
  const own = productImages ?? [];
  const photo = own[0] ?? PHOTOS[sku]?.[0];
  // A live URL is absolute and already sized; a bundled one is a local slug
  // that still needs its path and extension.
  const isRemote = photo?.startsWith("http");

  if (photo) {
    return (
      <div className={`relative overflow-hidden bg-white ${className}`}>
        <Image
          src={isRemote ? photo : `/products/${compact ? photo + "-sm" : photo}.webp`}
          alt={title}
          fill
          sizes={compact ? "112px" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"}
          className="object-contain"
          priority={priority}
        />
      </div>
    );
  }

  const cat = categories.find((c) => c.id === category);
  const seed = [...sku].reduce((a, ch) => a + ch.charCodeAt(0) * 7, 0);
  const inks = ["#00CFFF", "#FF2E93", "#FFC53D"];
  // Two inks, never three: two multiply into a clean secondary, three into mud.
  const blobs = [0, 1].map((i) => ({
    ink: inks[(seed + i) % 3],
    x: 18 + ((seed * (i + 3)) % 60),
    y: 14 + ((seed * (i + 5)) % 58),
    r: 34 + ((seed * (i + 2)) % 20),
  }));

  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      style={{ background: cat?.tint ?? "#F6EFF5" }}
      role="img"
      aria-label={`${title} — illustration; product photography in progress`}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <g filter="url(#pi-soft)" style={{ isolation: "isolate" }}>
          {blobs.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.ink} opacity="0.3"
              style={{ mixBlendMode: "multiply" }} />
          ))}
        </g>
        <defs>
          <filter id="pi-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
      </svg>

      <ProductArt type={art} className="absolute inset-[8%] h-[84%] w-[84%]" />

      {!compact && (
        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-white/75 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide text-duv-plum backdrop-blur-sm">
          {sku}
        </span>
      )}
    </div>
  );
}
