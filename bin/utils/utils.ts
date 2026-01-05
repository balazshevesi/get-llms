import { DEFAULT_OPTIONS } from "../defaults";
import { NpmRegistry } from "../types/npmRegistryType";
import { SanitizerOptions } from "../types/types";

export const getPackageInfo = async (packageName: string) => {
  const response = await fetch(
    `https://registry.npmjs.org/${packageName}/latest`,
  );
  const data = (await response.json()) as NpmRegistry;
  return data;
};

/**
 * Sanitize a package name for use as a filename
 */
export const sanitizeFilename = (
  name: string,
  options: SanitizerOptions = DEFAULT_OPTIONS.sanitizer,
): string => {
  let sanitized = name;

  // Handle scoped packages (@scope/name)
  if (sanitized.startsWith("@")) {
    sanitized = sanitized.slice(1); // Remove @ prefix
    if (options.atReplacement) {
      sanitized = options.atReplacement + sanitized;
    }
  }

  // Replace slashes (from scoped packages)
  sanitized = sanitized.replaceAll("/", options.slashReplacement);

  // Replace spaces
  sanitized = sanitized.replaceAll(" ", options.spaceReplacement);

  // Remove any other problematic characters for filenames
  sanitized = sanitized.replace(/[<>:"|?*\\]/g, "");

  return sanitized;
};

/**
 * Generate filename from pattern
 * Supports: {name}
 */
export const generateFilename = (
  pattern: string,
  packageName: string,
  extension: string,
  sanitizerOptions: SanitizerOptions,
): string => {
  const sanitizedName = sanitizeFilename(packageName, sanitizerOptions);
  let filename = pattern.replace("{name}", sanitizedName);

  // Ensure extension doesn't have leading dot if user included it
  const ext = extension.startsWith(".") ? extension.slice(1) : extension;

  return `${filename}.${ext}`;
};
