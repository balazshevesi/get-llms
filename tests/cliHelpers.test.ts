import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseDeps, getDependencies } from "../bin/utils/cliHelpers";
import { PackageJson } from "../bin/types/packageJsonType";
import { logger } from "../bin/utils/logger";

// Mock logger to prevent console output during tests
vi.mock("../bin/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
    fail: vi.fn(),
    setVerbosity: vi.fn(),
    isVerbose: vi.fn(() => false),
    isQuiet: vi.fn(() => false),
  },
}));

describe("parseDeps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("valid dependency types", () => {
    it("should parse single dependency type", () => {
      expect(parseDeps("prod")).toEqual(["prod"]);
      expect(parseDeps("dev")).toEqual(["dev"]);
      expect(parseDeps("peer")).toEqual(["peer"]);
      expect(parseDeps("optional")).toEqual(["optional"]);
      expect(parseDeps("all")).toEqual(["all"]);
    });

    it("should parse multiple dependency types", () => {
      expect(parseDeps("prod,dev")).toEqual(["prod", "dev"]);
      expect(parseDeps("prod,dev,peer")).toEqual(["prod", "dev", "peer"]);
      expect(parseDeps("prod,dev,peer,optional")).toEqual([
        "prod",
        "dev",
        "peer",
        "optional",
      ]);
    });

    it("should handle whitespace around values", () => {
      expect(parseDeps("prod, dev")).toEqual(["prod", "dev"]);
      expect(parseDeps(" prod , dev , peer ")).toEqual(["prod", "dev", "peer"]);
    });

    it("should be case insensitive", () => {
      expect(parseDeps("PROD")).toEqual(["prod"]);
      expect(parseDeps("Dev")).toEqual(["dev"]);
      expect(parseDeps("PROD,DEV,Peer")).toEqual(["prod", "dev", "peer"]);
    });
  });

  describe("invalid dependency types", () => {
    it("should warn and filter out invalid types", () => {
      const result = parseDeps("prod,invalid,dev");
      expect(result).toEqual(["prod", "dev"]);
      expect(logger.warn).toHaveBeenCalledWith(
        "Unknown dependency type: invalid",
      );
    });

    it("should return ['all'] when all types are invalid", () => {
      const result = parseDeps("invalid,unknown");
      expect(result).toEqual(["all"]);
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it("should return ['all'] for empty string", () => {
      expect(parseDeps("")).toEqual(["all"]);
    });
  });
});

describe("getDependencies", () => {
  const mockPackageJson: PackageJson = {
    name: "test-package",
    version: "1.0.0",
    dependencies: {
      lodash: "^4.17.21",
      react: "^18.2.0",
    },
    devDependencies: {
      typescript: "^5.0.0",
      vitest: "^1.0.0",
    },
    peerDependencies: {
      "react-dom": "^18.2.0",
    },
    optionalDependencies: {
      fsevents: "^2.3.0",
    },
  };

  describe("with 'all' type", () => {
    it("should return all dependencies", () => {
      const result = getDependencies(mockPackageJson, ["all"]);
      expect(result).toEqual({
        lodash: "^4.17.21",
        react: "^18.2.0",
        typescript: "^5.0.0",
        vitest: "^1.0.0",
        "react-dom": "^18.2.0",
        fsevents: "^2.3.0",
      });
    });
  });

  describe("with single types", () => {
    it("should return only prod dependencies", () => {
      const result = getDependencies(mockPackageJson, ["prod"]);
      expect(result).toEqual({
        lodash: "^4.17.21",
        react: "^18.2.0",
      });
    });

    it("should return only dev dependencies", () => {
      const result = getDependencies(mockPackageJson, ["dev"]);
      expect(result).toEqual({
        typescript: "^5.0.0",
        vitest: "^1.0.0",
      });
    });

    it("should return only peer dependencies", () => {
      const result = getDependencies(mockPackageJson, ["peer"]);
      expect(result).toEqual({
        "react-dom": "^18.2.0",
      });
    });

    it("should return only optional dependencies", () => {
      const result = getDependencies(mockPackageJson, ["optional"]);
      expect(result).toEqual({
        fsevents: "^2.3.0",
      });
    });
  });

  describe("with multiple types", () => {
    it("should return prod and dev dependencies", () => {
      const result = getDependencies(mockPackageJson, ["prod", "dev"]);
      expect(result).toEqual({
        lodash: "^4.17.21",
        react: "^18.2.0",
        typescript: "^5.0.0",
        vitest: "^1.0.0",
      });
    });

    it("should return dev and peer dependencies", () => {
      const result = getDependencies(mockPackageJson, ["dev", "peer"]);
      expect(result).toEqual({
        typescript: "^5.0.0",
        vitest: "^1.0.0",
        "react-dom": "^18.2.0",
      });
    });
  });

  describe("with missing dependency sections", () => {
    it("should handle package.json without dependencies", () => {
      const packageJson: PackageJson = {
        name: "empty-package",
        version: "1.0.0",
      };
      const result = getDependencies(packageJson, ["all"]);
      expect(result).toEqual({});
    });

    it("should handle package.json with only devDependencies", () => {
      const packageJson: PackageJson = {
        name: "dev-only-package",
        version: "1.0.0",
        devDependencies: {
          vitest: "^1.0.0",
        },
      };
      const result = getDependencies(packageJson, ["all"]);
      expect(result).toEqual({
        vitest: "^1.0.0",
      });
    });

    it("should return empty object when requested type is missing", () => {
      const packageJson: PackageJson = {
        name: "no-peer-package",
        version: "1.0.0",
        dependencies: {
          lodash: "^4.17.21",
        },
      };
      const result = getDependencies(packageJson, ["peer"]);
      expect(result).toEqual({});
    });
  });
});
