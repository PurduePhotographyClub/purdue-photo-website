import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_CLIENT_DIRECTORY = fileURLToPath(new URL("../dist/client/", import.meta.url));

export function validateHtmlArtifact(html, filePath) {
  const isRedirectDocument = /<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/i.test(html);
  return [
    !/<\/body>/i.test(html) ? `${filePath} is missing a closing </body> tag.` : null,
    !isRedirectDocument && !/<\/html>\s*$/i.test(html)
      ? `${filePath} is missing a closing </html> tag.`
      : null,
  ].filter(Boolean);
}

export function collectAstroAssetPaths(html) {
  const assetPaths = Array.from(
    html.matchAll(/(?:href|src)=["']\/(_astro\/[^"'?#]+)(?:[?#][^"']*)?["']/gi),
    (match) => match[1],
  ).filter((assetPath) => !assetPath.split("/").includes(".."));

  return [...new Set(assetPaths)].toSorted();
}

export async function verifyDeployArtifact(clientDirectory = DEFAULT_CLIENT_DIRECTORY) {
  const htmlFiles = await listHtmlFiles(clientDirectory);
  if (htmlFiles.length === 0) {
    return [`No HTML artifacts were found in ${clientDirectory}.`];
  }

  const problems = await Promise.all(htmlFiles.map(async (htmlFile) => {
    const html = await readFile(htmlFile, "utf8");
    const relativePath = path.relative(clientDirectory, htmlFile);
    const htmlProblems = validateHtmlArtifact(html, relativePath);
    const assetProblems = await findMissingAssetProblems(html, relativePath, clientDirectory);
    return [...htmlProblems, ...assetProblems];
  }));

  return problems.flat();
}

async function listHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [entryPath] : [];
  }));
  return files.flat();
}

async function findMissingAssetProblems(html, htmlPath, clientDirectory) {
  const assetProblems = await Promise.all(collectAstroAssetPaths(html).map(async (assetPath) => {
    try {
      await access(path.join(clientDirectory, assetPath));
      return null;
    } catch {
      return `${htmlPath} references missing asset /${assetPath}.`;
    }
  }));
  return assetProblems.filter(Boolean);
}

async function run() {
  const problems = await verifyDeployArtifact();
  if (problems.length > 0) {
    console.error(["Deploy artifact validation failed:", ...problems.map((problem) => `- ${problem}`)].join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log("Deploy artifact validation passed.");
}

const isMainModule = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMainModule) {
  await run();
}
