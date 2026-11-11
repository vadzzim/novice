"use client";

import { useState, useTransition } from "react";
import { resetDemoAction } from "@/app/actions";

export function ResetButton() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    if (!window.confirm("Ответы и действия всех посетителей этого демо будут сброшены")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await resetDemoAction();
      setMessage(
        result.ok
          ? { ok: true, text: result.message ?? "Демо сброшено." }
          : { ok: false, text: result.error },
      );
    });
  }

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span role="status" className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>
          {message.text}
        </span>
      )}
      <button
        type="button"
        onClick={reset}
        disabled={pending}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:text-zinc-400"
      >
        {pending ? "Сбрасываем…" : "Сбросить демо"}
      </button>
    </div>
  );
}
