import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Scan your project and detect unused, missing, or mismatched dependencies.
 * @param {string} [projectDir=process.cwd()] - Path to project root.
 * @returns {Promise<{ unused: string[], missing: string[], mismatched: string[] }>}
 */
export async function validateDependencies(
    projectDir = process?.cwd(),
) {
    try {
        const pkgPath = path?.join(projectDir, "package.json");

        if (!fs?.existsSync(pkgPath)) throw new Error("❌ package.json not found.");

        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        const allDeps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
        const usedDeps = new Set();
        const missingDeps = [];
        const mismatchedDeps = [];
        const files = [];

        // Recursively collect .js/.jsx/.ts/.tsx files
        function collectFiles(dir) {
            const entries = fs.readdirSync(dir);
            for (const entry of entries) {
                const full = path.join(dir, entry);
                if (fs.statSync(full)?.isDirectory() && !["node_modules", "dist"]?.includes(entry?.toLowerCase())) {
                    collectFiles(full);
                }
                else if (/\.(js|jsx|ts|tsx)$/.test(entry)) {
                    files.push(full);
                };
            };
        };
        collectFiles(projectDir);

        // Search for imports/requires
        for (const file of files) {
            const content = fs?.readFileSync(file, "utf-8");
            const matches = content?.matchAll(
                /(?:import\s+.*?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g
            );

            for (const match of matches) {
                const name = (match?.[1] || match?.[2] || "")?.split("/")?.[0];
                if (name && !name?.startsWith(".")) usedDeps?.add(name);
            };
        };

        // Detect unused dependencies
        const unused = Object.keys(allDeps)?.filter((dep) => !usedDeps?.has(dep));

        // Detect missing dependencies (used but not in package.json)
        for (const dep of usedDeps) {
            if (!allDeps?.[dep])
                missingDeps.push(dep);
        };

        // Detect mismatched versions between dependencies/devDependencies
        const depNames = Object.keys(pkg?.dependencies || {});
        const devNames = Object.keys(pkg?.devDependencies || {});
        const intersect = depNames?.filter((n) => devNames?.includes(n)) || [];

        for (const name of intersect) {
            if (pkg?.dependencies?.[name] !== pkg?.devDependencies?.[name]) {
                mismatchedDeps.push(name);
            };
        };

        return {
            unused: unused || [],
            missing: missingDeps || [],
            mismatched: mismatchedDeps || [],
        };
    }
    catch (error) {
        console.log('error in the validateDependencies function :>> ', error);
        return error;
    };
}

export default validateDependencies;