export type DependencyType = "prod" | "dev" | "peer" | "optional" | "all";

export type FallbackStrategy = "none" | "readme" | "empty" | "skip";

export type VerbosityLevel = "quiet" | "normal" | "verbose";

export interface SanitizerOptions {
  spaceReplacement: string;
  slashReplacement: string;
  atReplacement: string;
}

export interface CLIOptions {
  // Input options
  packagePath: string;
  packages: string[];
  deps: DependencyType[];

  // Output options
  output: string;
  filename: string;
  extension: string;

  // Behavior options
  dryRun: boolean;
  verbosity: VerbosityLevel;
  fallback: FallbackStrategy;

  // Sanitizer options
  sanitizer: SanitizerOptions;
}
