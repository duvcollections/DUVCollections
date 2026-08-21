import type { DayPoint, RevenueSplit, Trend } from "@/lib/dashboard-stats";
import { money } from "@/lib/site";

/**
 * Dashboard charts. Server-rendered SVG and CSS, no charting library.
 *
 * Nothing here hydrates: on a Worker billed by CPU milliseconds, shipping a
 * charting runtime to draw six bars is money spent for no benefit — and a chart
 * that lives in the HTML is one that survives screenshotting and printing.
 *
 * Palette: slots 1–4 of the validated categorical set. The validator flags aqua
 * and yellow as under 3:1 against a white card, which obliges visible labels —
 * so every series is directly labelled and every figure is repeated in text.
 * That is the required relief, not a stylistic choice.
 */

const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"] as const;
const INK_MUTED = "#6F5A96";
const RULE = "#EFE6EF";
const GOOD = "#117c38";
const BAD = "#c0332f";

/* ------------------------------------------------------------ trend pill */

export function TrendPill({ trend, invert = false }: { trend: Trend; invert?: boolean }) {
  // No baseline means no honest percentage. Say so rather than invent one.
  if (trend.pct === null) {
    return (
      <span className="rounded-full bg-duv-line px-2 py-0.5 text-[11.5px] font-bold text-duv-muted">
        no prior data
      </span>
    );
  }

  const rising = trend.direction === "up";
  const isGood = invert ? !rising : rising;
  const flat = trend.direction === "flat";
  const bg = flat ? "#f1eef7" : isGood ? "#e7f6ed" : "#fdecea";
  const fg = flat ? INK_MUTED : isGood ? GOOD : BAD;

  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums"
      style={{ background: bg, color: fg }}
    >
      {/* The arrow is decorative; the sign carries the meaning for screen readers. */}
      <span aria-hidden="true">{flat ? "→" : rising ? "↑" : "↓"}</span>{" "}
      {trend.pct > 0 ? "+" : ""}
      {trend.pct.toFixed(1)}%
    </span>
  );
}

/* -------------------------------------------------------------- stat card */

