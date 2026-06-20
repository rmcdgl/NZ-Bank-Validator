#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(".");
const packDirectory = mkdtempSync(join(tmpdir(), "nz-bank-validator-pack-"));
const consumerDirectory = mkdtempSync(join(tmpdir(), "nz-bank-validator-consumer-"));

execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });

const packOutput = execFileSync(
  "npm",
  ["pack", "--json", "--ignore-scripts", "--pack-destination", packDirectory],
  { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
);
const [{ filename }] = JSON.parse(packOutput);
const tarball = join(packDirectory, filename);

writeFileSync(
  join(consumerDirectory, "package.json"),
  JSON.stringify({ name: "consumer", private: true, type: "module" }, null, 2)
);

execFileSync("npm", ["install", "--no-audit", "--no-fund", tarball], {
  cwd: consumerDirectory,
  stdio: "inherit",
});

writeFileSync(
  join(consumerDirectory, "cjs.cjs"),
  [
    'const validator = require("nz-bank-validator");',
    'if (!validator.validate("01-902-0068389-00")) process.exit(1);',
    "",
  ].join("\n")
);

writeFileSync(
  join(consumerDirectory, "esm.mjs"),
  [
    'import validator from "nz-bank-validator";',
    'if (!validator.validate("01-902-0068389-00")) process.exit(1);',
    "",
  ].join("\n")
);

execFileSync("node", ["cjs.cjs"], { cwd: consumerDirectory, stdio: "inherit" });
execFileSync("node", ["esm.mjs"], { cwd: consumerDirectory, stdio: "inherit" });

console.log(`Packed artifact verified: ${filename}`);
