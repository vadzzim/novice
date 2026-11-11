import type { Metadata, Viewport } from "next";
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
        {children}
      </body>
    </html>
  );
}
