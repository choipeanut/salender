import { createHash } from "node:crypto";

export const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const pairs = keys.map((key) => `"${key}":${stableStringify(record[key])}`);
  return `{${pairs.join(",")}}`;
};

export const hashString = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const hashObject = (value: unknown): string => hashString(stableStringify(value));
