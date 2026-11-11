// Сквозной сценарий «Пульса новичка» в установленном Edge. Использование: node scenario.mjs <base-url>
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3123";
const DEMO = "Дмитрий Козлов";
async function go(page, url) {
  await page.goto(url);
  await page.waitForFunction(() => !document.body.innerText.includes("Загрузка…"), null, { timeout: 30000 });
}
const log = (...a) => console.log("•", ...a);
function check(cond, msg) {
  if (!cond) throw new Error("ПРОВАЛ: " + msg);
  log("OK", msg);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const hr = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
const mobile = () =>
  browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });

async function reset(page) {
  await go(page, BASE + "/hr");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Сбросить демо" }).click();
  await page.getByText("Демо сброшено").waitFor({ timeout: 30000 });
}

async function demoCard(page) {
  await go(page, BASE + "/hr");
  const card = page.locator("li").filter({ hasText: DEMO });
  await card.waitFor();
  return card;
}

async function demoIds(page) {
  const card = await demoCard(page);
  const href = await card.getByRole("link", { name: DEMO }).getAttribute("href");
  await card.getByRole("button", { name: "Скопировать ссылку новичка" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  return { id: href.split("/").pop(), link };
}

async function answer(page, details) {
  const fs = page.locator("fieldset");
  await fs.nth(0).getByRole("button", { name: "да", exact: true }).click();
  await fs.nth(1).getByRole("button", { name: "нет", exact: true }).click();
  await fs.nth(2).getByRole("button", { name: "да", exact: true }).click();
  await fs.nth(3).getByRole("button", { name: "хорошо", exact: true }).click();
  await page.getByPlaceholder(/Например/).fill(details);
}

const hrPage = await hr.newPage();
await reset(hrPage);
const before = await demoIds(hrPage);
log("ссылка новичка", before.link, "id", before.id);
check(/\/s\/[A-Za-z0-9_-]{20,}$/.test(before.link), "ссылка содержит случайный токен");
check((await (await demoCard(hrPage)).innerText()).includes("Ждём ответа"), "до ответа — «Ждём ответа»");

// 2. Ответ новичка с телефона
const phone = await mobile();
const p = await phone.newPage();
await go(p, before.link);
const h1 = await p.locator("h1").innerText();
check(h1.includes("Опрос за день 7 · сейчас день 7 · склад"), "заголовок опроса: " + h1);
const t0 = Date.now();
await answer(p, "Нет доступа к терминалу на складе");
await p.getByRole("button", { name: "Отправить" }).click();
await p.getByText("Ответ за день 7 сохранён").waitFor({ timeout: 20000 });
log("ответ сохранён за", Date.now() - t0, "мс (включая ввод автоматом)");
const scrollW = await p.evaluate(() => document.documentElement.scrollWidth);
check(scrollW <= 390, "нет горизонтальной прокрутки на 390px (" + scrollW + ")");

// 3. Доска
let card = await demoCard(hrPage);
let text = await card.innerText();
check(text.includes("Нужна помощь"), "после ответа — «Нужна помощь»");
check(text.includes("Нет доступа к терминалу на складе"), "на доске виден текст препятствия");

// 4. Назначение
await go(hrPage, BASE + "/hr/" + before.id);
const form = hrPage.locator("form").filter({ hasText: "Назначить действие" });
await form.locator("textarea").fill("Выдать доступ к WMS");
await form.getByPlaceholder("Например: Алексей").fill("Алексей");
const due = await form.locator('input[type="date"]').inputValue();
await form.getByRole("button", { name: "Назначить" }).click();
await hrPage.getByRole("button", { name: "Скопировать задачу для Битрикс24" }).waitFor({ timeout: 20000 });
await hrPage.getByRole("button", { name: "Скопировать задачу для Битрикс24" }).click();
const bitrix = await hrPage.evaluate(() => navigator.clipboard.readText());
console.log("---- Битрикс24 ----\n" + bitrix + "\n-------------------");
const [y, m, d] = due.split("-");
check(
  bitrix.includes("Выдать доступ к WMS") &&
    bitrix.includes("Ответственный: Алексей") &&
    bitrix.includes(`Срок: ${d}.${m}.${y}`) &&
    bitrix.includes("Нет доступа к терминалу"),
  "текст Битрикс24 содержит действие, ответственного, срок и препятствие",
);
check(!bitrix.includes("/s/") && !bitrix.includes(before.link.split("/s/")[1]), "в тексте нет личной ссылки");
card = await demoCard(hrPage);
check((await card.innerText()).includes("В работе"), "после назначения — «В работе»");

// 5. Подтверждение из другого браузерного профиля
const phone2 = await mobile();
const p2 = await phone2.newPage();
await go(p2, before.link);
check((await p2.locator("body").innerText()).includes("Выдать доступ к WMS"), "новичок видит назначенное действие");
await p2.getByRole("button", { name: "Все затруднения из этого ответа устранены" }).click();
await p2.getByText("Вы подтвердили, что затруднения устранены").waitFor({ timeout: 20000 });

// 6. Доска после подтверждения
card = await demoCard(hrPage);
check((await card.innerText()).includes("В порядке"), "после подтверждения — «В порядке»");
await go(hrPage, BASE + "/hr/" + before.id);
const detail = await hrPage.locator("main").innerText();
check(detail.includes("Проблема (закрыта)") && detail.includes("Нет доступа к терминалу"), "история и исходный ответ сохранены");
check(detail.includes("Новичок подтвердил решение"), "в карточке видно подтверждение");

// Обновление страницы ничего не сбрасывает
await hrPage.reload(); await go(hrPage, hrPage.url());
check((await hrPage.locator("main").innerText()).includes("Проблема (закрыта)"), "после обновления данные на месте");

// 7. Сброс сохраняет id и token
await reset(hrPage);
const after = await demoIds(hrPage);
check(after.id === before.id && after.link === before.link, "после сброса id и token те же");
await go(p, before.link);
check((await p.getByRole("button", { name: "Отправить" }).count()) === 1 || (await p.getByRole("button", { name: "Ответьте на все вопросы" }).count()) === 1, "после сброса опрос дня 7 снова пуст");

// 8. Одновременная отправка из двух вкладок
const tabA = await phone.newPage();
const tabB = await phone.newPage();
await Promise.all([go(tabA, before.link), go(tabB, before.link)]);
await answer(tabA, "вкладка A");
await answer(tabB, "вкладка B");
await Promise.all([
  tabA.getByRole("button", { name: "Отправить" }).click(),
  tabB.getByRole("button", { name: "Отправить" }).click(),
]);
await Promise.all([
  tabA.getByText("Ответ за день 7 сохранён").waitFor({ timeout: 20000 }),
  tabB.getByText("Ответ за день 7 сохранён").waitFor({ timeout: 20000 }),
]);
const errs = (await tabA.locator("main [role=alert]").count()) + (await tabB.locator("main [role=alert]").count());
check(errs === 0, "две вкладки — без ошибок для пользователя");
await go(tabA, tabA.url());
const cards = await tabA.getByText("Ваш ответ за день 7").count();
check(cards === 1, "сохранена одна запись за день 7");

// 9. Неверный токен
await go(p, BASE + "/s/neverniy-token");
check((await p.locator("h1").innerText()).includes("Ссылка не найдена"), "неверный токен — понятная страница");

// Вернуть демо в исходное состояние
await reset(hrPage);
await browser.close();
console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ:", BASE);
