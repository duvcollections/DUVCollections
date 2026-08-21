/**
 * The DUV Collections mark — three ink circles overprinting the way
 * cyan, magenta and yellow actually mix on press.
 */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      role="img"
      aria-label="DUV Collections"
    >
      <g style={{ isolation: "isolate" }}>
        <circle cx="64" cy="45" r="35" fill="#00CFFF" style={{ mixBlendMode: "multiply" }} />
        <circle cx="82.19" cy="76.5" r="35" fill="#FF2E93" style={{ mixBlendMode: "multiply" }} />
        <circle cx="45.81" cy="76.5" r="35" fill="#FFC53D" style={{ mixBlendMode: "multiply" }} />
      </g>
    </svg>
  );
}
