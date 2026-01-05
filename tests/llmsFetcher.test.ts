import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./setup";
import {
  findLLMsTxt,
  checkPackage,
  checkStandardUrls,
  checkHomepage,
  fetchReadmeFromGithub,
} from "../bin/llmsFetcher";
import { NpmRegistry } from "../bin/npmRegistryType";

// Mock logger to prevent console output during tests
vi.mock("../bin/logger", () => ({
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

describe("checkPackage", () => {
  it("should return null if no llms field exists", async () => {
    const pkg: NpmRegistry = {
      name: "test-pkg",
      version: "1.0.0",
    } as NpmRegistry;

    const result = await checkPackage(pkg);
    expect(result).toBeNull();
  });

  it("should fetch llms.txt from URL in llms field", async () => {
    // Add handler for this specific test
    server.use(
      http.get("https://example.com/llms.txt", () => {
        return new HttpResponse("# Example llms.txt content", {
          headers: { "Content-Type": "text/plain" },
        });
      }),
    );

    const pkg: NpmRegistry = {
      name: "test-pkg",
      version: "1.0.0",
      llms: "https://example.com/llms.txt",
    } as NpmRegistry;

    const result = await checkPackage(pkg);
    expect(result).not.toBeNull();
    expect(result?.location).toBe("https://example.com/llms.txt");
    expect(result?.content).toBe("# Example llms.txt content");
  });

  it("should return null for non-URL llms field", async () => {
    const pkg: NpmRegistry = {
      name: "test-pkg",
      version: "1.0.0",
      llms: "not-a-url",
    } as NpmRegistry;

    const result = await checkPackage(pkg);
    expect(result).toBeNull();
  });

  it("should return null if fetch fails", async () => {
    server.use(
      http.get("https://fail.example.com/llms.txt", () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const pkg: NpmRegistry = {
      name: "test-pkg",
      version: "1.0.0",
      llms: "https://fail.example.com/llms.txt",
    } as NpmRegistry;

    const result = await checkPackage(pkg);
    expect(result).toBeNull();
  });
});

describe("checkStandardUrls", () => {
  it("should find llms.txt at root URL", async () => {
    server.use(
      http.get("https://testsite.com/llms.txt", () => {
        return new HttpResponse("# Found at root", {
          headers: { "Content-Type": "text/plain" },
        });
      }),
    );

    const result = await checkStandardUrls("https://testsite.com");
    expect(result).not.toBeNull();
    expect(result?.location).toBe("https://testsite.com/llms.txt");
    expect(result?.content).toBe("# Found at root");
  });

  it("should find llms.txt in /docs/ directory", async () => {
    server.use(
      http.get("https://testsite2.com/llms.txt", () => {
        return new HttpResponse(null, { status: 404 });
      }),
      http.get("https://testsite2.com/docs/llms.txt", () => {
        return new HttpResponse("# Found in docs", {
          headers: { "Content-Type": "text/plain" },
        });
      }),
    );

    const result = await checkStandardUrls("https://testsite2.com");
    expect(result).not.toBeNull();
    expect(result?.location).toBe("https://testsite2.com/docs/llms.txt");
  });

  it("should return null if llms.txt not found anywhere", async () => {
    server.use(
      http.get("https://nofile.com/llms.txt", () => {
        return new HttpResponse(null, { status: 404 });
      }),
      http.get("https://nofile.com/docs/llms.txt", () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    const result = await checkStandardUrls("https://nofile.com");
    expect(result).toBeNull();
  });

  it("should skip HTML responses (likely 404 pages)", async () => {
    server.use(
      http.get("https://htmlsite.com/llms.txt", () => {
        return new HttpResponse("<html><body>404 Not Found</body></html>", {
          headers: { "Content-Type": "text/html" },
        });
      }),
      http.get("https://htmlsite.com/docs/llms.txt", () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    const result = await checkStandardUrls("https://htmlsite.com");
    expect(result).toBeNull();
  });

  it("should handle trailing slashes in URLs", async () => {
    server.use(
      http.get("https://trailingslash.com/llms.txt", () => {
        return new HttpResponse("# Content with trailing slash", {
          headers: { "Content-Type": "text/plain" },
        });
      }),
    );

    const result = await checkStandardUrls("https://trailingslash.com/");
    expect(result).not.toBeNull();
    expect(result?.content).toBe("# Content with trailing slash");
  });

  it("should accept text/markdown content type", async () => {
    server.use(
      http.get("https://markdown.com/llms.txt", () => {
        return new HttpResponse("# Markdown Content", {
          headers: { "Content-Type": "text/markdown" },
        });
      }),
    );

    const result = await checkStandardUrls("https://markdown.com");
    expect(result).not.toBeNull();
    expect(result?.content).toBe("# Markdown Content");
  });
});

describe("fetchReadmeFromGithub", () => {
  it("should fetch README.md from main branch", async () => {
    server.use(
      http.get(
        "https://raw.githubusercontent.com/owner/repo/main/README.md",
        () => {
          return new HttpResponse("# Test Repo README", {
            headers: { "Content-Type": "text/plain" },
          });
        },
      ),
    );

    const result = await fetchReadmeFromGithub("https://github.com/owner/repo");
    expect(result).not.toBeNull();
    expect(result?.content).toBe("# Test Repo README");
    expect(result?.isFallback).toBe(true);
    expect(result?.fallbackType).toBe("readme");
  });

  it("should try master branch if main fails", async () => {
    server.use(
      http.get(
        "https://raw.githubusercontent.com/old/repo/main/README.md",
        () => {
          return new HttpResponse(null, { status: 404 });
        },
      ),
      http.get(
        "https://raw.githubusercontent.com/old/repo/main/readme.md",
        () => {
          return new HttpResponse(null, { status: 404 });
        },
      ),
      http.get(
        "https://raw.githubusercontent.com/old/repo/main/README.txt",
        () => {
          return new HttpResponse(null, { status: 404 });
        },
      ),
      http.get(
        "https://raw.githubusercontent.com/old/repo/main/readme.txt",
        () => {
          return new HttpResponse(null, { status: 404 });
        },
      ),
      http.get(
        "https://raw.githubusercontent.com/old/repo/master/README.md",
        () => {
          return new HttpResponse("# Master branch README", {
            headers: { "Content-Type": "text/plain" },
          });
        },
      ),
    );

    const result = await fetchReadmeFromGithub("https://github.com/old/repo");
    expect(result).not.toBeNull();
    expect(result?.content).toBe("# Master branch README");
  });

  it("should handle .git suffix in URL", async () => {
    server.use(
      http.get(
        "https://raw.githubusercontent.com/owner/withgit/main/README.md",
        () => {
          return new HttpResponse("# README with .git", {
            headers: { "Content-Type": "text/plain" },
          });
        },
      ),
    );

    const result = await fetchReadmeFromGithub(
      "https://github.com/owner/withgit.git",
    );
    expect(result).not.toBeNull();
    expect(result?.content).toBe("# README with .git");
  });

  it("should handle git+ prefix in URL", async () => {
    server.use(
      http.get(
        "https://raw.githubusercontent.com/owner/gitplus/main/README.md",
        () => {
          return new HttpResponse("# README with git+", {
            headers: { "Content-Type": "text/plain" },
          });
        },
      ),
    );

    const result = await fetchReadmeFromGithub(
      "git+https://github.com/owner/gitplus.git",
    );
    expect(result).not.toBeNull();
    expect(result?.content).toBe("# README with git+");
  });

  it("should return null for non-GitHub URLs", async () => {
    const result = await fetchReadmeFromGithub("https://gitlab.com/owner/repo");
    expect(result).toBeNull();
  });

  it("should return null if no README found", async () => {
    server.use(
      http.get("https://raw.githubusercontent.com/empty/repo/*", () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    const result = await fetchReadmeFromGithub("https://github.com/empty/repo");
    expect(result).toBeNull();
  });
});

describe("checkHomepage", () => {
  it("should return null for empty homepage", async () => {
    const result = await checkHomepage("");
    expect(result).toBeNull();
  });

  it("should check standard URLs for non-GitHub homepages", async () => {
    server.use(
      http.get("https://mypackage.io/llms.txt", () => {
        return new HttpResponse("# Package docs", {
          headers: { "Content-Type": "text/plain" },
        });
      }),
    );

    const result = await checkHomepage("https://mypackage.io");
    expect(result).not.toBeNull();
    expect(result?.content).toBe("# Package docs");
  });

  it("should handle GitHub homepages by checking README for docs links", async () => {
    // This is tested via the test-github-pkg in setup.ts
    const result = await checkHomepage(
      "https://github.com/test-owner/test-repo",
    );
    expect(result).not.toBeNull();
    expect(result?.location).toBe("https://docs.example.com/llms.txt");
  });
});

describe("findLLMsTxt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should find llms.txt via package llms field", async () => {
    const result = await findLLMsTxt("zod");
    expect(result).not.toBeNull();
    expect(result?.location).toBe("https://zod.dev/llms.txt");
    expect(result?.content).toContain("Zod");
  });

  it("should return null when no llms.txt found", async () => {
    const result = await findLLMsTxt("lodash");
    expect(result).toBeNull();
  });

  describe("fallback strategies", () => {
    it("should return readme fallback when strategy is 'readme'", async () => {
      const result = await findLLMsTxt("lodash", { fallback: "readme" });
      expect(result).not.toBeNull();
      expect(result?.isFallback).toBe(true);
      expect(result?.fallbackType).toBe("readme");
      expect(result?.content).toContain("Lodash");
    });

    it("should return empty fallback when strategy is 'empty'", async () => {
      server.use(
        http.get("https://registry.npmjs.org/no-readme-pkg/latest", () => {
          return HttpResponse.json({
            name: "no-readme-pkg",
            version: "1.0.0",
            homepage: "https://no-readme.example.com",
          });
        }),
        http.get("https://no-readme.example.com/llms.txt", () => {
          return new HttpResponse(null, { status: 404 });
        }),
        http.get("https://no-readme.example.com/docs/llms.txt", () => {
          return new HttpResponse(null, { status: 404 });
        }),
      );

      const result = await findLLMsTxt("no-readme-pkg", { fallback: "empty" });
      expect(result).not.toBeNull();
      expect(result?.isFallback).toBe(true);
      expect(result?.fallbackType).toBe("empty");
      expect(result?.content).toContain("no-readme-pkg");
      expect(result?.content).toContain("No llms.txt found");
    });

    it("should return null when fallback is 'none'", async () => {
      const result = await findLLMsTxt("lodash", { fallback: "none" });
      expect(result).toBeNull();
    });

    it("should return null when fallback is 'skip'", async () => {
      const result = await findLLMsTxt("lodash", { fallback: "skip" });
      expect(result).toBeNull();
    });
  });

  it("should handle packages without homepage", async () => {
    const result = await findLLMsTxt("test-no-homepage");
    expect(result).toBeNull();
  });

  it("should find llms.txt via GitHub docs link", async () => {
    const result = await findLLMsTxt("test-github-pkg");
    expect(result).not.toBeNull();
    expect(result?.content).toContain("Found via docs link");
  });
});
