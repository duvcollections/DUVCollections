/**
 * Product illustrations.
 *
 * These are deliberately drawn as illustrations, not fake photographs. A
 * generated image that looks like a photo of a product would misrepresent what
 * arrives in the box — so instead each product type gets a clean, honest drawing
 * that tells a shopper what the thing *is* at a glance.
 *
 * Replace with real photography when it's shot: drop /public/products/<sku>.jpg
 * and swap the call site for next/image.
 */

const PLUM = "#2E1065";
const GOLD = "#FFC53D";
const GOLD_DEEP = "#E09B18";
const CYAN = "#00CFFF";
const PINK = "#FF2E93";
const VIOLET = "#7B3FF2";
const CORAL = "#FF6B3D";
const PAPER = "#FFFDF9";

const S = {
  stroke: PLUM,
  strokeWidth: 3.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

function Roll() {
  return (
    <g {...S}>
      <path d="M62 62 h84 a20 20 0 0 1 0 76 h-84 a20 20 0 0 1 0-76 Z" fill={CYAN} />
      <ellipse cx="62" cy="100" rx="20" ry="38" fill={PAPER} />
      <ellipse cx="62" cy="100" rx="8" ry="15" fill={CYAN} />
      <path d="M146 130 q26 12 34 30" strokeDasharray="0" fill="none" />
      <path d="M146 138 q20 14 44 18 l-6 12 q-30 -6 -46 -22 Z" fill={PAPER} />
    </g>
  );
}

function Sheets({ sparkle = false, tone = GOLD }: { sparkle?: boolean; tone?: string }) {
  return (
    <g {...S}>
      <rect x="54" y="66" width="84" height="102" rx="6" fill={PAPER} transform="rotate(-8 96 117)" />
      <rect x="66" y="56" width="84" height="102" rx="6" fill={sparkle ? tone : CYAN} transform="rotate(4 108 107)" />
      {sparkle && (
        <g stroke="none" fill={PAPER}>
          <path d="M104 88 c2 10 5 13 15 15 c-10 2 -13 5 -15 15 c-2 -10 -5 -13 -15 -15 c10 -2 13 -5 15 -15 Z" />
          <path d="M132 118 c1.2 6 3 7.8 9 9 c-6 1.2 -7.8 3 -9 9 c-1.2 -6 -3 -7.8 -9 -9 c6 -1.2 7.8 -3 9 -9 Z" />
        </g>
      )}
    </g>
  );
}

function Powder() {
  return (
    <g {...S}>
      <path d="M62 84 h76 v72 a10 10 0 0 1 -10 10 h-56 a10 10 0 0 1 -10 -10 Z" fill={VIOLET} />
      <rect x="54" y="60" width="92" height="26" rx="9" fill={PAPER} />
      <path d="M78 108 h48 M78 128 h34" stroke={PAPER} />
      <g stroke="none" fill={PLUM}>
        <circle cx="52" cy="44" r="4" /><circle cx="76" cy="34" r="3" />
        <circle cx="120" cy="36" r="3.4" /><circle cx="148" cy="46" r="4" />
        <circle cx="100" cy="26" r="2.6" />
      </g>
    </g>
  );
}

function Ink() {
  return (
    <g {...S}>
      <path d="M84 44 h32 v20 h-32 Z" fill={PAPER} />
      <path d="M76 64 h48 a16 16 0 0 1 16 16 v70 a16 16 0 0 1 -16 16 h-48 a16 16 0 0 1 -16 -16 v-70 a16 16 0 0 1 16 -16 Z" fill={CYAN} />
      <rect x="72" y="96" width="56" height="42" rx="6" fill={PAPER} />
      <path d="M100 106 c8 10 13 15 13 21 a13 13 0 0 1 -26 0 c0 -6 5 -11 13 -21 Z" fill={CYAN} stroke="none" />
    </g>
  );
}

function Paper() {
  return (
    <g {...S}>
      <rect x="48" y="86" width="98" height="76" rx="7" fill={PAPER} transform="rotate(-6 97 124)" />
      <rect x="54" y="76" width="98" height="76" rx="7" fill={PAPER} transform="rotate(-2 103 114)" />
      <path d="M58 62 h74 l22 22 v62 a7 7 0 0 1 -7 7 h-89 a7 7 0 0 1 -7 -7 v-77 a7 7 0 0 1 7 -7 Z" fill={PINK} />
      <path d="M132 62 v22 h22" fill={PAPER} />
      <path d="M74 110 h56 M74 128 h38" stroke={PAPER} />
    </g>
  );
}

function Vinyl() {
  return (
    <g {...S}>
      <rect x="46" y="70" width="76" height="88" rx="8" fill={CYAN} transform="rotate(-10 84 114)" />
      <rect x="62" y="62" width="76" height="88" rx="8" fill={PINK} transform="rotate(2 100 106)" />
      <rect x="78" y="56" width="76" height="88" rx="8" fill={GOLD} transform="rotate(12 116 100)" />
    </g>
  );
}

function Chain() {
  const n = 9;
  return (
    <g {...S}>
      {Array.from({ length: n }, (_, i) => {
        const u = i / (n - 1);
        const x = 34 + u * 132;
        const y = 74 + Math.sin(u * Math.PI) * 46;
        const tilt = Math.cos(u * Math.PI) * 32;
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx="14"
            ry="9.5"
            fill={i % 2 ? GOLD : PAPER}
            transform={`rotate(${tilt + (i % 2 ? 74 : 0)} ${x} ${y})`}
          />
        );
      })}
    </g>
  );
}

