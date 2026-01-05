import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync, exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const CLI_PATH = path.join(__dirname, "../bin/index.ts");
const TEST_OUTPUT_DIR = path.join(__dirname, "../test-output-cli");
const TEST_PACKAGE_JSON_DIR = path.join(__dirname, "../test-fixtures");

// Helper to run CLI commands
const runCLI = async (
  args: string,
  options: { cwd?: string } = {},
): Promise<{ stdout: string; stderr: string }> => {
  try {
    const result = await execAsync(
      `node --import tsx/esm ${CLI_PATH} ${args}`,
      {
        cwd: options.cwd || path.join(__dirname, ".."),
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      },
    );
    return result;
  } catch (error: any) {
    // Return the output even if the command failed (non-zero exit)
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
    };
  }
};

// Helper to run CLI synchronously and get exit code
const runCLISync = (
  args: string,
  options: { cwd?: string } = {},
): { stdout: string; exitCode: number } => {
  try {
    const stdout = execSync(`node --import tsx/esm ${CLI_PATH} ${args}`, {
      cwd: options.cwd || path.join(__dirname, ".."),
      encoding: "utf8",
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });
    return { stdout, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      exitCode: error.status || 1,
    };
  }
};

describe("CLI", () => {
  beforeEach(() => {
    // Clean up test output directory
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    // Create test fixtures directory
    if (!fs.existsSync(TEST_PACKAGE_JSON_DIR)) {
      fs.mkdirSync(TEST_PACKAGE_JSON_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    if (fs.existsSync(TEST_PACKAGE_JSON_DIR)) {
      fs.rmSync(TEST_PACKAGE_JSON_DIR, { recursive: true });
    }
  });

  describe("--help", () => {
    it("should display help information", async () => {
      const { stdout } = await runCLI("--help");
      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("get-llms");
      expect(stdout).toContain("--package");
      expect(stdout).toContain("--output");
      expect(stdout).toContain("--dry-run");
      expect(stdout).toContain("--fallback");
    });
  });

  describe("--version", () => {
    it("should display version information", async () => {
      const { stdout } = await runCLI("--version");
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("--dry-run", () => {
    it("should not create any files in dry-run mode", async () => {
      const { stdout } = await runCLI(
        `zod --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("[DRY RUN]");
      expect(stdout).toContain("zod");
      expect(fs.existsSync(TEST_OUTPUT_DIR)).toBe(false);
    });

    it("should show what would be written", async () => {
      const { stdout } = await runCLI(
        `zod --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("Would write zod");
      expect(stdout).toContain("zod.txt");
    });
  });

  describe("direct package names", () => {
    it("should fetch llms.txt for specified packages", async () => {
      const { stdout } = await runCLI(`zod --output ${TEST_OUTPUT_DIR}`);
      expect(stdout).toContain("Processing 1 package");
      expect(stdout).toContain("zod");
      expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, "zod.txt"))).toBe(true);
    });

    it("should handle multiple packages", async () => {
      const { stdout } = await runCLI(
        `zod lodash --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("Processing 2 package");
      expect(stdout).toContain("zod");
      expect(stdout).toContain("lodash");
    });
  });

  describe("--output", () => {
    it("should write files to custom output directory", async () => {
      await runCLI(`zod --output ${TEST_OUTPUT_DIR}`);
      expect(fs.existsSync(TEST_OUTPUT_DIR)).toBe(true);
      expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, "zod.txt"))).toBe(true);
    });

    it("should create nested directories", async () => {
      const nestedDir = path.join(TEST_OUTPUT_DIR, "nested/deep/dir");
      await runCLI(`zod --output ${nestedDir}`);
      expect(fs.existsSync(nestedDir)).toBe(true);
      expect(fs.existsSync(path.join(nestedDir, "zod.txt"))).toBe(true);
    });
  });

  describe("--extension", () => {
    it("should use custom file extension", async () => {
      await runCLI(`zod --output ${TEST_OUTPUT_DIR} --extension md`);
      expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, "zod.md"))).toBe(true);
    });

    it("should handle extension with leading dot", async () => {
      await runCLI(`zod --output ${TEST_OUTPUT_DIR} --extension .md`);
      expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, "zod.md"))).toBe(true);
    });
  });

  describe("--filename", () => {
    it("should use custom filename pattern", async () => {
      await runCLI(`zod --output ${TEST_OUTPUT_DIR} --filename "llms-{name}"`);
      expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, "llms-zod.txt"))).toBe(
        true,
      );
    });

    it("should handle complex patterns", async () => {
      await runCLI(
        `zod --output ${TEST_OUTPUT_DIR} --filename "pkg-{name}-docs"`,
      );
      expect(
        fs.existsSync(path.join(TEST_OUTPUT_DIR, "pkg-zod-docs.txt")),
      ).toBe(true);
    });
  });

  describe("--quiet", () => {
    it("should suppress normal output in quiet mode", async () => {
      const { stdout } = await runCLI(
        `zod --quiet --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toBe("");
      // File should still be created
      expect(fs.existsSync(path.join(TEST_OUTPUT_DIR, "zod.txt"))).toBe(true);
    });
  });

  describe("--verbose", () => {
    it("should show detailed output in verbose mode", async () => {
      const { stdout } = await runCLI(
        `zod --verbose --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("Running with options:");
      expect(stdout).toContain("Output directory:");
      expect(stdout).toContain("Fetching package info");
    });
  });

  describe("--fallback", () => {
    it("should use readme fallback when specified", async () => {
      const { stdout } = await runCLI(
        `lodash --fallback readme --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("fallback: readme");
    });

    it("should use empty fallback when specified", async () => {
      const { stdout } = await runCLI(
        `lodash --fallback empty --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("fallback");

      const content = fs.readFileSync(
        path.join(TEST_OUTPUT_DIR, "lodash.txt"),
        "utf8",
      );
      expect(content).toContain("lodash");
      expect(content).toContain("No llms.txt found");
    });
  });

  describe("--package", () => {
    it("should read from custom package.json path", async () => {
      // Create a test package.json
      const testPackageJson = {
        name: "test-pkg",
        version: "1.0.0",
        dependencies: {
          zod: "^3.0.0",
        },
      };
      fs.writeFileSync(
        path.join(TEST_PACKAGE_JSON_DIR, "package.json"),
        JSON.stringify(testPackageJson),
      );

      const { stdout } = await runCLI(
        `--package ${TEST_PACKAGE_JSON_DIR}/package.json --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("Processing 1 package");
      expect(stdout).toContain("zod");
    });

    it("should error on non-existent package.json", async () => {
      const { stdout, exitCode } = runCLISync(
        `--package /nonexistent/package.json --output ${TEST_OUTPUT_DIR}`,
      );
      expect(exitCode).toBe(1);
    });
  });

  describe("--deps", () => {
    beforeEach(() => {
      // Create a test package.json with various dependency types
      const testPackageJson = {
        name: "test-pkg",
        version: "1.0.0",
        dependencies: {
          zod: "^3.0.0",
        },
        devDependencies: {
          typescript: "^5.0.0",
        },
        peerDependencies: {
          react: "^18.0.0",
        },
      };
      fs.writeFileSync(
        path.join(TEST_PACKAGE_JSON_DIR, "package.json"),
        JSON.stringify(testPackageJson),
      );
    });

    it("should filter to only production dependencies", async () => {
      const { stdout } = await runCLI(
        `--package ${TEST_PACKAGE_JSON_DIR}/package.json --deps prod --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("Processing 1 package");
      expect(stdout).toContain("zod");
      expect(stdout).not.toContain("typescript");
      expect(stdout).not.toContain("react");
    });

    it("should filter to only dev dependencies", async () => {
      const { stdout } = await runCLI(
        `--package ${TEST_PACKAGE_JSON_DIR}/package.json --deps dev --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("Processing 1 package");
      expect(stdout).toContain("typescript");
      expect(stdout).not.toContain("zod");
    });

    it("should handle multiple dependency types", async () => {
      const { stdout } = await runCLI(
        `--package ${TEST_PACKAGE_JSON_DIR}/package.json --deps prod,dev --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("Processing 2 package");
      expect(stdout).toContain("zod");
      expect(stdout).toContain("typescript");
    });
  });

  describe("scoped packages", () => {
    it("should handle scoped package names", async () => {
      // Use fallback empty to avoid network timeout issues
      const { stdout } = await runCLI(
        `@types/node --fallback empty --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("@types/node");
    }, 15000);

    it("should sanitize scoped package names in output filenames", async () => {
      // Use fallback empty to ensure a file is created
      const { stdout } = await runCLI(
        `@types/node --fallback empty --output ${TEST_OUTPUT_DIR}`,
      );

      // Check that file was created with sanitized name
      const files = fs.readdirSync(TEST_OUTPUT_DIR);
      expect(files.some((f) => f.includes("types-node"))).toBe(true);
    }, 15000);
  });

  describe("summary output", () => {
    it("should show summary at the end", async () => {
      const { stdout } = await runCLI(
        `zod --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("--- Summary ---");
      expect(stdout).toContain("Total packages:");
      expect(stdout).toContain("Success:");
      expect(stdout).toContain("Failed:");
    });

    it("should show fallback count when applicable", async () => {
      const { stdout } = await runCLI(
        `lodash --fallback readme --dry-run --output ${TEST_OUTPUT_DIR}`,
      );
      expect(stdout).toContain("including");
      expect(stdout).toContain("fallback");
    });
  });
});
