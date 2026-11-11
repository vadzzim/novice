"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { calendarDate, isValidIsoDate } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { actions, checkins, employees } from "@/lib/db/schema";
import {
  ACTION_TEXT_MAX,
  ASSIGNEE_MAX,
  isNegative,
  surveyState,
  validateCheckin,
} from "@/lib/domain";
import { ResetDisabledError, resetDemo, resetEnabled } from "@/lib/reset";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; code?: "stale" | "gone" };

const GONE: ActionResult = {
  ok: false,
  code: "gone",
  error: "Данные изменились (возможно, демо сбросили). Обновите страницу.",
};

function today() {
  return calendarDate(new Date());
}

async function guard(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Не удалось сохранить. Попробуйте ещё раз." };
  }
}

export async function submitCheckin(input: {
  token: string;
  day: number;
  qClear?: string;
  qEquipped?: string;
  qSupport?: string;
  qMood?: string;
  details?: string;
}): Promise<ActionResult> {
  return guard(async () => {
    const db = getDb();
    const [employee] = await db.select().from(employees).where(eq(employees.token, String(input.token)));
    if (!employee) return { ok: false, error: "Ссылка недействительна." };

    const state = surveyState(employee.startDate, today());
    if (state.kind === "not_started") return { ok: false, error: "Опрос откроется в день выхода." };
    if (state.point !== input.day) {
      return {
        ok: false,
        code: "stale",
        error: `Сейчас открыт опрос за день ${state.point}. Обновите страницу, чтобы ответить на него.`,
      };
    }

    const v = validateCheckin(input);
    if (!v.ok) return v;

    // Ответ сохраняется один раз: повторная отправка возвращает уже сохранённый ответ.
    const inserted = await db
      .insert(checkins)
      .values({ employeeId: employee.id, day: state.point, ...v.answers, details: v.details })
      .onConflictDoNothing({ target: [checkins.employeeId, checkins.day] })
      .returning({ id: checkins.id });
    if (!inserted.length) {
      // Ответ уже сохранили (например, в другой вкладке) — этот вариант не записан.
      return {
        ok: false,
        code: "stale",
        error: "Ответ на этот опрос уже был сохранён раньше, этот вариант не записан. Обновите страницу.",
      };
    }
    refresh();
    return { ok: true };
  });
}

export async function saveAction(input: {
  employeeId: number;
  checkinId: number;
  actionId?: number;
  actionText: string;
  assignee: string;
  dueDate: string;
}): Promise<ActionResult> {
  return guard(async () => {
    const actionText = String(input.actionText ?? "").trim();
    const assignee = String(input.assignee ?? "").trim();
    const dueDate = String(input.dueDate ?? "");
    if (!actionText) return { ok: false, error: "Опишите действие." };
    if (actionText.length > ACTION_TEXT_MAX)
      return { ok: false, error: `Действие длиннее ${ACTION_TEXT_MAX} символов.` };
    if (!assignee) return { ok: false, error: "Укажите ответственного." };
    if (assignee.length > ASSIGNEE_MAX)
      return { ok: false, error: `Ответственный длиннее ${ASSIGNEE_MAX} символов.` };
    if (!isValidIsoDate(dueDate)) return { ok: false, error: "Укажите срок." };
    if (dueDate < today()) return { ok: false, error: "Срок не может быть раньше сегодняшнего дня." };

    const db = getDb();
    const [checkin] = await db
      .select()
      .from(checkins)
      .where(and(eq(checkins.id, Number(input.checkinId)), eq(checkins.employeeId, Number(input.employeeId))));
    if (!checkin) return GONE;
    if (!isNegative(checkin)) return { ok: false, error: "В этом ответе нет проблемы." };

    if (input.actionId) {
      const updated = await db
        .update(actions)
        .set({ actionText, assignee, dueDate })
        .where(
          and(
            eq(actions.id, Number(input.actionId)),
            eq(actions.checkinId, checkin.id),
            isNull(actions.confirmedAt),
          ),
        )
        .returning({ id: actions.id });
      if (!updated.length) {
        const [existing] = await db.select().from(actions).where(eq(actions.id, Number(input.actionId)));
        if (!existing || existing.checkinId !== checkin.id) return GONE;
        return { ok: false, error: "Новичок уже подтвердил решение — действие изменить нельзя." };
      }
      refresh();
      return { ok: true, message: "Действие обновлено." };
    }

    const inserted = await db
      .insert(actions)
      .values({ checkinId: checkin.id, actionText, assignee, dueDate })
      .onConflictDoNothing({ target: actions.checkinId })
      .returning({ id: actions.id });
    refresh();
    if (!inserted.length) {
      return { ok: false, error: "Действие по этому ответу уже назначено. Обновите страницу." };
    }
    return { ok: true, message: "Действие назначено." };
  });
}

export async function confirmAction(input: { token: string; actionId: number }): Promise<ActionResult> {
  return guard(async () => {
    const db = getDb();
    // Действие принадлежит владельцу токена через чек-ин.
    const rows = await db
      .select({ id: actions.id })
      .from(actions)
      .innerJoin(checkins, eq(actions.checkinId, checkins.id))
      .innerJoin(employees, eq(checkins.employeeId, employees.id))
      .where(and(eq(actions.id, Number(input.actionId)), eq(employees.token, String(input.token))));
    if (!rows.length) return GONE;
    // Повторное подтверждение не меняет исходное время.
    const updated = await db
      .update(actions)
      .set({ confirmedAt: sql`coalesce(${actions.confirmedAt}, now())` })
      .where(eq(actions.id, rows[0].id))
      .returning({ id: actions.id });
    if (!updated.length) return GONE;
    refresh();
    return { ok: true };
  });
}

export async function resetDemoAction(): Promise<ActionResult> {
  if (!resetEnabled()) return { ok: false, error: "Сброс демо отключён на этом сервере." };
  return guard(async () => {
    try {
      await resetDemo();
    } catch (e) {
      if (e instanceof ResetDisabledError) return { ok: false, error: e.message };
      throw e;
    }
    refresh();
    return { ok: true, message: "Демо сброшено." };
  });
}
