import { createHash } from "crypto";

export function hashId(input: string): string {
  return createHash("sha1").update(input, "utf8").digest("hex");
}