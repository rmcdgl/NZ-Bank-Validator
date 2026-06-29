import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  format: ["esm", "cjs", "umd"],
  globalName: "nzBankValidator",
  dts: true,
  minify: false,
  sourcemap: false,
  target: "es2015",
  outExtensions({ format }) {
    if (format === "cjs") {
      return { js: ".cjs", dts: ".d.cts" };
    }

    if (format === "es") {
      return { js: ".mjs", dts: ".d.ts" };
    }

    return { js: ".js" };
  },
});
