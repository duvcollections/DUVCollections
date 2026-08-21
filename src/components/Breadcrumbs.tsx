import Link from "next/link";

export type Crumb = { href?: string; label: string };

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-duv-muted">
        {trail.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {c.href ? (
              <Link href={c.href} className="hover:text-duv-violet">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-duv-plum">
                {c.label}
              </span>
            )}
            {i < trail.length - 1 && (
              <span aria-hidden="true" className="text-duv-faint">
                /
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
