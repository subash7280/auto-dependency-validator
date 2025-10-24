import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively get all JS/TS files (ignoring node_modules & test folders)
 */
export function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!/node_modules|\.git|dist|build|coverage|tests?|__tests__/.test(fullPath)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(fullPath)) {
      arrayOfFiles.push(fullPath);
    }
  }

  return arrayOfFiles;
}

/**
 * Parse and extract imported identifiers and paths from file content
 */
export function parseImports(content) {
  const importRegex = /import\s+(.*)\s+from\s+["']([^"']+)["']/g;
  const results = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importClause = match[1];
    const importPath = match[2];
    const identifiers = [];

    // Default import
    const defaultImport = importClause.match(/^([A-Za-z_$][\w$]*)/);
    if (defaultImport) identifiers.push(defaultImport[1]);

    // Named imports
    const namedMatch = importClause.match(/{([^}]*)}/);
    if (namedMatch) {
      const names = namedMatch[1]
        .split(",")
        .map((n) => n.trim().split(/\s+as\s+/).pop())
        .filter(Boolean);
      identifiers.push(...names);
    }

    // Namespace import
    const nsMatch = importClause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (nsMatch) identifiers.push(nsMatch[1]);

    results.push({ importPath, identifiers });
  }

  return results;
}

/**
 * Detect unused or missing imports in a file
 */
export function analyzeFile(filePath, projectRoot) {
  const content = fs.readFileSync(filePath, "utf-8");
  const imports = parseImports(content);
  const unused = [];
  const missing = [];

  for (const imp of imports) {
    const { importPath, identifiers } = imp;
    const codeBody = content.replace(/import\s+.*from\s+["'][^"']+["'];?/g, "");

    // detect unused
    const unusedNames = identifiers.filter((id) => {
      const regex = new RegExp(`\\b${id}\\b`, "g");
      return !(codeBody.match(regex) || []).length;
    });

    if (unusedNames.length > 0) {
      unused.push({ importPath, unusedNames });
    }

    // detect missing files or modules
    if (importPath.startsWith(".")) {
      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      const fileExists =
        fs.existsSync(resolvedPath) ||
        fs.existsSync(`${resolvedPath}.js`) ||
        fs.existsSync(`${resolvedPath}.ts`) ||
        fs.existsSync(`${resolvedPath}.jsx`) ||
        fs.existsSync(`${resolvedPath}.tsx`);
      if (!fileExists) missing.push(importPath);
    }
  }

  return { imports: imports.map((i) => i.importPath), unused, missing };
}

/**
 * Validate all dependencies in the project
 */
export function validateDependencies(projectRoot) {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) throw new Error("package.json not found!");

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const declaredDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const allFiles = getAllFiles(projectRoot);
  const results = [];

  for (const file of allFiles) {
    const info = analyzeFile(file, projectRoot);
    results.push({ file, ...info });
  }

  // Find unused, missing, and mismatched dependencies globally
  const usedDeps = new Set();

  for (const r of results) {
    for (const imp of r.imports) {
      const base = imp.startsWith(".")
        ? null
        : imp.split("/")[0].startsWith("@")
        ? imp.split("/").slice(0, 2).join("/")
        : imp.split("/")[0];
      if (base) usedDeps.add(base);
    }
  }

  const declaredDepNames = Object.keys(declaredDeps);
  const unusedDeps = declaredDepNames.filter((d) => !usedDeps.has(d));
  const missingDeps = [...usedDeps].filter((d) => !declaredDepNames.includes(d));

  const mismatchedDeps = Object.entries(declaredDeps)
    .map(([name, version]) => {
      try {
        const actualPkg = JSON.parse(
          fs.readFileSync(path.join(projectRoot, "node_modules", name, "package.json"), "utf-8")
        );
        if (actualPkg.version && actualPkg.version !== version.replace(/^[^\d]*/, "")) {
          return { name, declared: version, installed: actualPkg.version };
        }
      } catch {
        return null;
      }
      return null;
    })
    .filter(Boolean);

  return { results, unusedDeps, missingDeps, mismatchedDeps };
}
