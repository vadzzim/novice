import { addDays } from "./dates";
import type { Answers, Checkpoint } from "./domain";

type SeedAction = {
  text: string;
  assignee: string;
  /** Срок относительно сегодняшней даты. */
  dueInDays: number;
  /** День работы, когда HR назначил действие. */
  createdOnDay: number;
  /** День работы, когда новичок подтвердил решение. */
  confirmedOnDay?: number;
};

type SeedCheckin = {
  day: Checkpoint;
  /** День работы, когда пришёл ответ (по умолчанию — контрольный день). */
  answeredOnDay?: number;
  answers: Answers;
  details?: string;
  action?: SeedAction;
};

export type SeedEmployee = {
  name: string;
  department: "склад" | "магазин" | "продажи" | "офис";
  position: string;
  /** Текущий день работы на дату сида; 0 и меньше — ещё не вышел. */
  currentDay: number;
  checkins: SeedCheckin[];
};

const good: Answers = { qClear: "да", qEquipped: "да", qSupport: "да", qMood: "хорошо" };

export const DEMO_EMPLOYEE_NAME = "Дмитрий Козлов";

/** Один набор сидовых данных для первоначального заполнения и сброса. Все люди вымышлены. */
export const SEED: SeedEmployee[] = [
  {
    // Новичок для основного сценария: сейчас день 7, день 1 благополучный, опрос дня 7 пуст.
    name: DEMO_EMPLOYEE_NAME,
    department: "склад",
    position: "Кладовщик",
    currentDay: 7,
    checkins: [{ day: 1, answers: good }],
  },
  {
    name: "Марина Белова",
    department: "магазин",
    position: "Продавец-консультант",
    currentDay: -2,
    checkins: [],
  },
  {
    name: "Игорь Петров",
    department: "продажи",
    position: "Менеджер по оптовым продажам",
    currentDay: 2,
    checkins: [],
  },
  {
    name: "Анна Волкова",
    department: "магазин",
    position: "Кассир",
    currentDay: 4,
    checkins: [],
  },
  {
    name: "Сергей Орлов",
    department: "склад",
    position: "Комплектовщик",
    currentDay: 10,
    checkins: [{ day: 1, answers: good }],
  },
  {
    name: "Павел Никитин",
    department: "склад",
    position: "Комплектовщик",
    currentDay: 3,
    checkins: [
      {
        day: 1,
        answers: { ...good, qEquipped: "нет" },
        details: "Не выдали терминал сбора данных, собираю заказы по бумажному листу",
      },
    ],
  },
  {
    name: "Елена Соколова",
    department: "магазин",
    position: "Продавец-консультант",
    currentDay: 2,
    checkins: [
      {
        day: 1,
        answers: { ...good, qEquipped: "нет", qMood: "так себе" },
        details: "Не выдали форму, работаю в своей одежде",
      },
    ],
  },
  {
    name: "Артём Лебедев",
    department: "продажи",
    position: "Менеджер по работе с клиентами",
    currentDay: 8,
    checkins: [
      { day: 1, answers: good },
      {
        day: 7,
        answers: { ...good, qClear: "нет", qMood: "думаю об уходе" },
        details: "Не понимаю, каких клиентов мне вести и какой у меня план",
        action: {
          text: "Разобрать с руководителем список клиентов и план на месяц",
          assignee: "Ирина Котова, руководитель отдела продаж",
          dueInDays: 2,
          createdOnDay: 8,
        },
      },
    ],
  },
  {
    name: "Ксения Морозова",
    department: "офис",
    position: "Бухгалтер",
    currentDay: 5,
    checkins: [
      {
        day: 1,
        answers: { ...good, qSupport: "нет" },
        details: "Не знаю, к кому идти с вопросами по 1С",
        action: {
          text: "Назначить наставника по 1С и познакомить в чате отдела",
          assignee: "Татьяна Гусева, главный бухгалтер",
          dueInDays: 1,
          createdOnDay: 2,
        },
      },
    ],
  },
  {
    name: "Николай Зайцев",
    department: "склад",
    position: "Водитель погрузчика",
    currentDay: 11,
    checkins: [
      {
        day: 1,
        answers: { ...good, qEquipped: "нет" },
        details: "Нет допуска к погрузчику, жду инструктаж",
        action: {
          text: "Провести инструктаж и оформить допуск к погрузчику",
          assignee: "Алексей Рябов, начальник смены",
          dueInDays: -2,
          createdOnDay: 2,
        },
      },
    ],
  },
  {
    name: "Виктория Павлова",
    department: "магазин",
    position: "Старший продавец",
    currentDay: 8,
    checkins: [
      {
        day: 1,
        answers: { ...good, qClear: "частично", qMood: "так себе" },
        details: "Непонятен график смен на следующую неделю",
        action: {
          text: "Согласовать и выдать график смен на месяц",
          assignee: "Олег Сидоров, управляющий магазином",
          dueInDays: -5,
          createdOnDay: 1,
          confirmedOnDay: 2,
        },
      },
      { day: 7, answers: good },
    ],
  },
  {
    name: "Михаил Фёдоров",
    department: "офис",
    position: "Специалист по закупкам",
    currentDay: 9,
    checkins: [
      { day: 1, answers: good },
      { day: 7, answers: good },
    ],
  },
];

export function seedStartDate(e: SeedEmployee, today: string): string {
  return addDays(today, -(e.currentDay - 1));
}

/** Отметка времени в полдень по Москве в указанный день работы. */
export function seedInstant(startDate: string, workDayNumber: number): Date {
  return new Date(`${addDays(startDate, workDayNumber - 1)}T12:00:00+03:00`);
}
