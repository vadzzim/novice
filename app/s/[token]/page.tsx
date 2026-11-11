import { Suspense } from "react";
import { connection } from "next/server";
import { AnswersList, Card, Loading } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { SurveyForm } from "@/components/survey-form";
import { calendarDate, formatRuDate, formatRuDateTime } from "@/lib/dates";
import { CHECKPOINTS, isNegative, isOverdue, pointDate } from "@/lib/domain";
import { loadEmployeeByToken } from "@/lib/queries";

export default function SurveyPage({ params }: PageProps<"/s/[token]">) {
  return (
    <div className="mx-auto max-w-md">
      <Suspense fallback={<Loading />}>
        <Survey params={params} />
      </Suspense>
    </div>
  );
}

async function Survey({ params }: Pick<PageProps<"/s/[token]">, "params">) {
  await connection();
  const { token } = await params;
  const today = calendarDate(new Date());
  const view = await loadEmployeeByToken(token, today);

  if (!view) {
    return (
      <Card>
        <h1 className="text-lg font-semibold">Ссылка не найдена</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Проверьте ссылку или попросите HR прислать её ещё раз.
        </p>
      </Card>
    );
  }

  const { employee, checkins, actions, evaluation } = view;
  const { survey } = evaluation;
  const firstName = employee.name.split(" ")[0];

  if (survey.kind === "not_started") {
    return (
      <Card>
        <h1 className="text-lg font-semibold">
          {firstName}, ждём вас {formatRuDate(employee.startDate)}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Опрос откроется в день выхода. Он займёт около 30 секунд.
        </p>
      </Card>
    );
  }

  const current = checkins.find((c) => c.day === survey.point);
  const history = [...checkins].sort((a, b) => b.day - a.day);
  const actionByCheckin = new Map(actions.map((a) => [a.checkinId, a]));
  const missed = CHECKPOINTS.filter(
    (p) => p < survey.point && !checkins.some((c) => c.day === p),
  );

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">
          Опрос за день {survey.point} · сейчас день {survey.day} · {employee.department}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {firstName}, четыре вопроса о первых днях. Ответ увидит HR и поможет, если что-то мешает.
        </p>
      </div>

      {current ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Ответ за день {survey.point} сохранён. Спасибо!
        </p>
      ) : (
        <Card>
          <SurveyForm token={token} day={survey.point} />
        </Card>
      )}

      {history.map((c) => {
        const action = actionByCheckin.get(c.id);
        return (
          <Card key={c.id} className="grid gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">Ваш ответ за день {c.day}</h2>
              <span className="text-xs text-zinc-500">{formatRuDateTime(c.createdAt)}</span>
            </div>
            <AnswersList answers={c} />
            {c.details && <p className="text-sm text-zinc-700">«{c.details}»</p>}
            {isNegative(c) && !action && (
              <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                HR видит ваш ответ. Здесь появится, кто и к какому сроку поможет.
              </p>
            )}
            {action && (
              <div className="grid gap-2 rounded-md bg-zinc-50 p-3 text-sm">
                <p>
                  <span className="text-zinc-600">Что сделают: </span>
                  {action.actionText}
                </p>
                <p>
                  <span className="text-zinc-600">Ответственный: </span>
                  {action.assignee}
                </p>
                <p>
                  <span className="text-zinc-600">Срок: </span>
                  {formatRuDate(action.dueDate)}
                  {isOverdue(action, today) && (
                    <span className="ml-1 text-red-700">(срок прошёл)</span>
                  )}
                </p>
                {action.confirmedAt ? (
                  <p className="font-medium text-green-800">
                    Вы подтвердили, что затруднения устранены ·{" "}
                    {formatRuDateTime(action.confirmedAt)}
                  </p>
                ) : (
                  <ConfirmButton token={token} actionId={action.id} />
                )}
              </div>
            )}
          </Card>
        );
      })}

      {missed.map((p) => (
        <p key={p} className="text-sm text-zinc-500">
          Опрос за день {p} ({formatRuDate(pointDate(employee.startDate, p))}) пропущен.
        </p>
      ))}
    </div>
  );
}
