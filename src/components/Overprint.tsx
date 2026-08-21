/**
 * Ambient page art: three translucent inks drifting and mixing.
 * Purely decorative — hidden from assistive tech and stilled for anyone who
 * has asked for reduced motion (handled in globals.css).
 */
export function Overprint({
  className = "",
  intensity = 1,
}: {
  className?: string;
  intensity?: number;
}) {
  const blobs = [
    { c: "#00CFFF", top: "-18%", left: "8%", size: "46vw" },
    { c: "#FF2E93", top: "-6%", left: "42%", size: "40vw" },
    { c: "#FFC53D", top: "6%", left: "22%", size: "38vw" },
  ];
  return (
    <div className={`overprint ${className}`} aria-hidden="true">
      {blobs.map((b, i) => (
        <span
          key={i}
          style={{
            background: b.c,
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            opacity: 0.4 * intensity,
          }}
        />
      ))}
    </div>
  );
}
