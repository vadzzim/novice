import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { actions, checkins, employees, type Action, type Checkin, type Employee } from "./db/schema";
import { evaluate, type Evaluation } from "./domain";

export type EmployeeView = {
  employee: Employee;
  checkins: Checkin[];
  actions: Action[];
  evaluation: Evaluation;
};

function assemble(
  employee: Employee,
  allCheckins: Checkin[],
  allActions: Action[],
  today: string,
): EmployeeView {
  const own = allCheckins.filter((c) => c.employeeId === employee.id);
  const ids = new Set(own.map((c) => c.id));
  const ownActions = allActions.filter((a) => ids.has(a.checkinId));
  return {
    employee,
    checkins: own,
    actions: ownActions,
    evaluation: evaluate(employee, own, ownActions, today),
  };
}

export async function loadBoard(today: string): Promise<EmployeeView[]> {
  const db = getDb();
  const [emps, cs, as] = await Promise.all([
    db.select().from(employees).orderBy(asc(employees.name)),
    db.select().from(checkins),
    db.select().from(actions),
  ]);
  return emps.map((e) => assemble(e, cs, as, today));
}

async function loadFor(employee: Employee | undefined, today: string) {
  if (!employee) return null;
  const db = getDb();
  const cs = await db
    .select()
    .from(checkins)
    .where(eq(checkins.employeeId, employee.id))
    .orderBy(asc(checkins.day));
  const as = cs.length
    ? await db.select().from(actions).where(inArray(actions.checkinId, cs.map((c) => c.id)))
    : [];
  return assemble(employee, cs, as, today);
}

export async function loadEmployeeById(id: number, today: string) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const [employee] = await getDb().select().from(employees).where(eq(employees.id, id));
  return loadFor(employee, today);
}

export async function loadEmployeeByToken(token: string, today: string) {
  if (!token || token.length > 100) return null;
  const [employee] = await getDb().select().from(employees).where(eq(employees.token, token));
  return loadFor(employee, today);
}
