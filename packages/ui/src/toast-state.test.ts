import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createToastRecord, dismissToastRecord, pushToastRecord } from "./toast-state.ts";

describe("toast state helpers", () => {
  test("creates toast records with stable defaults", () => {
    assert.deepEqual(createToastRecord({ title: "Saved" }, 7), {
      description: undefined,
      durationMs: 4000,
      id: "toast-7",
      title: "Saved",
      tone: "neutral"
    });
  });

  test("keeps the newest toast records within the stack limit", () => {
    const toasts = [
      createToastRecord({ title: "One" }, 1),
      createToastRecord({ title: "Two" }, 2)
    ];

    assert.deepEqual(pushToastRecord(toasts, createToastRecord({ title: "Three" }, 3), 2).map((toast) => toast.id), [
      "toast-2",
      "toast-3"
    ]);
  });

  test("dismisses a toast by id", () => {
    const toasts = [
      createToastRecord({ title: "One" }, 1),
      createToastRecord({ title: "Two" }, 2)
    ];

    assert.deepEqual(dismissToastRecord(toasts, "toast-1").map((toast) => toast.id), ["toast-2"]);
  });
});
