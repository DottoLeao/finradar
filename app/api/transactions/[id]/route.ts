import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/categorize/rules";
import { createAdminClient } from "@/lib/supabase/admin";

const ASSIGNABLE_CATEGORIES = CATEGORIES.filter((c) => c !== "uncategorized");

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { category } = await req.json();

  if (!ASSIGNABLE_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("transactions")
    .update({ category, category_source: "manual" })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({ transaction: data });
}
