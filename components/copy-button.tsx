"use client";

import { useState } from "react";

export function CopyButton({
  text,
  path,
  label,
  className = "",
}: {
  /** Готовый текст для копирования. */
  text?: string;
  /** Путь на этом сайте; копируется полная ссылка. */
  path?: string;
  label: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  async function copy() {
    const value = path ? `${window.location.origin}${path}` : (text ?? "");
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      window.prompt("Скопируйте вручную:", value);
      setState("error");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 ${className}`}
    >
      {state === "done" ? "Скопировано" : label}
    </button>
  );
}
