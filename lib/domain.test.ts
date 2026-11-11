import { describe, expect, it } from "vitest";
import { addDays, calendarDate, workDay } from "./dates";
import {
  evaluate,
  isNegative,
  problemText,
  surveyState,
  validateCheckin,
  type ActionLike,
  type Answers,
  type CheckinLike,
} from "./domain";
import { bitrixTaskText } from "./bitrix";

const TODAY = "2026-11-11";
const good: Answers = { qClear: "да", qEquipped: "да", qSupport: "да", qMood: "хорошо" };
/** Дата выхода, при которой TODAY — указанный день работы. */
const startFor = (day: number) => addDays(TODAY, -(day - 1));

let nextId = 1;
function checkin(day: number, answers: Partial<Answers> = {}, details = ""): CheckinLike {
  return { id: nextId++, day, ...good, ...answers, details, createdAt: new Date() };
}
function action(c: CheckinLike, dueDate: string, confirmed = false): ActionLike {
  return {
    id: nextId++,
    checkinId: c.id,
    actionText: "Выдать доступ к WMS",
    assignee: "Алексей",
    dueDate,
    confirmedAt: confirmed ? new Date() : null,
  };
}
const status = (day: number, cs: CheckinLike[] = [], as: ActionLike[] = []) =>
  evaluate({ startDate: startFor(day) }, cs, as, TODAY).status;

describe("календарная дата в часовом поясе демо", () => {
  it("22:30 UTC 11 ноября — это уже 12 ноября в Москве", () => {
    expect(calendarDate(new Date("2026-11-11T22:30:00Z"))).toBe("2026-11-12");
  });
  it("20:59 UTC — ещё тот же день", () => {
    expect(calendarDate(new Date("2026-11-11T20:59:00Z"))).toBe("2026-11-11");
  });
  it("день выхода — день 1, разница календарных дат", () => {
    expect(workDay("2026-11-11", "2026-11-11")).toBe(1);
    expect(workDay("2026-11-05", "2026-11-11")).toBe(7);
    expect(workDay("2026-10-30", "2026-11-02")).toBe(4);
  });
});

describe("выбор опроса", () => {
  it("до даты выхода опрос недоступен", () => {
    expect(surveyState(startFor(0), TODAY)).toEqual({ kind: "not_started", startDate: startFor(0) });
  });
  it.each([
    [1, 1],
    [6, 1],
    [7, 7],
    [8, 7],
    [10, 7],
  ])("день %i → опрос дня %i", (day, point) => {
    expect(surveyState(startFor(day), TODAY)).toEqual({ kind: "open", point, day });
  });
});

describe("ожидание ответа", () => {
  it("будущий выход", () => expect(status(-2)).toBe("not_started"));
  it("день 3 — ещё «Ждём ответа», день 4 — «Нет ответа»", () => {
    expect(status(3)).toBe("waiting");
    expect(status(4)).toBe("no_response");
  });
  it("день 9 — «Ждём ответа» на день 7, день 10 — «Нет ответа»", () => {
    expect(status(9, [checkin(1)])).toBe("waiting");
    expect(status(10, [checkin(1)])).toBe("no_response");
  });
  it("ожидание относится только к последней точке: пропущенный день 1 не держит статус", () => {
    const e = evaluate({ startDate: startFor(7) }, [], [], TODAY);
    expect(e.status).toBe("waiting");
    expect(e.missedPoints).toEqual([1]);
  });
  it("заполненный доступный опрос без проблем — «В порядке»", () => {
    expect(status(8, [checkin(1), checkin(7)])).toBe("ok");
  });
});

describe("проблемы", () => {
  const negatives: Partial<Answers>[] = [
    { qClear: "частично" },
    { qClear: "нет" },
    { qEquipped: "нет" },
    { qSupport: "нет" },
    { qMood: "так себе" },
    { qMood: "думаю об уходе" },
  ];
  it.each(negatives)("негативный ответ %o создаёт открытый сигнал", (a) => {
    const c = checkin(1, a);
    expect(isNegative(c)).toBe(true);
    expect(status(2, [c])).toBe("need_help");
  });
  it("благополучный ответ — не проблема", () => expect(isNegative(good)).toBe(false));
  it("пустое уточнение не придумывает причину", () => {
    const text = problemText({ ...good, qEquipped: "нет", details: "" });
    expect(text).toBe("Не хватает необходимого для работы — нужно уточнить");
    expect(text).not.toMatch(/терминал|форм/i);
  });
  it("перечисляет все негативные ответы и уточнение", () => {
    const text = problemText({ ...good, qEquipped: "нет", qSupport: "нет", details: "Нет терминала" });
    expect(text).toContain("Не хватает необходимого");
    expect(text).toContain("Не к кому обратиться");
    expect(text).toContain("«Нет терминала»");
  });
});

