import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { CopyButton } from "@/components/copy-button";
import { ResetButton } from "@/components/reset-button";
import { Card, Loading, StatusBadge } from "@/components/ui";
import { calendarDate, formatRuDate } from "@/lib/dates";
import { STATUSES, isOverdue, problemText } from "@/lib/domain";
import { loadBoard } from "@/lib/queries";
import { resetEnabled } from "@/lib/reset";

export default function BoardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Board />
    </Suspense>
  );
}

async function Board() {
  await connection();
  const today = calendarDate(new Date());
  const views = await loadBoard(today);
  const order = (s: (typeof STATUSES)[number]) => STATUSES.indexOf(s);
  const sorted = [...views].sort(
    (a, b) =>
      order(a.evaluation.status) - order(b.evaluation.status) ||
      a.employee.name.localeCompare(b.employee.name, "ru"),
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Новички: первые дни</h1>
          <p className="text-sm text-zinc-600">
            Сегодня {formatRuDate(today)}. Опросы в дни 1 и 7; ссылку новичку HR отправляет вручную.
          </p>
        </div>
        {resetEnabled() && <ResetButton />}
      </div>

      {sorted.length === 0 && (
        <Card>
          <p className="text-sm">В базе нет новичков. Запустите сид: pnpm db:seed</p>
        </Card>
      )}

      <ul className="grid gap-3">
        {sorted.map(({ employee, evaluation }) => {
          const { status, featured, openProblems, lateNote } = evaluation;
          const action = featured?.action;
          return (
            <li key={employee.id}>
              <Card className="grid gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link
                    href={`/hr/${employee.id}`}
                    className="font-semibold text-blue-800 hover:underline"
                  >
                    {employee.name}
                  </Link>
                  <StatusBadge status={status} />
                  {lateNote && (
                    <span className="text-xs font-medium text-orange-700">{lateNote}</span>
                  )}
                  <span className="ml-auto text-sm text-zinc-500">
                    {employee.department} · {employee.position} ·{" "}
                    {status === "not_started"
                      ? `выход ${formatRuDate(employee.startDate)}`
                      : `день ${evaluation.day}`}
                  </span>
                </div>

                {featured && (
                  <p className="text-sm">
                    <span className="text-zinc-500">День {featured.checkin.day}: </span>
                    {problemText(featured.checkin)}
                  </p>
                )}
                {action && (
                  <p className="text-sm">
                    <span className="text-zinc-500">Действие: </span>
                    {action.actionText} — {action.assignee}, до {formatRuDate(action.dueDate)}
                    {isOverdue(action, today) && (
                      <span className="ml-1 font-medium text-red-700">просрочено</span>
                    )}
                  </p>
                )}
                {featured?.reason === "leaving" && (
                  <p className="text-sm font-medium text-red-700">
                    Думает об уходе — держим на контроле до подтверждения решения.
                  </p>
                )}
                {status === "no_response" && (
                  <p className="text-sm text-zinc-600">
                    Нет ответа больше двух дней. Получил ли новичок ссылку, система не знает —
                    уточните лично.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <CopyButton path={`/s/${employee.token}`} label="Скопировать ссылку новичка" />
                  <Link
                    href={`/hr/${employee.id}`}
                    className="rounded-md px-3 py-1.5 text-sm text-blue-700 hover:underline"
                  >
                    Открыть карточку
                    {openProblems.length > 1 && ` · открытых ответов: ${openProblems.length}`}
                  </Link>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
