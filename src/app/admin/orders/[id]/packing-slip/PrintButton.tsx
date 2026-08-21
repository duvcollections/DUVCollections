"use client";

/**
 * Client component purely because it calls window.print(). Kept separate so the
 * slip itself stays a server component and ships no JavaScript for its content.
 */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-duv-pink-deep px-6 py-2.5 text-[14px] font-bold text-white hover:bg-duv-coral-deep"
    >
      Print this slip
    </button>
  );
}
