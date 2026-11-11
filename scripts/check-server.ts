// Проверка серверных отказов без браузера. Запуск: pnpm exec tsx scripts/check-server.ts
// Перед проверкой и после неё выполняет сброс демо (нужен DEMO_RESET_ENABLED=true).
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

let failed = 0;
function check(cond: boolean, msg: string) {
  console.log(cond ? "OK  " : "FAIL", msg);
  if (!cond) failed++;
}

async function main() {
  const { eq } = await import("drizzle-orm");
  const { getDb } = await import("../lib/db");
  const { actions, checkins, employees } = await import("../lib/db/schema");
  const { resetDemo, resetEnabled } = await import("../lib/reset");
  const { addDays, calendarDate } = await import("../lib/dates");
  const a = await import("../app/actions");
  const db = getDb();
  const today = calendarDate(new Date());

  await resetDemo();
  const byName = async (name: string) =>
    (await db.select().from(employees).where(eq(employees.name, name)))[0];
  const kozlov = await byName("Дмитрий Козлов");
  const morozova = await byName("Ксения Морозова");
  const fedorov = await byName("Михаил Фёдоров");
  const [morozovaAction] = await db
    .select({ id: actions.id, checkinId: actions.checkinId })
    .from(actions)
    .innerJoin(checkins, eq(actions.checkinId, checkins.id))
    .where(eq(checkins.employeeId, morozova.id));

  // Чужой токен не подтверждает действие
  const foreign = await a.confirmAction({ token: kozlov.token, actionId: morozovaAction.id });
  const [still] = await db.select().from(actions).where(eq(actions.id, morozovaAction.id));
  check(!foreign.ok && still.confirmedAt === null, "токен другого новичка не подтверждает чужое действие");

  // Ответы опроса
  const base = { token: kozlov.token, day: 7, qClear: "да", qEquipped: "да", qSupport: "да" };
  let r = await a.submitCheckin(base);
  check(!r.ok, "неполный ответ отклонён: " + (!r.ok && r.error));
  r = await a.submitCheckin({ ...base, qMood: "отлично" });
  check(!r.ok, "недопустимое значение отклонено");
  r = await a.submitCheckin({ ...base, day: 1, qMood: "хорошо" });
  check(!r.ok && r.code === "stale", "форма дня 1 после наступления дня 7 не пишет в неверную точку");
  r = await a.submitCheckin({ ...base, token: "nope", qMood: "хорошо" });
  check(!r.ok, "неверный токен отклонён");
  const count = await db.select().from(checkins).where(eq(checkins.employeeId, kozlov.id));
  check(count.length === 1, "отклонённые ответы ничего не записали");

  // Действия
  const [fedorovCheckin] = await db.select().from(checkins).where(eq(checkins.employeeId, fedorov.id));
  const ok = { employeeId: fedorov.id, checkinId: fedorovCheckin.id, actionText: "x", assignee: "y", dueDate: today };
  r = await a.saveAction(ok);
  check(!r.ok, "действие для благополучного ответа отклонено");
  const [nikitin] = await db.select().from(employees).where(eq(employees.name, "Павел Никитин"));
  const [nikitinCheckin] = await db.select().from(checkins).where(eq(checkins.employeeId, nikitin.id));
  const n = { employeeId: nikitin.id, checkinId: nikitinCheckin.id, actionText: "Выдать ТСД", assignee: "Алексей", dueDate: today };
  r = await a.saveAction({ ...n, actionText: "  " });
  check(!r.ok, "пустое действие отклонено: " + (!r.ok && r.error));
  r = await a.saveAction({ ...n, assignee: "" });
  check(!r.ok, "пустой ответственный отклонён");
  r = await a.saveAction({ ...n, dueDate: addDays(today, -1) });
  check(!r.ok, "срок раньше сегодняшнего отклонён: " + (!r.ok && r.error));
  r = await a.saveAction({ ...n, dueDate: "2026-02-30" });
  check(!r.ok, "несуществующая дата отклонена");
  r = await a.saveAction({ ...n, employeeId: kozlov.id });
  check(!r.ok, "чек-ин чужого сотрудника отклонён");
  const none = await db.select().from(actions).where(eq(actions.checkinId, nikitinCheckin.id));
  check(none.length === 0, "отклонённые действия ничего не записали");

  // Подтверждённое действие нельзя изменить
  const [pavlova] = await db.select().from(employees).where(eq(employees.name, "Виктория Павлова"));
  const [pavlovaAction] = await db
    .select({ id: actions.id, checkinId: actions.checkinId })
    .from(actions)
    .innerJoin(checkins, eq(actions.checkinId, checkins.id))
    .where(eq(checkins.employeeId, pavlova.id));
  r = await a.saveAction({ employeeId: pavlova.id, checkinId: pavlovaAction.checkinId, actionId: pavlovaAction.id, actionText: "новое", assignee: "z", dueDate: today });
  check(!r.ok, "подтверждённое действие изменить нельзя: " + (!r.ok && r.error));

  // Сброс при выключенном флаге
  const saved = process.env.DEMO_RESET_ENABLED;
  process.env.DEMO_RESET_ENABLED = "false";
  check(!resetEnabled(), "флаг выключен");
  r = await a.resetDemoAction();
  check(!r.ok, "серверный сброс отклонён без DEMO_RESET_ENABLED: " + (!r.ok && r.error));
  let threw = false;
  try {
    await resetDemo();
  } catch {
    threw = true;
  }
  check(threw, "resetDemo (и CLI-сид) отказывается без DEMO_RESET_ENABLED");
  process.env.DEMO_RESET_ENABLED = saved;

  await resetDemo();
  console.log(failed ? `\nПРОВАЛОВ: ${failed}` : "\nВСЕ СЕРВЕРНЫЕ ПРОВЕРКИ ПРОШЛИ");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
