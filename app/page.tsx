import { Header } from "@/components/layout/Header";
import { UploadForm } from "@/components/shared/UploadForm";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function HomePage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} dict={dict} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="whitespace-pre-line text-3xl font-semibold sm:text-4xl">{dict.landing.title}</h1>
          <p className="text-muted-foreground">{dict.landing.subtitle}</p>
        </div>
        <UploadForm dict={dict} locale={locale} />
      </main>
    </div>
  );
}
