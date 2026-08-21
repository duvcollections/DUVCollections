"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Deactivate or re-activate a code. Never deletes — past orders reference it. */
export function ToggleCode({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch("/api/admin/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !active }),
      });
      router.refresh();
    } catch {
      /* the row simply won't change; the admin can retry */
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="rounded-full border border-duv-line px-3.5 py-1.5 text-[12.5px] font-bold text-duv-muted hover:border-duv-violet hover:text-duv-violet disabled:opacity-50"
    >
      {busy ? "…" : active ? "Deactivate" : "Reactivate"}
    </button>
  );
}
