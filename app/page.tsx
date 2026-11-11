import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui";
import { getDb } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { DEMO_EMPLOYEE_NAME } from "@/lib/seed-data";

export default function Home() {
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Пульс новичка</h1>
      <p className="text-zinc-700">
        Новичок в день 1 и день 7 отвечает с телефона на четыре вопроса. Если что-то мешает —
        нет формы, доступа к терминалу, непонятна задача или не к кому обратиться, — HR видит
        это на доске, назначает действие с ответственным и сроком, а новичок подтверждает, что
        затруднение устранено.
      </p>
      <Card className="grid gap-2 text-sm">
        <h2 className="font-semibold">Как пройти сценарий</h2>
        <ol className="list-decimal grid gap-1 pl-5">
          <li>
            Откройте <Link href="/hr" className="text-blue-700 hover:underline">доску HR</Link>.
            При необходимости нажмите «Сбросить демо».
          </li>
          <li>
            Откройте опрос новичка {DEMO_EMPLOYEE_NAME} (сейчас день 7) — лучше с телефона:{" "}
            <Suspense fallback={<span className="text-zinc-400">ссылка загружается…</span>}>
              <DemoLink />
            </Suspense>
            . Отметьте, что не хватает необходимого, и уточните: «Нет доступа к терминалу на
            складе».
          </li>
          <li>На доске новичок попадёт в «Нужна помощь». Назначьте действие в его карточке.</li>
          <li>Вернитесь в опрос и подтвердите, что затруднения устранены.</li>
        </ol>
      </Card>
    </div>
  );
}

async function DemoLink() {
  await connection();
  const [row] = await getDb()
    .select({ token: employees.token })
    .from(employees)
    .where(eq(employees.name, DEMO_EMPLOYEE_NAME));
  if (!row) return <span>не найден — запустите сид</span>;
  return (
    <Link href={`/s/${row.token}`} className="text-blue-700 hover:underline">
      опрос новичка
    </Link>
  );
}
