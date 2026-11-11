import { STATUS_LABEL, type Status, QUESTIONS, QUESTION_KEYS, type Answers } from "@/lib/domain";

const STATUS_STYLE: Record<Status, string> = {
  need_help: "bg-red-100 text-red-800 border-red-200",
  in_work: "bg-blue-100 text-blue-800 border-blue-200",
  no_response: "bg-orange-100 text-orange-800 border-orange-200",
  waiting: "bg-zinc-100 text-zinc-700 border-zinc-200",
  ok: "bg-green-100 text-green-800 border-green-200",
  not_started: "bg-white text-zinc-500 border-zinc-200",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function AnswersList({ answers }: { answers: Answers }) {
  return (
    <dl className="grid gap-1 text-sm">
      {QUESTION_KEYS.map((key) => {
        const value = answers[key];
        const bad = value !== QUESTIONS[key].options[0];
        return (
          <div key={key} className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-zinc-600">{QUESTIONS[key].label}</dt>
            <dd className={bad ? "font-semibold text-red-700" : "text-zinc-900"}>{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-zinc-200 bg-white p-4 ${className}`}>{children}</div>;
}

export function Loading() {
  return <p className="text-sm text-zinc-500">Загрузка…</p>;
}
