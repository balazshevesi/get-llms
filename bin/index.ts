#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { Command } from "commander";
import { PackageJson } from "./types/packageJsonType";
import { findLLMsTxt } from "./llmsFetcher";
import { generateFilename } from "./utils/utils";
import { logger } from "./utils/logger";
import { parseDeps, getDependencies } from "./utils/cliHelpers";
import { CLIOptions, FallbackStrategy, VerbosityLevel } from "./types/types";
import { DEFAULT_OPTIONS } from "./defaults";

const currentDir = process.cwd();

interface ParsedOptions {
  package: string;
  output: string;
  filename: string;
  extension: string;
  deps: string;
  dryRun: boolean;
  quiet: boolean;
  verbose: boolean;
  fallback: string;
  spaceReplace: string;
  slashReplace: string;
  atReplace: string;
}

const main = async (packages: string[], options: CLIOptions): Promise<void> => {
  // Set verbosity first
  logger.setVerbosity(options.verbosity);
  logger.verbose("Running with options:", JSON.stringify(options, null, 2));

  let packageNames: string[] = packages;

  // If no direct packages provided, read from package.json
  if (packageNames.length === 0) {
    const packageJsonPath = path.isAbsolute(options.packagePath)
      ? options.packagePath
      : path.join(currentDir, options.packagePath);

    logger.verbose(`Looking for package.json at: ${packageJsonPath}`);

    let packageJson: PackageJson | undefined;
    try {
      packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, "utf8"),
      ) as PackageJson;
      logger.info(`Found package.json at ${packageJsonPath}`);
    } catch (e) {
      logger.error(
        `Could not find or parse package.json at ${packageJsonPath}`,
      );
      if (logger.isVerbose()) {
        logger.error(e);
      }
      process.exit(1);
    }

    const dependencies = getDependencies(packageJson, options.deps);
    packageNames = Object.keys(dependencies);

    if (packageNames.length === 0) {
      logger.info("No dependencies found matching the specified criteria");
      return;
    }

    logger.verbose(
      `Found ${packageNames.length} dependencies: ${packageNames.join(", ")}`,
    );
  }

  logger.info(`Processing ${packageNames.length} package(s)...`);

  // Resolve output directory
  const outputDir = path.isAbsolute(options.output)
    ? options.output
    : path.join(currentDir, options.output);

  logger.verbose(`Output directory: ${outputDir}`);

  if (!options.dryRun) fs.mkdirSync(outputDir, { recursive: true });

  let successCount = 0;
  let failCount = 0;
  let fallbackCount = 0;

  for (const packageName of packageNames) {
    logger.verbose(`\nProcessing: ${packageName}`);

    const llmsFile = await findLLMsTxt(packageName, {
      fallback: options.fallback,
    });

    if (llmsFile) {
      const filename = generateFilename(
        options.filename,
        packageName,
        options.extension,
        options.sanitizer,
      );

      const outputPath = path.join(outputDir, filename);

      if (options.dryRun) {
        if (llmsFile.isFallback) {
          logger.info(
            `[DRY RUN] Would write ${packageName} (fallback: ${llmsFile.fallbackType}) to ${outputPath}`,
          );
          fallbackCount++;
        } else {
          logger.info(
            `[DRY RUN] Would write ${packageName} to ${outputPath} (from ${llmsFile.location})`,
          );
        }
      } else {
        fs.writeFileSync(outputPath, llmsFile.content);
        if (llmsFile.isFallback) {
          logger.success(
            `${packageName}: Using ${llmsFile.fallbackType} fallback -> ${filename}`,
          );
          fallbackCount++;
        } else {
          logger.success(
            `${packageName}: Found llms.txt at ${llmsFile.location}`,
          );
        }
      }
      successCount++;
    } else {
      logger.fail(`${packageName}: No llms.txt found`);
      failCount++;
    }
  }

  // Summary
  logger.info("");
  logger.info("--- Summary ---");
  logger.info(`Total packages: ${packageNames.length}`);
  logger.info(`Success: ${successCount}`);
  if (fallbackCount > 0) {
    logger.info(`  (including ${fallbackCount} fallbacks)`);
  }
  logger.info(`Failed: ${failCount}`);

  if (options.dryRun) {
    logger.info("");
    logger.info("(Dry run - no files were written)");
  }
};

