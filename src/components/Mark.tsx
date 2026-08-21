/**
 * The DUV Collections mark — three inks overprinting the way cyan, magenta and
 * yellow actually mix on press. `multiply` is what produces the secondary
 * colours where they overlap; without it the circles just stack.
 */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" className={className} aria-hidden="true" focusable="false">
      <g style={{ isolation: "isolate" }}>
        <circle cx="64" cy="45" r="35" fill="#00CFFF" style={{ mixBlendMode: "multiply" }} />
        <circle cx="82.19" cy="76.5" r="35" fill="#FF2E93" style={{ mixBlendMode: "multiply" }} />
        <circle cx="45.81" cy="76.5" r="35" fill="#FFC53D" style={{ mixBlendMode: "multiply" }} />
      </g>
    </svg>
  );
}

export function Logo({
  className = "",
  reversed = false,
}: {
  className?: string;
  reversed?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark className="h-8 w-8 shrink-0" />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-[17px] font-extrabold tracking-[-0.02em] ${
            reversed ? "text-white" : "text-duv-plum"
          }`}
        >
          DUV Collections
        </span>
        <span
          className={`mt-[3px] text-[8.5px] font-semibold uppercase tracking-[0.22em] ${
            reversed ? "text-duv-cyan" : "text-duv-muted"
          }`}
        >
          Prints &amp; Gifts USA
        </span>
      </span>
    </span>
  );
}
