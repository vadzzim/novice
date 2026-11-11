import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { addDays, calendarDate } from "./dates";
import { getDb } from "./db";
import { actions, checkins, employees } from "./db/schema";
import { SEED, seedInstant, seedStartDate } from "./seed-data";

export function resetEnabled(): boolean {
  return process.env.DEMO_RESET_ENABLED === "true";
}

export class ResetDisabledError extends Error {
  constructor() {
    super("Сброс демо отключён: DEMO_RESET_ENABLED не равен true");
  }
}

/** Криптографически случайный токен, не связанный с id. */
export function newToken(): string {
  return randomBytes(18).toString("base64url");
}

/** Создаёт недостающих сотрудников сида. Существующие id и token не меняются. */
export async function ensureEmployees(today = calendarDate(new Date())) {
  if (!resetEnabled()) throw new ResetDisabledError();
  const db = getDb();
  const existing = await db.select({ name: employees.name }).from(employees);
  const names = new Set(existing.map((e) => e.name));
  const missing = SEED.filter((e) => !names.has(e.name));
  if (missing.length === 0) return 0;
  await db.insert(employees).values(
    missing.map((e) => ({
      name: e.name,
      department: e.department,
      position: e.position,
      startDate: seedStartDate(e, today),
      token: newToken(),
    })),
  );
  return missing.length;
}

/**
 * Сброс демо одним пакетом: удаляет действия и чек-ины, сдвигает даты выхода
 * и вставляет исходные ответы и действия. Neon выполняет пакет в одной транзакции.
 */
export async function resetDemo(
  today = calendarDate(new Date()),
  /** Только для проверки отката: добавляет заведомо ошибочный запрос в конец пакета. */
  options: { failAtEnd?: boolean } = {},
) {
  if (!resetEnabled()) throw new ResetDisabledError();
  const db = getDb();
  const rows = await db.select({ id: employees.id, name: employees.name }).from(employees);
  const idByName = new Map(rows.map((r) => [r.name, r.id]));
  const missing = SEED.filter((e) => !idByName.has(e.name)).map((e) => e.name);
  if (missing.length > 0) {
    throw new Error(`В базе нет сотрудников сида: ${missing.join(", ")}. Запустите pnpm db:seed`);
  }

  const statements: BatchItem<"pg">[] = [db.delete(actions), db.delete(checkins)];
  for (const e of SEED) {
    const employeeId = idByName.get(e.name)!;
    const start = seedStartDate(e, today);
    statements.push(
      db.update(employees).set({ startDate: start }).where(eq(employees.id, employeeId)),
    );
    for (const c of e.checkins) {
      statements.push(
        db.insert(checkins).values({
          employeeId,
          day: c.day,
          ...c.answers,
          details: c.details ?? "",
          createdAt: seedInstant(start, c.answeredOnDay ?? c.day),
        }),
      );
      if (c.action) {
        const a = c.action;
        const createdAt = seedInstant(start, a.createdOnDay).toISOString();
        const confirmedAt = a.confirmedOnDay
          ? seedInstant(start, a.confirmedOnDay).toISOString()
          : null;
        statements.push(
          db.execute(sql`
            insert into actions (checkin_id, action_text, assignee, due_date, created_at, confirmed_at)
            select id, ${a.text}, ${a.assignee}, ${addDays(today, a.dueInDays)},
                   ${createdAt}, ${confirmedAt}
            from checkins where employee_id = ${employeeId} and day = ${c.day}`),
        );
      }
    }
  }
  if (options.failAtEnd) statements.push(db.execute(sql`select 1 / 0`));
  const [first, ...rest] = statements;
  await db.batch([first, ...rest]);
}