// CLI setup
const program = new Command();

program
  .name("get-llms")
  .description("Fetch llms.txt files for your npm dependencies")
  .version("0.0.1")
  .argument("[packages...]", "Package names to fetch (optional)")
  .option(
    "-p, --package <path>",
    "Path to package.json",
    DEFAULT_OPTIONS.packagePath,
  )
  .option("-o, --output <dir>", "Output directory", DEFAULT_OPTIONS.output)
  .option(
    "-f, --filename <pattern>",
    "Filename pattern (use {name} for package name)",
    DEFAULT_OPTIONS.filename,
  )
  .option("-e, --extension <ext>", "File extension", DEFAULT_OPTIONS.extension)
  .option(
    "-d, --deps <types>",
    "Dependency types to include (prod,dev,peer,optional,all)",
    "all",
  )
  .option(
    "--dry-run",
    "Show what would be done without writing files",
    DEFAULT_OPTIONS.dryRun,
  )
  .option("-q, --quiet", "Only show errors", false)
  .option("-v, --verbose", "Show detailed output", false)
  .option(
    "--fallback <strategy>",
    "Fallback strategy when llms.txt not found (none, readme, empty, skip)",
    DEFAULT_OPTIONS.fallback,
  )
  .option(
    "--space-replace <char>",
    "Character to replace spaces in filenames",
    DEFAULT_OPTIONS.sanitizer.spaceReplacement,
  )
  .option(
    "--slash-replace <char>",
    "Character to replace slashes in filenames",
    DEFAULT_OPTIONS.sanitizer.slashReplacement,
  )
  .option(
    "--at-replace <char>",
    "Character to replace @ in scoped package names",
    DEFAULT_OPTIONS.sanitizer.atReplacement,
  )
  .action(async (packages: string[], opts: ParsedOptions) => {
    // Determine verbosity (last one wins)
    let verbosity: VerbosityLevel = "normal";
    // Check raw argv to see which came last
    const quietIndex = process.argv.findIndex(
      (arg) => arg === "-q" || arg === "--quiet",
    );
    const verboseIndex = process.argv.findIndex(
      (arg) => arg === "-v" || arg === "--verbose",
    );

    // Both specified, last one wins
    if (opts.quiet && opts.verbose) {
      if (quietIndex > verboseIndex) verbosity = "quiet";
      else verbosity = "verbose";
    } else if (opts.quiet) verbosity = "quiet";
    else if (opts.verbose) verbosity = "verbose";

    // Validate fallback strategy
    const validFallbacks: FallbackStrategy[] = [
      "none",
      "readme",
      "empty",
      "skip",
    ];
    const fallback = validFallbacks.includes(opts.fallback as FallbackStrategy)
      ? (opts.fallback as FallbackStrategy)
      : "none";

    if (
      opts.fallback &&
      !validFallbacks.includes(opts.fallback as FallbackStrategy)
    ) {
      logger.warn(`Unknown fallback strategy: ${opts.fallback}. Using 'none'.`);
    }

    const cliOptions: CLIOptions = {
      packagePath: opts.package,
      packages: packages,
      deps: parseDeps(opts.deps),
      output: opts.output,
      filename: opts.filename,
      extension: opts.extension,
      dryRun: opts.dryRun,
      verbosity,
      fallback,
      sanitizer: {
        spaceReplacement: opts.spaceReplace,
        slashReplacement: opts.slashReplace,
        atReplacement: opts.atReplace,
      },
    };

    await main(packages, cliOptions);
  });

program.parse();
