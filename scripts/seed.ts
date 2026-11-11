// Явный запуск сида: создаёт недостающих сотрудников и восстанавливает исходные ответы.
// Работает только при DEMO_RESET_ENABLED=true.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

async function main() {
  const { ensureEmployees, resetDemo } = await import("../lib/reset");
  const created = await ensureEmployees();
  await resetDemo();
  console.log(`Сид применён. Новых сотрудников: ${created}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
