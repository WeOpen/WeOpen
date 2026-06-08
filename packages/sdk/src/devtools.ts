import type {
  DeveloperTool,
  JsonObject,
  JwtDecodeResult,
  RegexMatch,
  RegexResult,
  ToolResult
} from "./devtools-types.ts";

export type { DeveloperTool, JsonObject, JwtDecodeResult, RegexMatch, RegexResult, ToolResult } from "./devtools-types.ts";

export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export const hashAlgorithms: HashAlgorithm[] = ["SHA-256", "SHA-384", "SHA-512", "SHA-1"];

export const developerTools: DeveloperTool[] = [
  {
    id: "json-format",
    name: "JSON format",
    description: "Pretty-print JSON with two-space indentation.",
    runtime: "client",
    status: "available",
    category: "json"
  },
  {
    id: "json-compress",
    name: "JSON compress",
    description: "Remove insignificant JSON whitespace for transport or storage.",
    runtime: "client",
    status: "available",
    category: "json"
  },
  {
    id: "base64-encode",
    name: "Base64 encode",
    description: "Encode UTF-8 text to Base64 without sending content to the API.",
    runtime: "client",
    status: "available",
    category: "encoding"
  },
  {
    id: "base64-decode",
    name: "Base64 decode",
    description: "Decode Base64 into UTF-8 text in the browser.",
    runtime: "client",
    status: "available",
    category: "encoding"
  },
  {
    id: "url-encode",
    name: "URL encode",
    description: "Encode URL components and query fragments.",
    runtime: "client",
    status: "available",
    category: "encoding"
  },
  {
    id: "url-decode",
    name: "URL decode",
    description: "Decode percent-encoded URL text.",
    runtime: "client",
    status: "available",
    category: "encoding"
  },
  {
    id: "timestamp-to-date",
    name: "Timestamp to date",
    description: "Convert Unix seconds or milliseconds into ISO 8601.",
    runtime: "client",
    status: "available",
    category: "time"
  },
  {
    id: "date-to-timestamp",
    name: "Date to timestamp",
    description: "Convert parseable dates into Unix milliseconds.",
    runtime: "client",
    status: "available",
    category: "time"
  },
  {
    id: "uuid-v4",
    name: "UUID v4",
    description: "Generate browser-local RFC 4122 UUIDs.",
    runtime: "client",
    status: "available",
    category: "identity"
  },
  {
    id: "jwt-decode",
    name: "JWT decode",
    description: "Decode JWT header and payload locally without verification.",
    runtime: "client",
    status: "available",
    category: "security"
  },
  {
    id: "hash-digest",
    name: "Hash digest",
    description: "Create SHA digests with Web Crypto.",
    runtime: "client",
    status: "available",
    category: "security"
  },
  {
    id: "hmac-sign",
    name: "HMAC sign",
    description: "Sign text with HMAC-SHA using Web Crypto.",
    runtime: "client",
    status: "available",
    category: "security"
  },
  {
    id: "regex-test",
    name: "Regex tester",
    description: "Test JavaScript regular expressions against sample text.",
    runtime: "client",
    status: "available",
    category: "text"
  },
  {
    id: "cron-parser",
    name: "Cron parser",
    description: "Deferred until a parser dependency is approved.",
    runtime: "client",
    status: "deferred",
    category: "time"
  }
];

export function formatJson(input: string): ToolResult {
  const parsed = parseJson(input);
  if (!parsed.ok) {
    return parsed;
  }
  return success(JSON.stringify(parsed.value, null, 2));
}

export function compressJson(input: string): ToolResult {
  const parsed = parseJson(input);
  if (!parsed.ok) {
    return parsed;
  }
  return success(JSON.stringify(parsed.value));
}

export function encodeBase64(input: string): ToolResult {
  return safe(() => bytesToBase64(new TextEncoder().encode(input)), "Base64 encode failed");
}

export function decodeBase64(input: string): ToolResult {
  return safe(() => new TextDecoder().decode(base64ToBytes(input.trim())), "Invalid Base64 input");
}

export function encodeUrl(input: string): ToolResult {
  return safe(() => encodeURIComponent(input), "URL encode failed");
}

