import { Overprint } from "@/components/Overprint";

export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden border-b border-duv-line bg-duv-shell">
      <Overprint intensity={0.5} />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-duv-pink">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 max-w-[20ch] text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
          {title}
        </h1>
        {lede && (
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-duv-muted">{lede}</p>
        )}
        {children}
      </div>
    </div>
  );
}
