import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  decodeBase64,
  developerTools,
  encodeBase64,
  formatJson,
  testRegex
} from "./devtools.ts";

describe("shared developer tools", () => {
  test("keeps JSON, Base64, and regex tools reusable outside the web app", () => {
    assert.equal(formatJson('{"name":"WeOpen"}').output, `{
  "name": "WeOpen"
}`);

    const encoded = encodeBase64("WeOpen 工具箱").output;
    assert.equal(decodeBase64(encoded).output, "WeOpen 工具箱");

    const regex = testRegex("We\\w+", "g", "WeOpen and WeMail");
    assert.equal(regex.ok, true);
    assert.deepEqual(
      regex.matches.map((match) => match.value),
      ["WeOpen", "WeMail"]
    );
  });

  test("marks deferred tools explicitly while exposing enough local tools", () => {
    assert.ok(developerTools.filter((tool) => tool.status === "available").length >= 10);
    assert.equal(developerTools.find((tool) => tool.id === "cron-parser")?.status, "deferred");
  });
});