describe("действия", () => {
  it("назначение переводит обычную проблему в работу", () => {
    const c = checkin(1, { qEquipped: "нет" });
    expect(status(3, [c], [action(c, addDays(TODAY, 1))])).toBe("in_work");
  });
  it("дедлайн сегодня не просрочен, вчера — просрочен", () => {
    const c = checkin(1, { qEquipped: "нет" });
    expect(status(3, [c], [action(c, TODAY)])).toBe("in_work");
    expect(status(3, [c], [action(c, addDays(TODAY, -1))])).toBe("need_help");
  });
  it("«думаю об уходе» держит «Нужна помощь» до подтверждения, после — нет", () => {
    const c = checkin(1, { qMood: "думаю об уходе" });
    expect(status(3, [c], [action(c, addDays(TODAY, 3))])).toBe("need_help");
    expect(status(3, [c], [action(c, addDays(TODAY, 3), true)])).toBe("ok");
  });
  it("подтверждение закрывает проблему, исходный ответ не меняется", () => {
    const c = checkin(1, { qEquipped: "нет" });
    const e = evaluate({ startDate: startFor(3) }, [c], [action(c, TODAY, true)], TODAY);
    expect(e.status).toBe("ok");
    expect(e.openProblems).toEqual([]);
    expect(c.qEquipped).toBe("нет");
  });
  it("подтверждённое действие не становится просроченным через несколько дней", () => {
    const c = checkin(1, { qEquipped: "нет" });
    expect(status(6, [c], [action(c, addDays(TODAY, -4), true)])).toBe("ok");
  });
  it("хороший день 7 не скрывает открытую проблему дня 1", () => {
    const c1 = checkin(1, { qSupport: "нет" });
    expect(status(8, [c1, checkin(7)])).toBe("need_help");
  });
  it("подтверждение одного чек-ина не закрывает другой", () => {
    const c1 = checkin(1, { qSupport: "нет" });
    const c7 = checkin(7, { qEquipped: "нет" });
    const e = evaluate(
      { startDate: startFor(8) },
      [c1, c7],
      [action(c1, TODAY, true), action(c7, addDays(TODAY, 2))],
      TODAY,
    );
    expect(e.status).toBe("in_work");
    expect(e.openProblems.map((p) => p.checkin.id)).toEqual([c7.id]);
  });
  it("после закрытия проблемы без нового ответа — ожидание или «Нет ответа», а не «В порядке»", () => {
    const c1 = checkin(1, { qEquipped: "нет" });
    expect(status(8, [c1], [action(c1, TODAY, true)])).toBe("waiting");
    expect(status(10, [c1], [action(c1, TODAY, true)])).toBe("no_response");
  });
  it("при открытой проблеме и задержанном опросе — подпись «Нет ответа за день 7»", () => {
    const c1 = checkin(1, { qEquipped: "нет" });
    const e = evaluate({ startDate: startFor(10) }, [c1], [action(c1, addDays(TODAY, 1))], TODAY);
    expect(e.status).toBe("in_work");
    expect(e.lateNote).toBe("Нет ответа за день 7");
  });
  it("карточка показывает чек-ин, давший «Нужна помощь»", () => {
    const c1 = checkin(1, { qEquipped: "нет" });
    const c7 = checkin(7, { qClear: "частично" });
    const e = evaluate({ startDate: startFor(8) }, [c1, c7], [action(c7, addDays(TODAY, 2))], TODAY);
    expect(e.featured?.checkin.id).toBe(c1.id);
  });
});

describe("валидация ответа", () => {
  it("неполные ответы отклоняются", () => {
    expect(validateCheckin({ qClear: "да", qEquipped: "да", qSupport: "да" }).ok).toBe(false);
  });
  it("недопустимое значение отклоняется", () => {
    expect(validateCheckin({ ...good, qEquipped: "частично" }).ok).toBe(false);
  });
  it("пустое уточнение разрешено", () => {
    expect(validateCheckin({ ...good, details: "" })).toEqual({ ok: true, answers: good, details: "" });
  });
  it("слишком длинное уточнение отклоняется", () => {
    expect(validateCheckin({ ...good, details: "x".repeat(1001) }).ok).toBe(false);
  });
});

describe("текст для Битрикс24", () => {
  it("содержит поля задачи и не содержит ссылку новичка", () => {
    const text = bitrixTaskText({
      employee: { name: "Дмитрий Козлов", department: "склад", position: "Кладовщик" },
      checkin: { ...good, qEquipped: "нет", day: 7, details: "Нет доступа к терминалу на складе" },
      action: { actionText: "Выдать доступ к WMS", assignee: "Алексей", dueDate: "2026-11-12" },
    });
    expect(text).toContain("Выдать доступ к WMS");
    expect(text).toContain("Ответственный: Алексей");
    expect(text).toContain("Срок: 12.11.2026");
    expect(text).toContain("Нет доступа к терминалу на складе");
    expect(text).not.toMatch(/\/s\/|http/);
  });
});
