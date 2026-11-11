import { addDays, workDay } from "./dates";

export const DEPARTMENTS = ["склад", "магазин", "продажи", "офис"] as const;
export const CHECKPOINTS = [1, 7] as const;
export type Checkpoint = (typeof CHECKPOINTS)[number];

export const QUESTIONS = {
  qClear: {
    label: "Понятно, что от вас ждут в работе?",
    options: ["да", "частично", "нет"],
  },
  qEquipped: {
    label: "Есть всё нужное для работы: форма, доступы, инструменты?",
    options: ["да", "нет"],
  },
  qSupport: {
    label: "Есть кому задать вопрос, если что-то непонятно?",
    options: ["да", "нет"],
  },
  qMood: {
    label: "Как вам у нас сейчас?",
    options: ["хорошо", "так себе", "думаю об уходе"],
  },
} as const;

export type QuestionKey = keyof typeof QUESTIONS;
export const QUESTION_KEYS = Object.keys(QUESTIONS) as QuestionKey[];
export const DETAILS_MAX = 1000;
export const ACTION_TEXT_MAX = 500;
export const ASSIGNEE_MAX = 100;
/** Опрос задержан, когда с контрольной даты прошло больше двух календарных дней. */
export const WAIT_DAYS = 2;

export type Answers = {
  qClear: string;
  qEquipped: string;
  qSupport: string;
  qMood: string;
};

export type CheckinLike = Answers & {
  id: number;
  day: number;
  details: string;
  createdAt: Date;
};

export type ActionLike = {
  id: number;
  checkinId: number;
  actionText: string;
  assignee: string;
  dueDate: string;
  confirmedAt: Date | null;
};

export function isNegative(a: Answers): boolean {
  return (
    a.qClear !== "да" || a.qEquipped === "нет" || a.qSupport === "нет" || a.qMood !== "хорошо"
  );
}

/** Строки проблемы, вычисленные из ответов. Причину не придумываем. */
export function problemLines(a: Answers): string[] {
  const lines: string[] = [];
  if (a.qClear === "частично") lines.push("Не до конца понятно, что ждут в работе");
  if (a.qClear === "нет") lines.push("Непонятно, что ждут в работе");
  if (a.qEquipped === "нет") lines.push("Не хватает необходимого для работы");
  if (a.qSupport === "нет") lines.push("Не к кому обратиться с вопросом");
  if (a.qMood === "так себе") lines.push("Самочувствие на работе «так себе»");
  if (a.qMood === "думаю об уходе") lines.push("Думает об уходе");
  return lines;
}

/** Полный текст проблемы: перечисляет все негативные ответы и уточнение новичка. */
export function problemText(c: Answers & { details: string }): string {
  const lines = problemLines(c);
  const details = c.details.trim();
  if (details) return `${lines.join("; ")}. Уточнение: «${details}»`;
  return `${lines.join("; ")} — нужно уточнить`;
}

export type SurveyState =
  | { kind: "not_started"; startDate: string }
  | { kind: "open"; point: Checkpoint; day: number };

/** Какой опрос доступен в эту дату. */
export function surveyState(startDate: string, today: string): SurveyState {
  const day = workDay(startDate, today);
  if (day < 1) return { kind: "not_started", startDate };
  return { kind: "open", point: day >= 7 ? 7 : 1, day };
}

export function pointDate(startDate: string, point: Checkpoint): string {
  return addDays(startDate, point - 1);
}

/** Ответ задержан: прошло больше WAIT_DAYS календарных дней с контрольной даты. */
export function isLate(startDate: string, point: Checkpoint, today: string): boolean {
  return workDay(pointDate(startDate, point), today) - 1 > WAIT_DAYS;
}

export function isOverdue(action: ActionLike, today: string): boolean {
  return action.confirmedAt === null && action.dueDate < today;
}

export const STATUSES = [
  "need_help",
  "in_work",
  "no_response",
  "waiting",
  "ok",
  "not_started",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  need_help: "Нужна помощь",
  in_work: "В работе",
  no_response: "Нет ответа",
  waiting: "Ждём ответа",
  ok: "В порядке",
  not_started: "Ещё не вышел",
};

export type OpenProblem = {
  checkin: CheckinLike;
  action: ActionLike | null;
  urgent: boolean;
  reason: "no_action" | "overdue" | "leaving" | null;
};

export type Evaluation = {
  status: Status;
  day: number;
  survey: SurveyState;
  openProblems: OpenProblem[];
  /** Чек-ин для карточки: давший «Нужна помощь», иначе последний открытый. */
  featured: OpenProblem | null;
  /** «Нет ответа за день N» при открытой проблеме. */
  lateNote: string | null;
  missedPoints: Checkpoint[];
};

/**
 * Статус новичка. Чистая функция: дата передаётся снаружи, часы не читаются.
 */
export function evaluate(
  employee: { startDate: string },
  checkins: CheckinLike[],
  actions: ActionLike[],
  today: string,
): Evaluation {
  const survey = surveyState(employee.startDate, today);
  const day = workDay(employee.startDate, today);
  const byCheckin = new Map(actions.map((a) => [a.checkinId, a]));
  const sorted = [...checkins].sort((a, b) => a.day - b.day);

  const openProblems: OpenProblem[] = sorted
    .filter((c) => isNegative(c) && !byCheckin.get(c.id)?.confirmedAt)
    .map((c) => {
      const action = byCheckin.get(c.id) ?? null;
      const reason: OpenProblem["reason"] = !action
        ? "no_action"
        : isOverdue(action, today)
          ? "overdue"
          : c.qMood === "думаю об уходе"
            ? "leaving"
            : null;
      return { checkin: c, action, urgent: reason !== null, reason };
    });

  const missedPoints: Checkpoint[] =
    survey.kind === "open" && survey.point === 7 && !sorted.some((c) => c.day === 1) ? [1] : [];

  let currentUnanswered = false;
  let currentLate = false;
  if (survey.kind === "open") {
    currentUnanswered = !sorted.some((c) => c.day === survey.point);
    currentLate = currentUnanswered && isLate(employee.startDate, survey.point, today);
  }

  let status: Status;
  if (survey.kind === "not_started") status = "not_started";
  else if (openProblems.some((p) => p.urgent)) status = "need_help";
  else if (openProblems.length > 0) status = "in_work";
  else if (currentLate) status = "no_response";
  else if (currentUnanswered) status = "waiting";
  else status = "ok";

  const featured =
    openProblems.find((p) => p.urgent) ?? openProblems[openProblems.length - 1] ?? null;

  const lateNote =
    openProblems.length > 0 && currentLate && survey.kind === "open"
      ? `Нет ответа за день ${survey.point}`
      : null;

  return { status, day, survey, openProblems, featured, lateNote, missedPoints };
}

export type CheckinValidation =
  | { ok: true; answers: Answers; details: string }
  | { ok: false; error: string };

export function validateCheckin(input: Record<string, unknown>): CheckinValidation {
  const answers = {} as Answers;
  for (const key of QUESTION_KEYS) {
    const value = input[key];
    const allowed: readonly string[] = QUESTIONS[key].options;
    if (typeof value !== "string" || !allowed.includes(value)) {
      return { ok: false, error: "Ответьте на все четыре вопроса" };
    }
    answers[key] = value;
  }
  const rawDetails = input.details ?? "";
  if (typeof rawDetails !== "string") return { ok: false, error: "Неверное уточнение" };
  const details = rawDetails.trim();
  if (details.length > DETAILS_MAX) {
    return { ok: false, error: `Уточнение длиннее ${DETAILS_MAX} символов` };
  }
  return { ok: true, answers, details };
}
