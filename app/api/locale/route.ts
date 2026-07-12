import { NextRequest, NextResponse } from "next/server";
import { LOCALES } from "@/lib/i18n/dictionaries";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";

export async function POST(req: NextRequest) {
  const { locale } = await req.json();

  if (!LOCALES.includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 422 });
  }

  const res = NextResponse.json({ locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return res;
}
