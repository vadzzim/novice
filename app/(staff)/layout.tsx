import Link from "next/link";

// Шапка с доской HR только у экранов HR; у новичка на /s/ её нет.
export default function StaffLayout({ children }: LayoutProps<"/">) {
  return (
    <>
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
    </>
  );
}
