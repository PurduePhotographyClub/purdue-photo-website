import { readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "@typescript/typescript6";

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function firstFile(candidates) {
  return candidates.find((path) => {
    try {
      return statSync(path).isFile();
    } catch {
      return false;
    }
  }) ?? null;
}

function resolveWebsiteModule(specifier) {
  const modulePath = resolve(websiteRoot, "src", specifier.slice(2));
  return firstFile([
    modulePath,
    `${modulePath}.ts`,
    `${modulePath}.tsx`,
    resolve(modulePath, "index.ts"),
    resolve(modulePath, "index.tsx"),
  ]);
}

function resolveRelativeModule(specifier, parentURL) {
  if (!parentURL || !specifier.startsWith(".")) return null;
  const modulePath = fileURLToPath(new URL(specifier, parentURL));
  return firstFile([
    `${modulePath}.ts`,
    `${modulePath}.tsx`,
    resolve(modulePath, "index.ts"),
    resolve(modulePath, "index.tsx"),
  ]);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolvedPath = specifier.startsWith("@/")
      ? resolveWebsiteModule(specifier)
      : resolveRelativeModule(specifier, context.parentURL);
    if (resolvedPath) {
      return { shortCircuit: true, url: pathToFileURL(resolvedPath).href };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".tsx")) {
      const source = readFileSync(fileURLToPath(url), "utf8");
      const result = ts.transpileModule(source, {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
        fileName: fileURLToPath(url),
      });
      return {
        format: "module",
        shortCircuit: true,
        source: result.outputText,
      };
    }
    return nextLoad(url, context);
  },
});
