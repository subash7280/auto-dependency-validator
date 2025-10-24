import validateDependencies from "../index.js";

export async function runFromCli(opts={}) {
    const projectDir = opts.targetDir || process.cwd();
    return validateDependencies(projectDir);
}

export default runFromCli;