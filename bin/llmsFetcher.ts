import { NpmRegistry } from "./types/npmRegistryType";
import { getPackageInfo } from "./utils/utils";
import { FallbackStrategy } from "./types/types";
import { logger } from "./utils/logger";

export interface FetchResult {
  location: string;
  content: string;
  isFallback?: boolean;
  fallbackType?: "readme" | "empty";
}

/**
 * Clean up a GitHub URL to extract owner/repo
 * Handles various formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo#readme
 * - git+https://github.com/owner/repo.git
 */
const parseGitHubUrl = (
  url: string,
): { owner: string; repo: string } | null => {
  // Remove git+ prefix if present
  let cleanUrl = url.replace(/^git\+/, "");
  // Remove .git suffix if present
  cleanUrl = cleanUrl.replace(/\.git$/, "");
  // Remove hash fragments
  cleanUrl = cleanUrl.replace(/#.*$/, "");

  const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;

  return { owner: match[1], repo: match[2] };
};

// Check package.json "llms" key
export const checkPackage = async (
  s: NpmRegistry,
): Promise<FetchResult | null> => {
  if (!s.llms) return null;

  const llmsValue = s.llms;

  if (llmsValue.startsWith("http://") || llmsValue.startsWith("https://")) {
    try {
      logger.verbose(`Checking package llms field: ${llmsValue}`);
      const response = await fetch(llmsValue);
      const contentType = response.headers.get("content-type");
      if (
        response.ok &&
        (contentType?.includes("text/plain") ||
          contentType?.includes("text/markdown"))
      ) {
        return { location: llmsValue, content: await response.text() };
      }
    } catch (e) {
      logger.debug(`Failed to fetch from package llms field: ${e}`);
      return null;
    }
  }
  return null;
};

export const checkStandardUrls = async (
  baseUrl: string,
): Promise<FetchResult | null> => {
  // Ensure no trailing slash and clean URL
  const url = new URL(baseUrl);
  // Remove trailing slash from href
  const cleanHref = url.href.replace(/\/+$/, "");
  const possibilities = [
    `${cleanHref}/llms.txt`,
    `${cleanHref}/docs/llms.txt`,
    `${url.origin}/llms.txt`,
    `${url.origin}/docs/llms.txt`,
  ];

  for (const url of possibilities) {
    try {
      logger.verbose(`Checking standard URL: ${url}`);
      const response = await fetch(url, { method: "GET" });
      const contentType = response.headers.get("content-type");

      if (response.ok) {
        const text = await response.text();

        // Strict check: must be text/plain or markdown
        if (
          contentType?.includes("text/plain") ||
          contentType?.includes("text/markdown")
        ) {
          return { location: url, content: text };
        }

        // Fallback: Check content if content-type is generic or missing
        // If it is text/html, it is likely a 404 page or SPA fallback.
        if (contentType?.includes("text/html")) {
          continue; // Skip HTML responses
        }

        // detailed check: shouldn't start with <!DOCTYPE html
        if (
          text.trim().toLowerCase().startsWith("<!doctype html") ||
          text.includes("<html")
        ) {
          continue;
        }
        return { location: url, content: text };
      }
    } catch (e) {
      logger.debug(`Failed to fetch ${url}: ${e}`);
      // Ignore network errors, try next
    }
  }
  return null;
};

export const fetchReadmeFromGithub = async (
  homepage: string,
): Promise<FetchResult | null> => {
  const parsed = parseGitHubUrl(homepage);
  if (!parsed) return null;
  const { owner, repo } = parsed;

  const branches = ["main", "master"];
  const filenames = ["README.md", "readme.md", "README.txt", "readme.txt"];

  for (const branch of branches) {
    for (const filename of filenames) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filename}`;
      try {
        logger.verbose(`Checking GitHub README: ${rawUrl}`);
        const res = await fetch(rawUrl);
        if (res.ok) {
          return {
            location: rawUrl,
            content: await res.text(),
            isFallback: true,
            fallbackType: "readme",
          };
        }
      } catch {
        continue;
      }
    }
  }

  return null;
};

export const handleGithub = async (
  homepage: string,
): Promise<FetchResult | null> => {
  const parsed = parseGitHubUrl(homepage);
  if (!parsed) return null;
  const { owner, repo } = parsed;

  const branches = ["main", "master"];
  const filenames = ["README.md", "readme.md", "README.txt", "readme.txt"];

  let readmeContent = "";

  // Try to find README
  for (const branch of branches) {
    if (readmeContent) break;
    for (const filename of filenames) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filename}`;
      try {
        logger.verbose(`Checking GitHub for README: ${rawUrl}`);
        const res = await fetch(rawUrl);
        if (res.ok) {
          readmeContent = await res.text();
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (!readmeContent) return null;

  // Look for links containing "docs"
  // Markdown link regex: \[([^\]]*)\]\(([^)]+)\)
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let linkMatch: RegExpExecArray | null = linkRegex.exec(readmeContent);

  while (linkMatch !== null) {
    const [_, text, url] = linkMatch;
    linkMatch = linkRegex.exec(readmeContent);
    // Check if text or url contains "docs" (flowchart says "mention the word 'docs' in a hyperlink")
    // It implies the anchor text or the URL itself could hint at docs?
    // "does the github 'readme.txt' mention the word 'docs' in a hyperlink?"
    // Usually means the text is "Docs" or "Documentation" or URL has /docs

    if (
      text.toLowerCase().includes("docs") ||
      url.toLowerCase().includes("docs")
    ) {
      // Resolve relative URLs
      let absoluteUrl = url;
      if (!url.startsWith("http")) {
        // Construct absolute URL relative to the repo's homepage or raw content?
        // If it points to a website, it's likely absolute.
        // If it points to a file in repo, it's relative.
        // Flowchart: E -- yes --> FOUND
        // E is "does 'link/llms.txt' return a txt file?"
        // So 'link' acts as a base URL.

        // If the link is relative (e.g. "docs/"), and we append "llms.txt", we get "docs/llms.txt".
        // If the link is "https://mypackage.com", we get "https://mypackage.com/llms.txt".

        if (!url.startsWith("/")) {
          absoluteUrl = `https://github.com/${owner}/${repo}/blob/main/${url}`; // Approximate
          // But if it's a website link in valid markdown, it's usually absolute.
          // If it is relative, it points to a folder in the repo.
          // The finding 'llms.txt' relative to a repo folder is valid.
        }
      }

      // Check this URL
      logger.verbose(`Found docs link, checking: ${absoluteUrl}`);
      const result = await checkStandardUrls(absoluteUrl);
      if (result) return result;
    }
  }

  return null;
};

export const checkHomepage = async (
  homepage: string,
): Promise<FetchResult | null> => {
  if (!homepage) return null;

  if (homepage.includes("github.com")) {
    const githubResult = await handleGithub(homepage);
    if (githubResult)
      return { location: githubResult.location, content: githubResult.content };
    // Fallback to checking standard URLs on the repo if scraping fails?
    // actually flowchart says: if github -> scrape README -> if link found -> check standard urls of THAT link
    //                                      -> if no link found -> NOFILE
    // So we shouldn't check standard URLs of the github repo itself unless the logic implies it.
    // Wait, reading flowchart:
    // C{package homepage is github?} -- yes --> D{readme mentions 'docs'?}
    // D -- yes --> E{link/llms.txt?}
    // D -- no --> NOFILE

    // So if it IS github, we ONLY check if we find a docs link. We don't check github.com/user/repo/llms.txt directly based on the flowchart.
    // Although, the flowchart says "link/llms.txt" where 'link' comes from D.
    // If C is NO (not github), it goes to E directly with the homepage.

    return null; // Placeholder for now until handleGithub is real
  }

  // Not github, check standard URLs
  return checkStandardUrls(homepage);
};

export interface FindLLMsOptions {
  fallback?: FallbackStrategy;
}

export const findLLMsTxt = async (
  packageName: string,
  options: FindLLMsOptions = {},
): Promise<FetchResult | null> => {
  const { fallback = "none" } = options;

  try {
    logger.verbose(`Fetching package info for: ${packageName}`);
    const info = await getPackageInfo(packageName);

    // 1. Check package.json "llms" key
    const fromPackageJson = await checkPackage(info);
    if (fromPackageJson) return fromPackageJson;

    // 2. Check homepage
    if (info.homepage) {
      const fromHomepage = await checkHomepage(info.homepage);
      if (fromHomepage) return fromHomepage;
    }

    // 3. Apply fallback strategy if no llms.txt found
    if (fallback === "readme" && info.homepage) {
      logger.verbose(`Applying readme fallback for: ${packageName}`);
      // Try to fetch README from GitHub
      if (info.homepage.includes("github.com")) {
        const readmeResult = await fetchReadmeFromGithub(info.homepage);
        if (readmeResult) return readmeResult;
      }

      // Try to get README from repository field
      const repoUrl =
        typeof info.repository === "string"
          ? info.repository
          : info.repository?.url;

      if (repoUrl && repoUrl.includes("github.com")) {
        const readmeResult = await fetchReadmeFromGithub(repoUrl);
        if (readmeResult) return readmeResult;
      }
    }

    if (fallback === "empty") {
      return {
        location: "fallback:empty",
        content: `# ${packageName}\n\nNo llms.txt found for this package.\n`,
        isFallback: true,
        fallbackType: "empty",
      };
    }

    return null;
  } catch (error) {
    logger.debug(`Error fetching info for ${packageName}:`, error);
    return null;
  }
};
