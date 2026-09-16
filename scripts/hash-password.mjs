#!/usr/bin/env node
// Prints the ADMIN_PASSWORD_HASH value (pbkdf2_sha256$iterations$salt$hash).
// Usage: npm run hash-password -- "the password"  (or pipe it on stdin)
import { webcrypto } from "node:crypto";
import { createInterface } from "node:readline";

const ITERATIONS = 100000;

const readPassword = async () => {
  if (process.argv[2]) return process.argv[2];

  if (process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => rl.question("Password: ", resolve));
    rl.close();
    return answer;
  }

  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").split("\n")[0];
};

const password = (await readPassword()) ?? "";
if (password.length === 0) {
  console.error("Provide the password as an argument or on stdin.");
  process.exit(1);
}

const salt = webcrypto.getRandomValues(new Uint8Array(16));
const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
  "deriveBits",
]);
const hash = await webcrypto.subtle.deriveBits(
  { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
  key,
  256,
);

console.log(
  `pbkdf2_sha256$${ITERATIONS}$${Buffer.from(salt).toString("base64")}$${Buffer.from(hash).toString("base64")}`,
);
