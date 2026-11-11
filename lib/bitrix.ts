import { formatRuDate } from "./dates";
import { problemText, type Answers } from "./domain";

/** Текст для ручного создания задачи в Битрикс24. Личную ссылку новичка не включает. */
export function bitrixTaskText(input: {
  employee: { name: string; department: string; position: string };
  checkin: Answers & { day: number; details: string };
  action: { actionText: string; assignee: string; dueDate: string };
}): string {
  const { employee, checkin, action } = input;
  return [
    `Адаптация: ${employee.name} — ${action.actionText}`,
    "",
    `Новичок: ${employee.name}, ${employee.department}, ${employee.position}`,
    `Что мешает (опрос дня ${checkin.day}): ${problemText(checkin)}`,
    `Что сделать: ${action.actionText}`,
    `Ответственный: ${action.assignee}`,
    `Срок: ${formatRuDate(action.dueDate)}`,
    "",
    "После решения новичок подтверждает его в опросе по своей ссылке.",
  ].join("\n");
}
