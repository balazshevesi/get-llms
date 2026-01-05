import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { beforeAll, afterEach, afterAll } from "vitest";

// Default handlers - can be overridden in individual tests
export const handlers = [
  // NPM Registry - package info
  http.get("https://registry.npmjs.org/:packageName/latest", ({ params }) => {
    const packageName = params.packageName as string;

    // Mock responses for different packages
    if (packageName === "zod") {
      return HttpResponse.json({
        name: "zod",
        version: "3.22.0",
        homepage: "https://zod.dev",
        llms: "https://zod.dev/llms.txt",
        repository: { type: "git", url: "https://github.com/colinhacks/zod" },
      });
    }

    if (packageName === "lodash") {
      return HttpResponse.json({
        name: "lodash",
        version: "4.17.21",
        homepage: "https://lodash.com/",
        repository: {
          type: "git",
          url: "git+https://github.com/lodash/lodash.git",
        },
      });
    }

    if (packageName === "react") {
      return HttpResponse.json({
        name: "react",
        version: "18.2.0",
        homepage: "https://react.dev/",
        repository: {
          type: "git",
          url: "https://github.com/facebook/react",
        },
      });
    }

    if (packageName === "test-github-pkg") {
      return HttpResponse.json({
        name: "test-github-pkg",
        version: "1.0.0",
        homepage: "https://github.com/test-owner/test-repo",
        repository: {
          type: "git",
          url: "https://github.com/test-owner/test-repo",
        },
      });
    }

    if (packageName === "test-no-homepage") {
      return HttpResponse.json({
        name: "test-no-homepage",
        version: "1.0.0",
      });
    }

    // Default: return a basic package
    return HttpResponse.json({
      name: packageName,
      version: "1.0.0",
      homepage: `https://${packageName}.example.com`,
    });
  }),

  // Zod llms.txt
  http.get("https://zod.dev/llms.txt", () => {
    return new HttpResponse("# Zod Documentation\n\nThis is the llms.txt for Zod.", {
      headers: { "Content-Type": "text/plain" },
    });
  }),

  // Standard URL checks for lodash (no llms.txt)
  http.get("https://lodash.com/llms.txt", () => {
    return new HttpResponse(null, { status: 404 });
  }),
  http.get("https://lodash.com/docs/llms.txt", () => {
    return new HttpResponse(null, { status: 404 });
  }),

  // React standard URL checks
  http.get("https://react.dev/llms.txt", () => {
    return new HttpResponse(null, { status: 404 });
  }),
  http.get("https://react.dev/docs/llms.txt", () => {
    return new HttpResponse(null, { status: 404 });
  }),

  // GitHub README for test-github-pkg
  http.get(
    "https://raw.githubusercontent.com/test-owner/test-repo/main/README.md",
    () => {
      return new HttpResponse(
        "# Test Repo\n\nCheck out the [documentation](https://docs.example.com).",
        { headers: { "Content-Type": "text/plain" } },
      );
    },
  ),

  // docs.example.com llms.txt
  http.get("https://docs.example.com/llms.txt", () => {
    return new HttpResponse("# Found via docs link!", {
      headers: { "Content-Type": "text/plain" },
    });
  }),

  // GitHub README for lodash (for fallback testing)
  http.get(
    "https://raw.githubusercontent.com/lodash/lodash/main/README.md",
    () => {
      return new HttpResponse(
        "# Lodash\n\nA modern JavaScript utility library.",
        { headers: { "Content-Type": "text/plain" } },
      );
    },
  ),
];

export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
