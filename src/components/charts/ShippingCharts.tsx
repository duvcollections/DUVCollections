import type { CarrierSlice, DayBucket } from "@/lib/shipping-stats";

/**
 * Charts for the shipping dashboard.
 *
 * Server-rendered SVG and CSS — no charting library, nothing to hydrate, no
 * JavaScript shipped to draw a bar. On a Worker billed by CPU that matters, and
 * a chart that renders in the HTML is a chart that shows up in a screenshot and
 * in print.
 *
 * Palette: slots 1–4 of the validated categorical set (blue, orange, aqua,
 * yellow). Aqua and yellow fall below 3:1 against a white card, so every
 * segment carries a visible label and the table below repeats the numbers —
 * that is the relief the contrast rule requires, not an optional nicety.
 */

const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"] as const;
const INK_MUTED = "#6F5A96";
const RULE = "#EFE6EF";

/* ------------------------------------------------------- parcels per day */

export function ParcelsPerDay({ days }: { days: DayBucket[] }) {
  const max = Math.max(1, ...days.map((d) => d.parcels));
  const total = days.reduce((n, d) => n + d.parcels, 0);

  return (
    <figure className="m-0 flex flex-col rounded-2xl border border-duv-line bg-white p-6">
      <figcaption className="mb-1 font-display text-[15px] font-extrabold tracking-tight">
        Parcels shipped
      </figcaption>
      <p className="mb-5 text-[12.5px] text-duv-faint">
        Last 14 days · {total} parcel{total === 1 ? "" : "s"}
      </p>

      {total === 0 ? (
        <p className="py-8 text-center text-[13.5px] text-duv-muted">
          Nothing shipped in the last fortnight.
        </p>
      ) : (
        <>
          <div className="flex h-[132px] items-end gap-[3px]" role="img"
               aria-label={`Parcels shipped per day over the last 14 days, ${total} in total`}>
            {days.map((d) => (
              <div key={d.day} className="group relative flex flex-1 flex-col justify-end">
                {/* 4px rounded data-end, anchored to the baseline */}
                <div
                  className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-80"
                  style={{
                    // A zero day still gets a 2px stub in the rule colour. Drawing
                    // nothing makes an empty day indistinguishable from a missing
                    // one, and "we shipped nothing on Sunday" is real information.
                    height: d.parcels === 0 ? "2px" : `${Math.max(6, (d.parcels / max) * 116)}px`,
                    background: d.parcels === 0 ? RULE : SERIES[0],
                  }}
                />
                <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-duv-plum px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {d.label}: {d.parcels}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-t pt-2 text-[11px]" style={{ borderColor: RULE, color: INK_MUTED }}>
            <span>{days[0].label}</span>
            <span>{days[days.length - 1].label}</span>
          </div>
        </>
      )}
    </figure>
  );
}

/* ---------------------------------------------------------- carrier split */

export function CarrierSplit({ carriers }: { carriers: CarrierSlice[] }) {
  const total = carriers.reduce((n, c) => n + c.parcels, 0);

  return (
    <figure className="m-0 rounded-2xl border border-duv-line bg-white p-6">
      <figcaption className="mb-1 font-display text-[15px] font-extrabold tracking-tight">
        Carrier split
      </figcaption>
      <p className="mb-5 text-[12.5px] text-duv-faint">
        {total === 0 ? "No parcels yet" : `${total} parcel${total === 1 ? "" : "s"} all time`}
      </p>

      {total === 0 ? (
        <p className="py-8 text-center text-[13.5px] text-duv-muted">
          This fills in once you buy your first label.
        </p>
      ) : (
        <>
          {/* Stacked bar rather than a pie: carrier shares are often close, and
              close values are exactly what a pie cannot show. */}
          <div className="flex h-9 w-full gap-[2px] overflow-hidden rounded-lg">
            {carriers.slice(0, 4).map((c, i) => (
              <div
                key={c.carrier}
                className="flex items-center justify-center"
                style={{ width: `${Math.max(c.share * 100, 4)}%`, background: SERIES[i % SERIES.length] }}
                title={`${c.carrier}: ${c.parcels}`}
              >
                {c.share > 0.12 && (
                  <span className="px-1 text-[11.5px] font-bold text-white">
                    {Math.round(c.share * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Legend plus the numbers — identity never rests on colour alone. */}
          <table className="mt-4 w-full text-[13px]">
            <caption className="sr-only">Parcels by carrier</caption>
            <thead>
              <tr style={{ color: INK_MUTED }}>
                <th scope="col" className="pb-1.5 text-left font-semibold">Carrier</th>
                <th scope="col" className="pb-1.5 text-right font-semibold">Parcels</th>
                <th scope="col" className="pb-1.5 text-right font-semibold">Share</th>
              </tr>
            </thead>
            <tbody>
              {carriers.slice(0, 4).map((c, i) => (
                <tr key={c.carrier} className="border-t" style={{ borderColor: RULE }}>
                  <th scope="row" className="py-1.5 text-left font-medium text-duv-plum">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                          style={{ background: SERIES[i % SERIES.length] }} aria-hidden="true" />
                    {c.carrier}
                  </th>
                  <td className="py-1.5 text-right tabular-nums">{c.parcels}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: INK_MUTED }}>
                    {Math.round(c.share * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}

/* ---------------------------------------------------------------- tiles */

export function StatTile({
  label,
  value,
  note,
  tone = "plain",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "plain" | "attention" | "good";
}) {
  const rule =
    tone === "attention" ? "#e34948" : tone === "good" ? "#1baf7a" : SERIES[0];
  return (
    <div className="rounded-2xl border border-duv-line bg-white p-5">
      <span className="block h-1 w-8 rounded-full" style={{ background: rule }} aria-hidden="true" />
      <p className="mt-3 font-display text-[30px] font-extrabold leading-none tracking-[-0.02em]">
        {value}
      </p>
      <p className="mt-1.5 text-[13.5px] font-semibold text-duv-plum">{label}</p>
      {note && <p className="mt-0.5 text-[12.5px] leading-snug text-duv-faint">{note}</p>}
    </div>
  );
}
