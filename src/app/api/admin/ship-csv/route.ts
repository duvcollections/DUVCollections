import { NextResponse } from "next/server";
import { requireAdmin, AccessError } from "@/lib/access";
import { listOrders } from "@/lib/orders-admin";
import { allProducts } from "@/lib/catalog";
import { unshippedToCsv } from "@/lib/shipping-csv";

/** Download every order still waiting for a label, ready to upload to Pirate Ship. */
export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof AccessError ? err.message : "Not authorised.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const [orders, products] = await Promise.all([listOrders(100), allProducts()]);
  const waiting = orders.filter((o) => o.status === "paid");

  return new NextResponse(unshippedToCsv(waiting, products), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="duv-unshipped.csv"`,
      // Never cached: it's a live list of what still needs packing.
      "Cache-Control": "no-store",
    },
  });
}
