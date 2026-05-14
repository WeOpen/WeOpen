import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  compressJson,
  convertDateToTimestamp,
  convertTimestampToDate,
  decodeBase64,
  decodeJwt,
  decodeUrl,
  developerTools,
  encodeBase64,
  encodeUrl,
  formatJson,
  generateUuid,
  hashText,
  hmacText,
  testRegex
} from "./tools.ts";

describe("developer tool pure functions", () => {
  test("formats and compresses JSON while reporting invalid JSON", () => {
    assert.equal(formatJson('{"name":"WeOpen","items":[1,true]}').output, `{
  "name": "WeOpen",
  "items": [
    1,
    true
  ]
}`);
    assert.equal(compressJson("{\n  \"ok\": true\n}").output, '{"ok":true}');
    assert.equal(formatJson("{broken").ok, false);
  });

  test("encodes and decodes Base64 with unicode text", () => {
    const encoded = encodeBase64("WeOpen 工具箱").output;
    assert.equal(encoded, "V2VPcGVuIOW3peWFt+eusQ==");
    assert.equal(decodeBase64(encoded).output, "WeOpen 工具箱");
    assert.equal(decodeBase64("%%%").ok, false);
  });

  test("encodes and decodes URL components", () => {
    const encoded = encodeUrl("https://weopen.dev/?q=开发 工具").output;
    assert.equal(encoded, "https%3A%2F%2Fweopen.dev%2F%3Fq%3D%E5%BC%80%E5%8F%91%20%E5%B7%A5%E5%85%B7");
    assert.equal(decodeUrl(encoded).output, "https://weopen.dev/?q=开发 工具");
  });

  test("converts timestamps and dates in milliseconds and seconds", () => {
    assert.equal(convertTimestampToDate("1704067200000").output, "2024-01-01T00:00:00.000Z");
    assert.equal(convertTimestampToDate("1704067200").output, "2024-01-01T00:00:00.000Z");
    assert.equal(convertDateToTimestamp("2024-01-01T00:00:00.000Z").output, "1704067200000");
  });

  test("generates RFC 4122 version 4 UUIDs", () => {
    assert.match(
      generateUuid(),
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  test("decodes JWT header and payload without verification", () => {
    const jwt =
      "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJyb2xlcyI6WyJhZG1pbiJdfQ.";
    const decoded = decodeJwt(jwt);
    assert.equal(decoded.ok, true);
    assert.deepEqual(decoded.header, { alg: "none", typ: "JWT" });
    assert.deepEqual(decoded.payload, { sub: "123", roles: ["admin"] });
    assert.equal(decodeJwt("not-a-token").ok, false);
  });

  test("creates hashes and HMAC signatures with Web Crypto", async () => {
    assert.equal(
      (await hashText("hello", "SHA-256")).output,
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
    assert.equal(
      (await hmacText("hello", "secret", "SHA-256")).output,
      "88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b"
    );
  });

  test("tests regular expressions and reports invalid patterns", () => {
    const result = testRegex("(?<word>We\\w+)", "g", "WeOpen and WeMail");
    assert.equal(result.ok, true);
    assert.deepEqual(
      result.matches.map((match) => match.value),
      ["WeOpen", "WeMail"]
    );
    assert.equal(result.matches[0]?.groups?.word, "WeOpen");
    assert.equal(testRegex("[", "g", "broken").ok, false);
  });

  test("keeps at least ten client-safe tools available and marks cron deferred", () => {
    const available = developerTools.filter((tool) => tool.status === "available");
    assert.equal(available.every((tool) => tool.runtime === "client"), true);
    assert.ok(available.length >= 10);
    assert.equal(developerTools.find((tool) => tool.id === "cron-parser")?.status, "deferred");
  });
});
