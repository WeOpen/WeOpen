import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatBytes, formatTimestamp, slugifyFilename } from "./format.ts";

describe("shared format helpers", () => {
  test("formats timestamps with deterministic UTC output", () => {
    assert.equal(formatTimestamp("2025-05-20T14:33:19Z"), "2025-05-20 14:33:19 UTC");
    assert.equal(formatTimestamp(new Date("2025-01-02T03:04:05Z")), "2025-01-02 03:04:05 UTC");
    assert.equal(formatTimestamp("not-a-date"), "INVALID DATE");
  });

  test("formats bytes and slugifies filenames", () => {
    assert.equal(formatBytes(82_114), "80.2 KB");
    assert.equal(slugifyFilename(" My Report 2025.pdf "), "my-report-2025.pdf");
  });
});
