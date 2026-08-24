"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageEditor } from "./ImageEditor";
import type { Product } from "@/lib/catalog";

const CATEGORIES = [
  { id: "printing-supplies", name: "Printing Supplies" },
  { id: "jewelry", name: "Jewelry" },
  { id: "eyewear", name: "Eyewear" },
];

const ART = ["film-roll","film-sheet-gold","film-sheet-silver","powder","ink","paper","vinyl",
  "chain","pendant","earrings","bangle","ring","nosering","sunglasses","generic"];

/**
 * Declared at module scope on purpose. Defining a component inside the render
 * body gives it a new identity on every keystroke, so React unmounts and
 * remounts the <input> underneath it — and the field loses focus mid-typing.
 */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-duv-faint-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-duv-faint-ink">{hint}</span>}
    </label>
  );
}

const input =
  "w-full rounded-xl border border-duv-line bg-white px-3.5 py-2.5 text-[14px] focus:border-duv-violet focus:outline-none";

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isNew = !product;
  const [f, setF] = useState({
    sku: product?.sku ?? "",
    title: product?.title ?? "",
    price: product?.price?.toString() ?? "",
    category: product?.category ?? "jewelry",
    subcategory: product?.subcategory ?? "",
    description: product?.description ?? "",
    highlights: (product?.highlights ?? []).join("\n"),
    goodFor: product?.goodFor ?? "",
    specs: Object.entries(product?.specs ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n"),
    art: product?.art ?? "generic",
    stock: product?.stock === null || product?.stock === undefined ? "" : String(product.stock),
    lowStockAt: String(product?.lowStockAt ?? 5),
    upc: product?.upc ?? "",
    shipWeightOz: String(product?.shipWeightOz ?? 4),
    wholesale: product?.wholesale ?? false,
    costPrice:
      product?.costPrice === null || product?.costPrice === undefined
        ? ""
        : String(product.costPrice),
  });

  // Held apart from the text fields: it is a list, not a string, and merging
  // it into `f` would mean serialising and reparsing on every keystroke.
  const [productImages, setProductImages] = useState<string[]>(product?.images ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", isNew, product: { ...f, images: productImages } }),
    });
    const d = (await res.json()) as {
      ok?: boolean; error?: string; sku?: string;
      rebuild?: { queued: boolean; reason?: string };
    };
    if (!res.ok || !d.ok) {
      setMsg({ ok: false, text: d.error ?? `Failed (${res.status}).` });
      setBusy(false);
      return;
    }
    setMsg({
      ok: true,
      text: d.rebuild?.queued
        ? "Saved. The shop is rebuilding — the change is live in about two minutes."
        : `Saved to the catalogue. The shop still shows the old version${
            d.rebuild?.reason ? ` (${d.rebuild.reason})` : ""
          } — push a commit to refresh it.`,
    });
    setBusy(false);
    router.refresh();
    if (isNew) router.push(`/admin/products/${d.sku}`);
  }

  async function archive(archived: boolean) {
    setBusy(true);
    const res = await fetch("/api/admin/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive", sku: f.sku, archived }),
    });
    const d = (await res.json()) as { ok?: boolean; error?: string };
    setMsg(d.ok ? { ok: true, text: archived ? "Archived — hidden from the shop." : "Restored." }
                : { ok: false, text: d.error ?? "Failed." });
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="rounded-2xl border border-duv-line bg-white p-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">Basics</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="SKU" hint={isNew ? "Letters, numbers and dashes. Can't be changed later." : "Fixed once created."}>
            <input value={f.sku} onChange={set("sku")} disabled={!isNew} required
              className={`${input} font-mono disabled:bg-duv-shell disabled:text-duv-muted`} />
          </Field>
          <Field label="Price (USD)">
            <input value={f.price} onChange={set("price")} inputMode="decimal" required className={input} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Title"><input value={f.title} onChange={set("title")} required className={input} /></Field>
          </div>
          <Field label="Category">
            <select value={f.category} onChange={set("category")} className={input}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Type" hint="e.g. chains, pendants, film, transfer-paper">
            <input value={f.subcategory} onChange={set("subcategory")} required className={input} />
          </Field>
          <Field label="Illustration" hint="Used until a photo exists">
            <select value={f.art} onChange={set("art")} className={input}>
              {ART.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <label className="flex items-end gap-2.5 pb-2 text-[13.5px]">
            <input type="checkbox" checked={f.wholesale} onChange={set("wholesale")} className="h-4 w-4 accent-[#7B3FF2]" />
            <span className="text-duv-muted">Wholesale lot (multi-piece pack)</span>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-duv-line bg-white p-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">Description</h2>
        <div className="mt-5 space-y-4">
          <Field label="Lead paragraph">
            <textarea value={f.description} onChange={set("description")} rows={3} className={input} />
          </Field>
          <Field label="Highlights" hint="One per line">
            <textarea value={f.highlights} onChange={set("highlights")} rows={4} className={input} />
          </Field>
          <Field label="Good for" hint="One line: who this is for">
            <input value={f.goodFor} onChange={set("goodFor")} className={input} />
          </Field>
          <Field label="Specifications" hint="One per line, as  Name: value">
            <textarea value={f.specs} onChange={set("specs")} rows={4} className={`${input} font-mono text-[13px]`} />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-duv-line bg-white p-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">Inventory</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Stock" hint="Blank = not counted">
            <input value={f.stock} onChange={set("stock")} inputMode="numeric" className={input} />
          </Field>
          <Field label="Low stock at">
            <input value={f.lowStockAt} onChange={set("lowStockAt")} inputMode="numeric" className={input} />
          </Field>
          <Field label="Ship weight (oz)">
            <input value={f.shipWeightOz} onChange={set("shipWeightOz")} inputMode="decimal" className={input} />
          </Field>
          <Field label="UPC" hint="12–13 digits, or blank">
            <input value={f.upc} onChange={set("upc")} inputMode="numeric" className={`${input} font-mono`} />
          </Field>
          <Field
            label="Cost price (USD)"
            hint="What you pay your supplier. Blank = not recorded; profit reports will say so rather than guess."
          >
            <input value={f.costPrice} onChange={set("costPrice")} inputMode="decimal" placeholder="e.g. 4.20" className={input} />
          </Field>
        </div>
      </div>

      <ImageEditor value={productImages} onChange={setProductImages} />

      {msg && (
        <p role="status" className={`rounded-xl px-4 py-3 text-[13.5px] font-semibold ${
          msg.ok ? "bg-duv-mint/20 text-duv-green-ink" : "bg-duv-red/10 text-duv-red"}`}>
          {msg.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy}
          className="rounded-full bg-duv-pink-deep px-8 py-3.5 text-[14.5px] font-bold text-white hover:bg-duv-coral-deep disabled:bg-duv-faint">
          {busy ? "Saving…" : isNew ? "Create product" : "Save changes"}
        </button>
        {!isNew && (
          <button type="button" disabled={busy} onClick={() => archive(!product?.archived)}
            className="text-[13.5px] font-semibold text-duv-muted underline underline-offset-4 hover:text-duv-red">
            {product?.archived ? "Restore to shop" : "Archive (hide from shop)"}
          </button>
        )}
      </div>
      {!isNew && (
        <p className="text-[12.5px] leading-relaxed text-duv-faint-ink">
          Products are archived, never deleted — deleting would break past orders and any link
          Google has already indexed.
        </p>
      )}
    </form>
  );
}
