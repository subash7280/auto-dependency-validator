#!/usr/bin/env node
import path from "path";
import chalk from "chalk";
import { validateDependencies } from "./index.js";

const projectRoot = process.cwd();

console.log(chalk.cyan("🔍 Running auto-dependency-validator...\n"));

try {
  const { results, unusedDeps, missingDeps, mismatchedDeps } = validateDependencies(projectRoot);

  console.log(chalk.bold("📂 Scanned Files:\n"));

  let filesWithIssues = 0;

  for (const info of results) {
    const relativePath = path.relative(projectRoot, info.file);
    console.log(chalk.white(`  📝 ${relativePath}`));

    if (info.imports.length > 0) {
      console.log(chalk.gray(`    Imports: ${info.imports.join(", ")}`));
    } else {
      console.log(chalk.gray(`    (No imports found)`));
    }

    let hasIssue = false;

    if (info.unused.length > 0) {
      hasIssue = true;
      for (const u of info.unused) {
        console.log(
          chalk.yellow(
            `    🚫 Unused: ${u.importPath} (${u.unusedNames.join(", ")})`
          )
        );
      }
    }

    if (info.missing.length > 0) {
      hasIssue = true;
      console.log(chalk.red(`    🚫 Missing: ${info.missing.join(", ")}`));
    }

    if (hasIssue) filesWithIssues++;
    console.log();
  }

  console.log(chalk.gray("─────────────────────────────\n"));

  if (unusedDeps.length > 0) {
    console.log(chalk.yellow("⚠️ Unused Dependencies:"));
    for (const dep of unusedDeps) console.log("  •", dep);
    console.log();
  }

  if (missingDeps.length > 0) {
    console.log(chalk.red("🚫 Missing Dependencies:"));
    for (const dep of missingDeps) console.log("  •", dep);
    console.log();
  }

  if (mismatchedDeps.length > 0) {
    console.log(chalk.magenta("🔁 Mismatched Versions:"));
    for (const { name, declared, installed } of mismatchedDeps) {
      console.log(`  • ${name} (declared ${declared} installed ${installed})`);
    }
    console.log();
  }

  console.log(chalk.white("📊 Summary:"));
  console.log("  Total files scanned:", results.length);
  console.log("  Declared deps:", unusedDeps.length + missingDeps.length + mismatchedDeps.length);
  console.log("  Files with issues:", filesWithIssues);

  console.log();
  console.log(
    filesWithIssues > 0 || unusedDeps.length > 0 || missingDeps.length > 0
      ? chalk.yellow("⚠️  Issues found in one or more files!")
      : chalk.green("✅ No issues found!")
  );

  console.log(chalk.gray("\n─────────────────────────────\n"));
} catch (err) {
  console.error(chalk.red("Error:"), err.message);
}
