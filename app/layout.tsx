import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Пульс новичка",
  description: "Демо: короткие опросы новичков и работа HR с препятствиями первой недели",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <div className="bg-amber-100 text-amber-900 text-center text-sm font-medium px-3 py-1.5 border-b border-amber-200">
          Открытое демо. Только вымышленные данные
        </div>
        <header className="border-b border-zinc-200 bg-white">
          <nav className="mx-auto max-w-4xl flex items-center gap-4 px-4 py-2 text-sm">
            <Link href="/" className="font-semibold text-zinc-900">
              Пульс новичка
            </Link>
            <Link href="/hr" className="text-blue-700 hover:underline">
              Доска HR
            </Link>
            <span className="ml-auto text-xs text-zinc-500">переключатель экранов — не авторизация</span>
          </nav>
        </header>
        <main className="flex-1 w-full mx-auto max-w-4xl px-4 py-5">{children}</main>
      </body>
    </html>
  );
}
