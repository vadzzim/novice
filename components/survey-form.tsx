"use client";

import { useState, useTransition } from "react";
import { submitCheckin } from "@/app/actions";
import {
  DETAILS_MAX,
  QUESTIONS,
  QUESTION_KEYS,
  isNegative,
  type Answers,
  type QuestionKey,
} from "@/lib/domain";

export function SurveyForm({ token, day }: { token: string; day: number }) {
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [pending, startTransition] = useTransition();

  const complete = QUESTION_KEYS.every((k) => answers[k]);
  const negative = complete
    ? isNegative(answers as Answers)
    : QUESTION_KEYS.some((k) => answers[k] && answers[k] !== QUESTIONS[k].options[0]);

  function choose(key: QuestionKey, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitCheckin({
        token,
        day,
        ...answers,
        details: negative ? details : "",
      });
      if (!result.ok) {
        setError(result.error);
        setStale(result.code === "stale" || result.code === "gone");
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      {QUESTION_KEYS.map((key) => (
        <fieldset key={key} className="grid gap-2">
          <legend className="mb-2 font-medium">{QUESTIONS[key].label}</legend>
          <div className="flex flex-wrap gap-2">
            {QUESTIONS[key].options.map((option) => {
              const selected = answers[key] === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => choose(key, option)}
                  className={
                    "min-h-11 flex-1 rounded-lg border px-3 py-2 text-base " +
                    (selected
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50")
                  }
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {negative && (
        <label className="grid gap-1.5">
          <span className="font-medium">
            Что именно мешает? <span className="font-normal text-zinc-500">(необязательно)</span>
          </span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={DETAILS_MAX}
            rows={3}
            placeholder="Например: нет доступа к терминалу, не выдали форму, непонятно, какие задачи мои"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base"
          />
        </label>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
          {stale && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ml-2 underline"
            >
              Обновить страницу
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!complete || pending}
        className="min-h-12 rounded-lg bg-blue-700 px-4 py-3 text-base font-semibold text-white disabled:bg-zinc-300"
      >
        {pending ? "Отправляем…" : complete ? "Отправить" : "Ответьте на все вопросы"}
      </button>
    </form>
  );
}
