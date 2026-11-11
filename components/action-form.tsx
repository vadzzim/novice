"use client";

import { useState, useTransition } from "react";
import { saveAction } from "@/app/actions";
import { ACTION_TEXT_MAX, ASSIGNEE_MAX } from "@/lib/domain";

export function ActionForm({
  employeeId,
  checkinId,
  today,
  defaults,
  existing,
}: {
  employeeId: number;
  checkinId: number;
  today: string;
  defaults: { actionText: string; dueDate: string };
  existing?: { id: number; actionText: string; assignee: string; dueDate: string };
}) {
  const [open, setOpen] = useState(!existing);
  const [actionText, setActionText] = useState(existing?.actionText ?? defaults.actionText);
  const [assignee, setAssignee] = useState(existing?.assignee ?? "");
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? defaults.dueDate);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="justify-self-start rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
      >
        Изменить действие
      </button>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveAction({
          employeeId,
          checkinId,
          actionId: existing?.id,
          actionText,
          assignee,
          dueDate,
        });
        if (!result.ok) {
          setError(result.error);
          setGone(result.code === "gone");
        } else if (existing) {
          setOpen(false);
        }
      } catch {
        setError("Не удалось выполнить запрос. Проверьте соединение и попробуйте ещё раз.");
        setGone(false);
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-md border border-blue-200 bg-blue-50/50 p-3">
      <h3 className="font-semibold">{existing ? "Изменить действие" : "Назначить действие"}</h3>
      <label className="grid gap-1 text-sm">
        <span>Что сделать</span>
        <textarea
          value={actionText}
          onChange={(e) => setActionText(e.target.value)}
          maxLength={ACTION_TEXT_MAX}
          rows={2}
          required
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>Ответственный</span>
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            maxLength={ASSIGNEE_MAX}
            required
            placeholder="Например: Алексей"
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Срок</span>
          <input
            type="date"
            value={dueDate}
            min={today}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5"
          />
        </label>
      </div>
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
          {gone && (
            <button type="button" onClick={() => window.location.reload()} className="ml-2 underline">
              Обновить страницу
            </button>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-300"
        >
          {pending ? "Сохраняем…" : existing ? "Сохранить изменения" : "Назначить"}
        </button>
        {existing && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:underline"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}
