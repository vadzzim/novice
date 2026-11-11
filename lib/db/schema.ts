import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    department: text("department").notNull(),
    position: text("position").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    token: text("token").notNull().unique(),
  },
  (t) => [
    check(
      "employees_department_check",
      sql`${t.department} in ('склад', 'магазин', 'продажи', 'офис')`,
    ),
  ],
);

export const checkins = pgTable(
  "checkins",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id),
    day: smallint("day").notNull(),
    qClear: text("q_clear").notNull(),
    qEquipped: text("q_equipped").notNull(),
    qSupport: text("q_support").notNull(),
    qMood: text("q_mood").notNull(),
    details: text("details").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("checkins_employee_day_unique").on(t.employeeId, t.day),
    check("checkins_day_check", sql`${t.day} in (1, 7)`),
    check("checkins_q_clear_check", sql`${t.qClear} in ('да', 'частично', 'нет')`),
    check("checkins_q_equipped_check", sql`${t.qEquipped} in ('да', 'нет')`),
    check("checkins_q_support_check", sql`${t.qSupport} in ('да', 'нет')`),
    check(
      "checkins_q_mood_check",
      sql`${t.qMood} in ('хорошо', 'так себе', 'думаю об уходе')`,
    ),
    check("checkins_details_length", sql`char_length(${t.details}) <= 1000`),
  ],
);

export const actions = pgTable(
  "actions",
  {
    id: serial("id").primaryKey(),
    checkinId: integer("checkin_id")
      .notNull()
      .unique()
      .references(() => checkins.id),
    actionText: text("action_text").notNull(),
    assignee: text("assignee").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (t) => [
    check("actions_text_length", sql`char_length(${t.actionText}) between 1 and 500`),
    check("actions_assignee_length", sql`char_length(${t.assignee}) between 1 and 100`),
  ],
);

export type Employee = typeof employees.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Action = typeof actions.$inferSelect;
