import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);
const moduleCache = new Map();

function resolveTsModule(specifier, fromFile) {
  if (!specifier.startsWith(".")) {
    return specifier;
  }

  const resolved = resolve(dirname(fromFile), specifier);
  const candidates = [
    resolved,
    `${resolved}.ts`,
    `${resolved}.js`,
    resolve(resolved, "index.ts"),
    resolve(resolved, "index.js"),
  ];

  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // Keep trying candidate paths.
    }
  }

  throw new Error(`Cannot resolve ${specifier} from ${fromFile}`);
}

function loadTsModule(filePath) {
  if (!filePath.endsWith(".ts")) {
    return nodeRequire(filePath);
  }

  if (moduleCache.has(filePath)) {
    return moduleCache.get(filePath).exports;
  }

  const source = readFileSync(filePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filePath,
  });

  const module = { exports: {} };
  moduleCache.set(filePath, module);

  const localRequire = (specifier) => {
    const resolved = resolveTsModule(specifier, filePath);

    if (!resolved.startsWith("/")) {
      return nodeRequire(resolved);
    }

    return loadTsModule(resolved);
  };

  const execute = new Function("require", "module", "exports", outputText);
  execute(localRequire, module, module.exports);

  return module.exports;
}

function loadBankData({ reload = false } = {}) {
  if (reload) {
    moduleCache.clear();
  }

  return loadTsModule(resolve("src/constants.ts"));
}

export { loadBankData };
