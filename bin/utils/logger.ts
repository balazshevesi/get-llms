import { VerbosityLevel } from "../types/types";

class Logger {
  private verbosity: VerbosityLevel = "normal";

  setVerbosity(level: VerbosityLevel) {
    this.verbosity = level;
  }

  getVerbosity(): VerbosityLevel {
    return this.verbosity;
  }

  isQuiet(): boolean {
    return this.verbosity === "quiet";
  }

  isVerbose(): boolean {
    return this.verbosity === "verbose";
  }

  // Always log errors
  error(...args: unknown[]) {
    console.error(...args);
  }

  // Log in normal and verbose modes
  log(...args: unknown[]) {
    if (this.verbosity !== "quiet") {
      console.log(...args);
    }
  }

  // Log in normal and verbose modes (alias for log)
  info(...args: unknown[]) {
    this.log(...args);
  }

  // Only log in verbose mode
  verbose(...args: unknown[]) {
    if (this.verbosity === "verbose") {
      console.log(...args);
    }
  }

  // Log with color-coded prefixes
  success(message: string) {
    this.log(`✅ ${message}`);
  }

  fail(message: string) {
    this.log(`❌ ${message}`);
  }

  warn(message: string) {
    if (this.verbosity !== "quiet") {
      console.warn(`⚠️  ${message}`);
    }
  }

  // Debug-level logging (verbose only)
  debug(...args: unknown[]) {
    if (this.verbosity === "verbose") {
      console.log("[DEBUG]", ...args);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();