export function StatCard({
  label,
  value,
  trend,
  note,
  accent = 0,
  invert = false,
}: {
  label: string;
  value: string;
  trend?: Trend;
  note?: string;
  accent?: 0 | 1 | 2 | 3;
  invert?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-duv-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold text-duv-muted">{label}</p>
        <span
          className="mt-1 block h-2 w-2 shrink-0 rounded-full"
          style={{ background: SERIES[accent] }}
          aria-hidden="true"
        />
      </div>
      <p className="mt-2.5 font-display text-[30px] font-extrabold leading-none tracking-[-0.025em] tabular-nums">
        {value}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {trend && <TrendPill trend={trend} invert={invert} />}
        {note && <span className="text-[12px] text-duv-faint-ink">{note}</span>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- revenue line */

/**
 * Revenue over the window, as an area + line.
 *
 * A line rather than bars because this is a continuous quantity over time and
 * the shape of the trend is the message. Points are labelled selectively — the
 * peak and the most recent day — because a number on every point is noise.
 */
export function RevenueTrend({ series }: { series: DayPoint[] }) {
  const W = 720;
  const H = 220;
  // Right padding clears the final x-axis label, which is centred on the last
  // point — at 16px it rendered as "Aug 2C", clipped by the viewBox edge.
  const PAD = { top: 18, right: 30, bottom: 28, left: 52 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const max = Math.max(1, ...series.map((d) => d.revenue));
  // Round the axis up to something a person would choose, so gridlines read as
  // round numbers rather than arbitrary fractions of the peak.
  const niceMax = niceCeil(max);
  const total = series.reduce((n, d) => n + d.revenue, 0);

  const x = (i: number) =>
    PAD.left + (series.length <= 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / niceMax) * plotH;

  // A smoothed path rather than straight segments. Control points are damped
  // to 0.28 of the gap and never overshoot vertically, so the curve passes
  // through every real value — it reads the trend without inventing peaks the
  // data doesn't contain.
  const pts = series.map((d, i) => [x(i), y(d.revenue)] as const);
  const line = pts
    .map(([px, py], i) => {
      if (i === 0) return `M${px},${py}`;
      const [x0, y0] = pts[i - 1];
      const cx = (px - x0) * 0.28;
      return `C${x0 + cx},${y0} ${px - cx},${py} ${px},${py}`;
    })
    .join(" ");
  const area = `${line} L${x(series.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;

  const peakIdx = series.reduce((best, d, i) => (d.revenue > series[best].revenue ? i : best), 0);
  const lastIdx = series.length - 1;
  const ticks = [0, 0.5, 1].map((f) => niceMax * f);

  // Roughly six date labels, however long the window is.
  const labelEvery = Math.max(1, Math.round(series.length / 6));

  return (
    <figure className="m-0 rounded-2xl border border-duv-line bg-white p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-display text-[15px] font-extrabold tracking-tight">
          Revenue per day
        </span>
        <span className="text-[13px] text-duv-muted">
          {money(total)} across {series.length} days
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`Revenue per day. Total ${money(total)}. Peak ${money(
          series[peakIdx]?.revenue ?? 0,
        )} on ${series[peakIdx]?.label ?? "—"}.`}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={RULE} strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={INK_MUTED}>
              {t >= 1000 ? `$${Math.round(t / 1000)}k` : `$${Math.round(t)}`}
            </text>
          </g>
        ))}

        <path d={area} fill={SERIES[0]} opacity="0.10" />
        <path d={line} fill="none" stroke={SERIES[0]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Only the peak and the latest day get a marker — see the note above. */}
        {[peakIdx, lastIdx].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(series[i].revenue)} r="4.5" fill="#fff" stroke={SERIES[0]} strokeWidth="2" />
            {series[i].revenue > 0 && (
              <text
                x={Math.min(W - PAD.right, Math.max(PAD.left, x(i)))}
                y={Math.max(12, y(series[i].revenue) - 10)}
                textAnchor={i === lastIdx ? "end" : "middle"}
                fontSize="11.5"
                fontWeight="700"
                fill="#2E1065"
              >
                {money(series[i].revenue)}
              </text>
            )}
          </g>
        ))}

        {series.map((d, i) =>
          i % labelEvery === 0 || i === lastIdx ? (
            <text
              key={d.day}
              x={x(i)}
              y={H - 8}
              textAnchor={i === lastIdx ? "end" : "middle"}
              fontSize="11"
              fill={INK_MUTED}
            >
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
    </figure>
  );
}

/** Round up to 1/2/5 × 10ⁿ so gridlines land on numbers people recognise. */
function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / mag;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return step * mag;
}

/* ------------------------------------------------------------ orders bars */

export function OrdersPerDay({ series }: { series: DayPoint[] }) {
  const max = Math.max(1, ...series.map((d) => d.orders));
  const total = series.reduce((n, d) => n + d.orders, 0);

  return (
    <figure className="m-0 rounded-2xl border border-duv-line bg-white p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-display text-[15px] font-extrabold tracking-tight">Orders per day</span>
        <span className="text-[13px] text-duv-muted">{total} in this period</span>
      </figcaption>

      <div className="mt-5 flex h-[130px] items-end gap-[3px]" role="img"
           aria-label={`Orders per day, ${total} in total, peak ${max} in a day.`}>
        {series.map((d) => (
          <div key={d.day} className="group relative flex flex-1 flex-col justify-end">
            <div
              // A zero day still draws a 2px stub in the rule colour, so the
              // day is visibly present rather than looking like missing data.
              className="rounded-t-[4px]"
              style={{
                height: d.orders === 0 ? 2 : `${Math.max(6, (d.orders / max) * 118)}px`,
                background: d.orders === 0 ? RULE : SERIES[0],
              }}
              title={`${d.label}: ${d.orders} order${d.orders === 1 ? "" : "s"}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-duv-faint-ink">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ money split */

/**
 * Where the money sits, as a stacked bar.
 *
 * Deliberately NOT a donut. These three shares are frequently close together,
 * and angle is the hardest encoding to compare — a stacked bar with direct
 * labels answers "how much of this is actually mine?" at a glance, which is the
 * only question this chart exists to answer.
 */
export function MoneySplit({ split }: { split: RevenueSplit[] }) {
  const total = split.reduce((n, s) => n + s.amount, 0);

  if (total <= 0) {
    return (
      <figure className="m-0 rounded-2xl border border-duv-line bg-white p-6">
        <figcaption className="font-display text-[15px] font-extrabold tracking-tight">
          Where the money sits
        </figcaption>
        <p className="mt-4 text-[13.5px] text-duv-muted">
          No paid orders in this period yet.
        </p>
      </figure>
    );
  }

  return (
    <figure className="m-0 rounded-2xl border border-duv-line bg-white p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-display text-[15px] font-extrabold tracking-tight">
          Where the money sits
        </span>
        <span className="text-[13px] text-duv-muted">{money(total)} collected</span>
      </figcaption>

      {/* 2px surface gaps between segments, per the mark spec. */}
      <div className="mt-5 flex h-9 gap-[2px] overflow-hidden rounded-lg">
        {split.map((s, i) => (
          <div
            key={s.label}
            style={{ width: `${Math.max(s.share * 100, s.amount > 0 ? 2 : 0)}%`, background: SERIES[i] }}
            title={`${s.label}: ${money(s.amount)}`}
          />
        ))}
      </div>

      <dl className="mt-4 space-y-2.5">
        {split.map((s, i) => (
          <div key={s.label} className="flex items-baseline gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: SERIES[i] }}
              aria-hidden="true"
            />
            <dt className="text-[13.5px] text-duv-muted">{s.label}</dt>
            <dd className="ml-auto text-right">
              <span className="font-display text-[14px] font-extrabold tabular-nums">
                {money(s.amount)}
              </span>
              <span className="ml-2 text-[12.5px] tabular-nums text-duv-faint-ink">
                {(s.share * 100).toFixed(1)}%
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 border-t border-duv-line pt-3 text-[12px] leading-relaxed text-duv-faint-ink">
        Tax is collected for the state and shipping largely goes to the carrier — only
        the goods line is really yours.
      </p>
    </figure>
  );
}
