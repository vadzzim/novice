"use client";

import { useState, useTransition } from "react";
import { confirmAction } from "@/app/actions";

export function ConfirmButton({ token, actionId }: { token: string; actionId: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmAction({ token, actionId });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="min-h-12 rounded-lg bg-green-700 px-4 py-3 text-base font-semibold text-white disabled:bg-zinc-300"
      >
        {pending ? "Сохраняем…" : "Все затруднения из этого ответа устранены"}
      </button>
      <p className="text-sm text-zinc-600">
        Назначение действия ещё не значит, что вопрос решён. Если он не решён, не подтверждайте.
      </p>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
          <button type="button" onClick={() => window.location.reload()} className="ml-2 underline">
            Обновить страницу
          </button>
        </div>
      )}
    </div>
  );
}
