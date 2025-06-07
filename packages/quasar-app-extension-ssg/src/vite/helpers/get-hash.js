import { createHash } from "crypto";

export default function getHash(text) {
  return createHash('sha256').update(text).digest('hex').substring(0, 8);
};
