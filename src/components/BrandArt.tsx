/**
 * Original brand artwork for category banners and section headers.
 *
 * These are drawings, not photographs, and that is a deliberate choice rather
 * than a placeholder. Stock photography of "a gold chain" on a jewelry banner
 * shows a customer an item we do not sell, and the gap between the banner and
 * the actual product is where "not as described" complaints come from. Abstract
 * brand art carries the visual weight without making a claim.
 *
 * Everything here is inline SVG: no network request, no layout shift, sharp at
 * any size, and it inherits the palette so a brand change lands everywhere at
 * once. All of it is decorative and hidden from assistive technology.
 */

type ArtProps = { className?: string };

/* ------------------------------------------------------- printing supplies */

/** Registration marks and overlapping ink layers — the language of printing. */
export function PrintingArt({ className = "" }: ArtProps) {
  return (
    <svg
      viewBox="0 0 400 260"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="pa-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dff6ff" />
          <stop offset="100%" stopColor="#f4fbff" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#pa-bg)" />

      {/* Overlapping process inks, multiplying where they cross — the same
          idea the logo is built on. */}
      <g style={{ mixBlendMode: "multiply" }}>
        <circle cx="150" cy="110" r="72" fill="#00CFFF" opacity="0.55" />
        <circle cx="212" cy="110" r="72" fill="#FF2E93" opacity="0.5" />
        <circle cx="181" cy="162" r="72" fill="#FFC53D" opacity="0.5" />
      </g>

      {/* Registration crosshair */}
      <g stroke="#2E1065" strokeWidth="1.5" opacity="0.35">
        <line x1="330" y1="46" x2="330" y2="86" />
        <line x1="310" y1="66" x2="350" y2="66" />
        <circle cx="330" cy="66" r="13" fill="none" />
      </g>

      {/* A sheet feeding through */}
      <rect x="40" y="196" width="150" height="52" rx="4" fill="#fff" opacity="0.75" />
      <g stroke="#2E1065" strokeWidth="1.5" opacity="0.25">
        <line x1="56" y1="212" x2="150" y2="212" />
        <line x1="56" y1="224" x2="170" y2="224" />
        <line x1="56" y1="236" x2="120" y2="236" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ jewelry */

/** Interlocking links and a faceted stone, in warm metals. */
export function JewelryArt({ className = "" }: ArtProps) {
  return (
    <svg
      viewBox="0 0 400 260"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="ja-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff1cc" />
          <stop offset="100%" stopColor="#fff9ec" />
        </linearGradient>
        <linearGradient id="ja-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFC53D" />
          <stop offset="55%" stopColor="#eda100" />
          <stop offset="100%" stopColor="#FFC53D" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#ja-bg)" />

      {/* A chain of links, curving as a real one would drape */}
      <g fill="none" stroke="url(#ja-gold)" strokeWidth="7" strokeLinecap="round">
        {Array.from({ length: 7 }).map((_, i) => {
          const x = 62 + i * 44;
          const y = 96 + Math.sin(i * 0.9) * 26;
          return <ellipse key={i} cx={x} cy={y} rx="24" ry="15" transform={`rotate(${i % 2 ? 24 : -24} ${x} ${y})`} />;
        })}
      </g>

      {/* Faceted stone */}
      <g transform="translate(300 176)">
        <path d="M0 -30 L26 -8 L16 26 L-16 26 L-26 -8 Z" fill="#FF2E93" opacity="0.85" />
        <path d="M0 -30 L26 -8 L0 4 Z" fill="#fff" opacity="0.28" />
        <path d="M0 -30 L-26 -8 L0 4 Z" fill="#2E1065" opacity="0.14" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ eyewear */

/** A pair of frames, drawn as two lenses and a bridge. */
export function EyewearArt({ className = "" }: ArtProps) {
  return (
    <svg
      viewBox="0 0 400 260"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="ea-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe4d6" />
          <stop offset="100%" stopColor="#fff4ee" />
        </linearGradient>
        <linearGradient id="ea-lens" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E1065" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#7B3FF2" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#ea-bg)" />

      <g transform="translate(200 130)">
        <rect x="-140" y="-38" width="118" height="76" rx="26" fill="url(#ea-lens)" />
        <rect x="22" y="-38" width="118" height="76" rx="26" fill="url(#ea-lens)" />
        <path d="M-22 -6 Q0 -22 22 -6" fill="none" stroke="#FF6B3D" strokeWidth="9" strokeLinecap="round" />
        <line x1="-140" y1="-18" x2="-176" y2="-30" stroke="#FF6B3D" strokeWidth="9" strokeLinecap="round" />
        <line x1="140" y1="-18" x2="176" y2="-30" stroke="#FF6B3D" strokeWidth="9" strokeLinecap="round" />
        {/* Highlight, so the lenses read as glass rather than holes */}
        <path d="M-120 -20 L-70 -20 L-100 20 L-132 20 Z" fill="#fff" opacity="0.16" />
        <path d="M42 -20 L92 -20 L62 20 L30 20 Z" fill="#fff" opacity="0.16" />
      </g>
    </svg>
  );
}

/* --------------------------------------------------------------- t-shirts */

/** A tee with a press-plate rectangle where the transfer lands. */
export function TshirtArt({ className = "" }: ArtProps) {
  return (
    <svg
      viewBox="0 0 400 260"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="ta-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#efe7ff" />
          <stop offset="100%" stopColor="#f9f6ff" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#ta-bg)" />

      <g transform="translate(200 132)">
        {/* Shirt body */}
        <path
          d="M-84 -52 L-46 -72 Q-24 -56 0 -56 Q24 -56 46 -72 L84 -52 L66 -14 L52 -22 L52 74 L-52 74 L-52 -22 L-66 -14 Z"
          fill="#fff"
          stroke="#2E1065"
          strokeWidth="2.5"
          strokeLinejoin="round"
          opacity="0.92"
        />
        {/* Where the transfer goes — the whole point of the category */}
        <rect x="-30" y="-8" width="60" height="52" rx="3" fill="none" stroke="#7B3FF2" strokeWidth="2" strokeDasharray="6 5" />
        <g style={{ mixBlendMode: "multiply" }}>
          <circle cx="-8" cy="18" r="17" fill="#00CFFF" opacity="0.6" />
          <circle cx="8" cy="18" r="17" fill="#FF2E93" opacity="0.55" />
        </g>
      </g>
    </svg>
  );
}

/** Pick the artwork for a category id. Falls back to the printing mark. */
export function CategoryArt({ id, className = "" }: { id: string; className?: string }) {
  switch (id) {
    case "jewelry":
      return <JewelryArt className={className} />;
    case "eyewear":
      return <EyewearArt className={className} />;
    case "mens-tshirts":
      return <TshirtArt className={className} />;
    default:
      return <PrintingArt className={className} />;
  }
}
