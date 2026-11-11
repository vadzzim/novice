// Проверка атомарности пакета сброса: успешный пакет и откат всего пакета при ошибке.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

async function snapshot() {
  const { getDb } = await import("../lib/db");
  const { sql } = await import("drizzle-orm");
  const r = await getDb().execute(
    sql`select (select count(*) from checkins) c, (select count(*) from actions) a,
               (select max(id) from checkins) maxc, (select string_agg(start_date::text, ',' order by id) from employees) s`,
  );
  return JSON.stringify(r.rows[0]);
}

async function main() {
  const { resetDemo } = await import("../lib/reset");
  await resetDemo();
  const before = await snapshot();
  console.log("после успешного пакета:", before);
  try {
    await resetDemo("2030-01-01", { failAtEnd: true });
    console.log("ОШИБКА: пакет с ошибкой выполнился");
    process.exit(1);
  } catch (e) {
    console.log("пакет с ошибкой отклонён:", (e as Error).message.split("\n")[0]);
  }
  const after = await snapshot();
  console.log("после неудачного пакета:", after);
  if (before !== after) {
    console.log("ОШИБКА: данные изменились частично");
    process.exit(1);
  }
  console.log("OK: откат всего пакета подтверждён");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
