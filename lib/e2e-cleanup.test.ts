import { afterEach, expect, it, vi } from "vitest";

const { launch } = vi.hoisted(() => ({ launch: vi.fn() }));
vi.mock("playwright-core", () => ({ chromium: { launch } }));

const originalExitCode = process.exitCode;
afterEach(() => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
});

it.each([false, true])("closes the browser and preserves the scenario failure (cleanup fails: %s)", async (cleanupFails) => {
  vi.resetModules();
  const failure = new Error("scenario failed");
  const cleanupFailure = new Error("reset failed");
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const click = vi.fn().mockResolvedValue(undefined);
  const waitFor = cleanupFails
    ? vi.fn().mockRejectedValue(cleanupFailure)
    : vi.fn().mockResolvedValue(undefined);
  const cleanupPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    waitForFunction: vi.fn().mockResolvedValue(undefined),
    once: vi.fn(),
    getByRole: vi.fn(() => ({ click })),
    getByText: vi.fn(() => ({ waitFor })),
  };
  const browser = {
    newContext: vi.fn()
      .mockResolvedValueOnce({ newPage: vi.fn().mockRejectedValue(failure) })
      .mockResolvedValueOnce({ newPage: vi.fn().mockResolvedValue(cleanupPage) }),
    close: vi.fn().mockResolvedValue(undefined),
  };
  launch.mockResolvedValue(browser);

  await import("../e2e/scenario.mjs");

  expect(cleanupPage.getByRole).toHaveBeenCalledWith("button", { name: "Сбросить демо" });
  expect(click).toHaveBeenCalledOnce();
  expect(browser.close).toHaveBeenCalledOnce();
  expect(errors).toHaveBeenCalledWith(failure);
  if (cleanupFails) {
    expect(errors).toHaveBeenCalledWith("Не удалось вернуть демо в исходное состояние:", cleanupFailure);
  }
  expect(process.exitCode).toBe(1);
});
