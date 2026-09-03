/**
 * The homepage hero artwork.
 *
 * ---------------------------------------------------------------------------
 * Why artwork and not photographs
 * ---------------------------------------------------------------------------
 * The shop's product photography is marketplace-quality — mixed resolutions
 * (one shot is 800x600), aspect ratios from 0.75 to 2.13, and inconsistent
 * backgrounds. Cropping that into a hero collage reads as a listing page, not
 * a brand.
 *
 * The alternative that was NOT taken: generating photorealistic images of the
 * products. A generated aviator or gold chain is not the item that ships, and
 * a customer who buys from that picture has a legitimate "not as described"
 * claim — the same reason ProductImage falls back to an illustration rather
 * than a stock photo. Merchant Center rejects it too.
 *
 * So this is abstract: the shop's own overprint language — three translucent
 * inks that mix where they overlap, exactly as the logo does — rendered large.
 * It carries the brand without claiming to be a product. Real photographs live
 * in the grid below, where they are honest, in context, and clickable.
 *
 * ---------------------------------------------------------------------------
 * Construction
 * ---------------------------------------------------------------------------
 * Inline SVG rather than an image file: it is a few hundred bytes gzipped,
 * scales to any viewport without a second asset, needs no image optimisation
 * round-trip through the Worker, and costs nothing on the CDN.
 *
 * `mix-blend-mode: multiply` is what makes this the brand's system rather than
 * three coloured circles — cyan over pink genuinely produces the violet in the
 * logo, the same way wet ink overprints on press. Two inks per overlap, never
 * three: three multiply into mud.
 */
export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded-[28px] bg-duv-cream ring-1 ring-duv-line ${className}`}
      role="img"
      aria-label="DUV Collections — overlapping print inks in cyan, pink and amber"
    >
      <svg
        viewBox="0 0 600 480"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Soft edges so the inks read as pigment spreading into paper
              rather than as vector shapes with hard boundaries. */}
          <filter id="ha-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="26" />
          </filter>
          <filter id="ha-blur-tight" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>

          {/* Halftone dots — the texture of actual screen printing, and the
              detail that stops this reading as a generic gradient mesh. */}
          <pattern id="ha-dots" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.15" fill="#2E1065" opacity="0.5" />
          </pattern>

          <linearGradient id="ha-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* --- the three inks -------------------------------------------- */}
        <g filter="url(#ha-blur)" style={{ isolation: "isolate" }}>
          <circle cx="215" cy="185" r="170" fill="#00CFFF" opacity="0.62"
                  style={{ mixBlendMode: "multiply" }} />
          <circle cx="370" cy="215" r="155" fill="#FF2E93" opacity="0.58"
                  style={{ mixBlendMode: "multiply" }} />
          <circle cx="292" cy="330" r="140" fill="#FFC53D" opacity="0.60"
                  style={{ mixBlendMode: "multiply" }} />
        </g>

        {/* A tighter core so the centre has a focal point instead of being
            uniformly soft across the whole frame. */}
        <g filter="url(#ha-blur-tight)" style={{ isolation: "isolate" }}>
          <circle cx="300" cy="245" r="52" fill="#7B3FF2" opacity="0.30"
                  style={{ mixBlendMode: "multiply" }} />
        </g>

        {/* --- print texture --------------------------------------------- */}
        {/* Clipped to a band so the halftone reads as a registration detail
            rather than a screen door laid over the entire image. */}
        <rect x="0" y="300" width="600" height="180" fill="url(#ha-dots)" opacity="0.13" />

        {/* --- registration marks ---------------------------------------- */}
        {/* The crosshairs a printer uses to line up colour separations. Small,
            in the corners, at low opacity: the kind of detail that signals
            "this is a print shop" to anyone who knows, and reads as texture to
            everyone else. */}
        <g stroke="#2E1065" strokeWidth="1.1" opacity="0.22" fill="none">
          <g transform="translate(44,44)">
            <circle r="9" />
            <path d="M-15 0H15M0 -15V15" />
          </g>
          <g transform="translate(556,436)">
            <circle r="9" />
            <path d="M-15 0H15M0 -15V15" />
          </g>
        </g>

        {/* --- colour bar ------------------------------------------------- */}
        {/* The ink swatch strip printed in the margin of a press sheet. */}
        <g opacity="0.85">
          {["#00CFFF", "#FF2E93", "#FFC53D", "#7B3FF2", "#2EE6A8"].map((c, i) => (
            <rect key={c} x={44 + i * 26} y={432} width={22} height={9} rx={2} fill={c} />
          ))}
        </g>

        {/* Fade the base so text beside it stays comfortable. */}
        <rect x="0" y="0" width="600" height="480" fill="url(#ha-fade)" />
      </svg>
    </div>
  );
}
