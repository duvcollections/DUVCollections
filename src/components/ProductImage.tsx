import { categories } from "@/lib/catalog";
import { ProductArt } from "@/components/ProductArt";

/**
 * The product tile: a soft ink wash unique to the SKU, with an illustration of
 * what the product actually is sitting on top.
 *
 * These are drawings, not photographs, and are labelled as such — a generated
 * image dressed up as a photo would misrepresent what arrives in the box.
 */
export function ProductImage({
  sku,
  category,
  art,
  title,
  className = "",
  compact = false,
}: {
  sku: string;
  category: string;
  art: string;
  title: string;
  className?: string;
  compact?: boolean;
}) {
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
