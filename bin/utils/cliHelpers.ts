import { PackageJson } from "../types/packageJsonType";
import { DependencyType } from "../types/types";
import { logger } from "./logger";

/**
 * Parse dependency types from a comma-separated string
 */
export const parseDeps = (depsString: string): DependencyType[] => {
  const validDeps: DependencyType[] = [
    "prod",
    "dev",
    "peer",
    "optional",
    "all",
  ];
  const deps = depsString.split(",").map((d) => d.trim().toLowerCase());

  const result: DependencyType[] = [];
  for (const dep of deps) {
    if (validDeps.includes(dep as DependencyType)) {
      result.push(dep as DependencyType);
    } else {
      logger.warn(`Unknown dependency type: ${dep}`);
    }
  }

  return result.length > 0 ? result : ["all"];
};

/**
 * Extract dependencies from package.json based on the specified types
 */
export const getDependencies = (
  packageJson: PackageJson,
  depTypes: DependencyType[],
): Record<string, string> => {
  const result: Record<string, string> = {};

  const includeAll = depTypes.includes("all");

  if (includeAll || depTypes.includes("prod")) {
    Object.assign(result, packageJson.dependencies || {});
  }

  if (includeAll || depTypes.includes("dev")) {
    Object.assign(result, packageJson.devDependencies || {});
  }

  if (includeAll || depTypes.includes("peer")) {
    Object.assign(result, packageJson.peerDependencies || {});
  }

  if (includeAll || depTypes.includes("optional")) {
    Object.assign(result, packageJson.optionalDependencies || {});
  }

  return result;
};