export function decodeUrl(input: string): ToolResult {
  return safe(() => decodeURIComponent(input), "Invalid percent-encoded URL input");
}

export function convertTimestampToDate(input: string): ToolResult {
  const raw = Number(input.trim());
  if (!Number.isFinite(raw)) {
    return failure("Timestamp must be a number");
  }
  const milliseconds = Math.abs(raw) < 1_000_000_000_000 ? raw * 1000 : raw;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) {
    return failure("Timestamp is outside the supported date range");
  }
  return success(date.toISOString());
}

export function convertDateToTimestamp(input: string): ToolResult {
  const milliseconds = Date.parse(input.trim());
  if (Number.isNaN(milliseconds)) {
    return failure("Date must be parseable by JavaScript Date");
  }
  return success(String(milliseconds));
}

export function generateUuid(): string {
  const cryptoProvider = globalThis.crypto;
  if (cryptoProvider?.randomUUID) {
    return cryptoProvider.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (cryptoProvider?.getRandomValues) {
    cryptoProvider.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

export function decodeJwt(input: string): JwtDecodeResult {
  const parts = input.trim().split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1]) {
    return jwtFailure("JWT must contain header, payload, and signature sections");
  }

  try {
    const header = parseJsonObject(decodeBase64Url(parts[0]));
    const payload = parseJsonObject(decodeBase64Url(parts[1]));
    return {
      ok: true,
      header,
      payload,
      signature: parts[2],
      output: JSON.stringify({ header, payload, signature: parts[2] }, null, 2)
    };
  } catch (error) {
    return jwtFailure(error instanceof Error ? error.message : "JWT decode failed");
  }
}

export async function hashText(input: string, algorithm: HashAlgorithm): Promise<ToolResult> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return failure("Web Crypto is not available in this runtime");
  }
  try {
    const digest = await subtle.digest(algorithm, new TextEncoder().encode(input));
    return success(bytesToHex(new Uint8Array(digest)));
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Hash failed");
  }
}

export async function hmacText(
  input: string,
  secret: string,
  algorithm: HashAlgorithm
): Promise<ToolResult> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return failure("Web Crypto is not available in this runtime");
  }
  try {
    const key = await subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: algorithm },
      false,
      ["sign"]
    );
    const signature = await subtle.sign("HMAC", key, new TextEncoder().encode(input));
    return success(bytesToHex(new Uint8Array(signature)));
  } catch (error) {
    return failure(error instanceof Error ? error.message : "HMAC signing failed");
  }
}

export function testRegex(pattern: string, flags: string, input: string): RegexResult {
  try {
    const normalizedFlags = flags.includes("g") ? flags : `${flags}g`;
    const regex = new RegExp(pattern, normalizedFlags);
    const matches: RegexMatch[] = [];
    for (const match of input.matchAll(regex)) {
      matches.push({
        value: match[0],
        index: match.index,
        groups: match.groups ? { ...match.groups } : undefined
      });
      if (match[0] === "") {
        regex.lastIndex += 1;
      }
    }
    return {
      ok: true,
      matches,
      output: matches.length
        ? matches.map((match) => `${match.index}: ${match.value}`).join("\n")
        : "No matches"
    };
  } catch (error) {
    return {
      ok: false,
      matches: [],
      error: error instanceof Error ? error.message : "Regex failed",
      output: ""
    };
  }
}

function parseJson(input: string): ToolResult & { value?: unknown } {
  try {
    return { ok: true, output: "", value: JSON.parse(input) };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Invalid JSON");
  }
}

function parseJsonObject(input: string): JsonObject {
  const parsed: unknown = JSON.parse(input);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JWT section must decode to a JSON object");
  }
  return parsed as JsonObject;
}

function decodeBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return new TextDecoder().decode(base64ToBytes(padded));
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(input: string): Uint8Array {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function success(output: string): ToolResult {
  return { ok: true, output };
}

function failure(error: string): ToolResult {
  return { ok: false, output: "", error };
}

function jwtFailure(error: string): JwtDecodeResult {
  return { ok: false, error, output: "" };
}

function safe(action: () => string, message: string): ToolResult {
  try {
    return success(action());
  } catch (error) {
    return failure(error instanceof Error ? error.message : message);
  }
}
