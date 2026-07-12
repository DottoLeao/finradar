import Link from "next/link";
import { Radar } from "lucide-react";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Radar className="size-5 text-primary" />
          {dict.nav.brand}
        </Link>
        <LanguageSwitcher locale={locale} label={dict.nav.languageToggle} />
      </div>
    </header>
  );
}
