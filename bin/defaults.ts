import { CLIOptions } from "./types/types";

export const DEFAULT_OPTIONS: CLIOptions = {
  packagePath: "./package.json",
  packages: [],
  deps: ["all"],
  output: "docs/llms",
  filename: "{name}",
  extension: "txt",
  dryRun: false,
  verbosity: "normal",
  fallback: "none",
  sanitizer: {
    spaceReplacement: "_",
    slashReplacement: "-",
    atReplacement: "",
  },
};
