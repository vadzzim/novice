import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ActionForm } from "@/components/action-form";
import { CopyButton } from "@/components/copy-button";
import { AnswersList, Card, Loading, StatusBadge } from "@/components/ui";
import { bitrixTaskText } from "@/lib/bitrix";
import { addDays, calendarDate, formatRuDate, formatRuDateTime } from "@/lib/dates";
import {
  CHECKPOINTS,
  isLate,
  isNegative,
  isOverdue,
  pointDate,
  problemLines,
  problemText,
} from "@/lib/domain";
import { loadEmployeeById } from "@/lib/queries";

export default function EmployeePage({ params }: PageProps<"/hr/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EmployeeCard params={params} />
    </Suspense>
  );
}

async function EmployeeCard({ params }: Pick<PageProps<"/hr/[id]">, "params">) {
  await connection();
  const { id } = await params;
  const today = calendarDate(new Date());
  const view = await loadEmployeeById(Number(id), today);

  if (!view) {
    return (
      <Card>
        <h1 className="text-lg font-semibold">Новичок не найден</h1>
        <Link href="/hr" className="mt-2 inline-block text-sm text-blue-700 hover:underline">
          ← К доске
        </Link>
      </Card>
    );
  }

  const { employee, checkins, actions, evaluation } = view;
  const { survey } = evaluation;
  const actionByCheckin = new Map(actions.map((a) => [a.checkinId, a]));

  return (
    <div className="grid gap-4">
      <Link href="/hr" className="text-sm text-blue-700 hover:underline">
        ← К доске
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{employee.name}</h1>
        <StatusBadge status={evaluation.status} />
        {evaluation.lateNote && (
          <span className="text-sm font-medium text-orange-700">{evaluation.lateNote}</span>
        )}
      </div>
      <p className="text-sm text-zinc-600">
        {employee.department} · {employee.position} · выход {formatRuDate(employee.startDate)}
        {survey.kind === "open" && ` · сейчас день ${survey.day}`}
      </p>
      <div>
        <CopyButton path={`/s/${employee.token}`} label="Скопировать ссылку новичка" />
      </div>

      {CHECKPOINTS.map((point) => {
        const checkin = checkins.find((c) => c.day === point);
        const date = pointDate(employee.startDate, point);

        if (!checkin) {
          let text: string;
          if (survey.kind === "not_started" || survey.day < point) {
            text = `Опрос откроется ${formatRuDate(date)}.`;
          } else if (survey.point !== point) {
            text = "Опрос пропущен: уже открыт следующий.";
          } else if (isLate(employee.startDate, point, today)) {
            text =
              "Нет ответа больше двух дней. Доставка ссылки не отслеживается — уточните у новичка лично.";
          } else {
            text = "Ждём ответа.";
          }
          return (
            <Card key={point}>
              <h2 className="font-semibold">День {point} · {formatRuDate(date)}</h2>
              <p className="mt-1 text-sm text-zinc-600">{text}</p>
            </Card>
          );
        }

        const action = actionByCheckin.get(checkin.id);
        const negative = isNegative(checkin);
        return (
          <Card key={point} className="grid gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">День {point} · {formatRuDate(date)}</h2>
              <span className="text-xs text-zinc-500">
                ответ {formatRuDateTime(checkin.createdAt)}
              </span>
            </div>
            <AnswersList answers={checkin} />
            {checkin.details && (
              <p className="text-sm">
                <span className="text-zinc-500">Уточнение: </span>«{checkin.details}»
              </p>
            )}

            {!negative && <p className="text-sm text-green-800">Затруднений не отмечено.</p>}

            {negative && (
              <div className="grid gap-1 rounded-md bg-red-50 p-3 text-sm">
                <p className="font-medium text-red-900">
                  {action?.confirmedAt ? "Проблема (закрыта)" : "Проблема"}
                </p>
                <p>{problemText(checkin)}</p>
              </div>
            )}

            {negative && !action && (
              <ActionForm
                employeeId={employee.id}
                checkinId={checkin.id}
                today={today}
                defaults={{
                  actionText: `Устранить: ${problemLines(checkin).join("; ").toLowerCase()}`,
                  dueDate: addDays(today, 1),
                }}
              />
            )}

            {action && (
              <div className="grid gap-2 rounded-md border border-zinc-200 p-3 text-sm">
                <p>
                  <span className="text-zinc-500">Действие: </span>
                  {action.actionText}
                </p>
                <p>
                  <span className="text-zinc-500">Ответственный: </span>
                  {action.assignee}
                </p>
                <p>
                  <span className="text-zinc-500">Срок: </span>
                  {formatRuDate(action.dueDate)}
                  {isOverdue(action, today) && (
                    <span className="ml-1 font-medium text-red-700">просрочено</span>
                  )}
                </p>
                {action.confirmedAt ? (
                  <p className="font-medium text-green-800">
                    Новичок подтвердил решение · {formatRuDateTime(action.confirmedAt)}
                  </p>
                ) : (
                  <>
                    <p className="text-zinc-700">
                      Ждём подтверждения новичка. Если он не подтверждает, свяжитесь с ним
                      напрямую и отправьте ссылку ещё раз — проблема остаётся открытой.
                    </p>
                    <ActionForm
                      employeeId={employee.id}
                      checkinId={checkin.id}
                      today={today}
                      defaults={{ actionText: action.actionText, dueDate: action.dueDate }}
                      existing={action}
                    />
                  </>
                )}
                <div className="mt-1 grid gap-1 border-t border-zinc-100 pt-2">
                  <div>
                    <CopyButton
                      text={bitrixTaskText({ employee, checkin, action })}
                      label="Скопировать задачу для Битрикс24"
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    Создайте задачу вручную; изменения и статусы между системами не
                    синхронизируются.
                  </p>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
