import { describe, it, expect } from "vitest";
import { sanitizeFilename, generateFilename } from "../bin/utils/utils";
import { DEFAULT_OPTIONS } from "../bin/defaults";

describe("sanitizeFilename", () => {
  describe("with default options", () => {
    it("should return simple package names unchanged", () => {
      expect(sanitizeFilename("lodash")).toBe("lodash");
      expect(sanitizeFilename("react")).toBe("react");
      expect(sanitizeFilename("express")).toBe("express");
    });

    it("should handle scoped packages", () => {
      expect(sanitizeFilename("@types/node")).toBe("types-node");
      expect(sanitizeFilename("@babel/core")).toBe("babel-core");
      expect(sanitizeFilename("@angular/core")).toBe("angular-core");
    });

    it("should replace spaces with underscores", () => {
      expect(sanitizeFilename("my package")).toBe("my_package");
      expect(sanitizeFilename("some weird name")).toBe("some_weird_name");
    });

    it("should handle packages with multiple slashes", () => {
      // Edge case - shouldn't happen in npm but good to handle
      expect(sanitizeFilename("@scope/sub/package")).toBe("scope-sub-package");
    });

    it("should remove problematic characters", () => {
      expect(sanitizeFilename("package<name>")).toBe("packagename");
      expect(sanitizeFilename('package"name')).toBe("packagename");
      expect(sanitizeFilename("package:name")).toBe("packagename");
      expect(sanitizeFilename("package|name")).toBe("packagename");
      expect(sanitizeFilename("package?name")).toBe("packagename");
      expect(sanitizeFilename("package*name")).toBe("packagename");
    });
  });

  describe("with custom options", () => {
    it("should use custom space replacement", () => {
      expect(
        sanitizeFilename("my package", {
          spaceReplacement: "-",
          slashReplacement: "-",
          atReplacement: "",
        }),
      ).toBe("my-package");
    });

    it("should use custom slash replacement", () => {
      expect(
        sanitizeFilename("@types/node", {
          spaceReplacement: "_",
          slashReplacement: "_",
          atReplacement: "",
        }),
      ).toBe("types_node");
    });

    it("should use custom @ replacement", () => {
      expect(
        sanitizeFilename("@types/node", {
          spaceReplacement: "_",
          slashReplacement: "-",
          atReplacement: "at_",
        }),
      ).toBe("at_types-node");
    });

    it("should handle all custom options together", () => {
      expect(
        sanitizeFilename("@my scope/package name", {
          spaceReplacement: "-",
          slashReplacement: "__",
          atReplacement: "AT",
        }),
      ).toBe("ATmy-scope__package-name");
    });
  });
});

describe("generateFilename", () => {
  const defaultSanitizer = DEFAULT_OPTIONS.sanitizer;

  describe("with default pattern", () => {
    it("should generate simple filenames", () => {
      expect(
        generateFilename("{name}", "lodash", "txt", defaultSanitizer),
      ).toBe("lodash.txt");
    });

    it("should handle different extensions", () => {
      expect(generateFilename("{name}", "lodash", "md", defaultSanitizer)).toBe(
        "lodash.md",
      );
      expect(
        generateFilename("{name}", "lodash", "json", defaultSanitizer),
      ).toBe("lodash.json");
    });

    it("should handle extension with leading dot", () => {
      expect(
        generateFilename("{name}", "lodash", ".txt", defaultSanitizer),
      ).toBe("lodash.txt");
    });

    it("should sanitize package names", () => {
      expect(
        generateFilename("{name}", "@types/node", "txt", defaultSanitizer),
      ).toBe("types-node.txt");
    });
  });

  describe("with custom patterns", () => {
    it("should handle prefix patterns", () => {
      expect(
        generateFilename("llms-{name}", "react", "txt", defaultSanitizer),
      ).toBe("llms-react.txt");
    });

    it("should handle suffix patterns", () => {
      expect(
        generateFilename("{name}-docs", "react", "txt", defaultSanitizer),
      ).toBe("react-docs.txt");
    });

    it("should handle complex patterns", () => {
      expect(
        generateFilename(
          "pkg-{name}-reference",
          "react",
          "md",
          defaultSanitizer,
        ),
      ).toBe("pkg-react-reference.md");
    });

    it("should handle patterns without {name} placeholder", () => {
      // Edge case - pattern without placeholder should still work
      expect(
        generateFilename("static-filename", "react", "txt", defaultSanitizer),
      ).toBe("static-filename.txt");
    });
  });
});
