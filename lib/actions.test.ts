import { beforeEach, expect, it, vi } from "vitest";
import { confirmAction } from "../app/actions";
import { refresh } from "next/cache";

const { db, selected, updated } = vi.hoisted(() => {
  const selected = vi.fn();
  const updated = vi.fn();
  const query = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: selected,
  };
  return {
    selected,
    updated,
    db: {
      select: vi.fn(() => query),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn(() => ({ returning: updated })) })),
      })),
    },
  };
});

vi.mock("@/lib/db", () => ({ getDb: () => db }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  selected.mockResolvedValue([{ id: 42 }]);
  updated.mockResolvedValue([{ id: 42 }]);
});

it("reports gone when reset deletes the action between ownership check and update", async () => {
  updated.mockResolvedValue([]);
  expect(await confirmAction({ token: "owner", actionId: 42 })).toMatchObject({
    ok: false,
    code: "gone",
  });
  expect(refresh).not.toHaveBeenCalled();
});

it("accepts an existing action, including repeated confirmation", async () => {
  expect(await confirmAction({ token: "owner", actionId: 42 })).toEqual({ ok: true });
  expect(await confirmAction({ token: "owner", actionId: 42 })).toEqual({ ok: true });
  expect(refresh).toHaveBeenCalledTimes(2);
});

it("does not update an action without matching ownership", async () => {
  selected.mockResolvedValue([]);
  expect(await confirmAction({ token: "other", actionId: 42 })).toMatchObject({
    ok: false,
    code: "gone",
  });
  expect(db.update).not.toHaveBeenCalled();
});
