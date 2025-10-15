export interface DependencyValidationResult {
    unused: string[];
    missing: string[];
    mismatched: string[];
}

export declare function validateDependencies(
    projectDir?: string
): Promise<DependencyValidationResult>;

export default validateDependencies;