function Pendant() {
  return (
    <g {...S}>
      <path d="M46 50 q54 58 108 0" fill="none" />
      <circle cx="100" cy="98" r="9" fill={PAPER} />
      <path d="M100 108 c22 6 32 20 32 36 a32 32 0 0 1 -64 0 c0 -16 10 -30 32 -36 Z" fill={GOLD} />
      <circle cx="100" cy="142" r="12" fill={PAPER} />
      <circle cx="100" cy="142" r="4.5" fill={GOLD_DEEP} stroke="none" />
    </g>
  );
}

function Earrings() {
  return (
    <g {...S}>
      {[70, 130].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="72" r="10" fill={PAPER} />
          <path
            d={`M${cx} 82 c16 6 24 18 24 32 a24 24 0 0 1 -48 0 c0 -14 8 -26 24 -32 Z`}
            fill={GOLD}
          />
          <circle cx={cx} cy="116" r="8" fill={PAPER} />
        </g>
      ))}
    </g>
  );
}

function Bangle() {
  return (
    <g {...S}>
      <circle cx="100" cy="106" r="56" fill={GOLD} />
      <circle cx="100" cy="106" r="34" fill={PAPER} />
      <path d="M100 50 a56 56 0 0 1 42 19" stroke={PAPER} strokeWidth="4" />
      <g stroke="none" fill={PAPER}>
        <circle cx="100" cy="56" r="4" /><circle cx="145" cy="106" r="4" />
        <circle cx="100" cy="156" r="4" /><circle cx="55" cy="106" r="4" />
      </g>
    </g>
  );
}

function Ring() {
  return (
    <g {...S}>
      <ellipse cx="100" cy="122" rx="46" ry="40" fill={GOLD} />
      <ellipse cx="100" cy="122" rx="30" ry="26" fill={PAPER} />
      <path d="M100 44 l20 24 l-20 22 l-20 -22 Z" fill={PINK} />
      <path d="M80 68 h40" />
    </g>
  );
}

function NoseRing() {
  return (
    <g {...S}>
      <circle cx="100" cy="106" r="46" fill="none" strokeWidth="9" stroke={GOLD} />
      <circle cx="100" cy="106" r="46" fill="none" strokeWidth="3.2" opacity="0.35" />
      <circle cx="100" cy="60" r="13" fill={PINK} />
      <circle cx="100" cy="60" r="5" fill={PAPER} stroke="none" />
    </g>
  );
}

function Sunglasses() {
  return (
    <g {...S}>
      <path d="M28 84 q22 -10 40 -8" />
      <path d="M172 84 q-22 -10 -40 -8" />
      <path d="M68 78 h64" />
      <path d="M68 78 a30 26 0 1 0 0 0.1 Z" fill={CORAL} />
      <path d="M132 78 a30 26 0 1 1 0 0.1 Z" fill={CORAL} />
      <ellipse cx="70" cy="104" rx="30" ry="26" fill={CORAL} />
      <ellipse cx="130" cy="104" rx="30" ry="26" fill={CORAL} />
      <path d="M100 84 q0 8 0 8" />
      <path d="M56 92 q10 -6 20 -4" stroke={PAPER} strokeWidth="4" />
      <path d="M116 92 q10 -6 20 -4" stroke={PAPER} strokeWidth="4" />
    </g>
  );
}

function Generic() {
  return (
    <g {...S}>
      <rect x="56" y="62" width="88" height="84" rx="10" fill={PAPER} />
      <path d="M56 118 l24 -22 l20 18 l22 -26 l22 26" />
      <circle cx="82" cy="84" r="8" fill={GOLD} />
    </g>
  );
}

const ART: Record<string, () => React.JSX.Element> = {
  "film-roll": Roll,
  "film-sheet-gold": () => <Sheets sparkle tone={GOLD} />,
  "film-sheet-silver": () => <Sheets sparkle tone="#C9D2DC" />,
  "film-sheet": () => <Sheets sparkle />,
  powder: Powder,
  ink: Ink,
  paper: Paper,
  vinyl: Vinyl,
  chain: Chain,
  pendant: Pendant,
  earrings: Earrings,
  bangle: Bangle,
  ring: Ring,
  nosering: NoseRing,
  sunglasses: Sunglasses,
  generic: Generic,
};

export function ProductArt({ type, className = "" }: { type: string; className?: string }) {
  const Draw = ART[type] ?? Generic;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" focusable="false">
      <Draw />
    </svg>
  );
}
