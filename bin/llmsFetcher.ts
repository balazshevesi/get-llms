import { NpmRegistry } from "./npmRegistryType";
import { getPackageInfo } from "./utils";

interface FetchResult {
  location: string;
  content: string;
}

// Check package.json "llms" key
export const checkPackage = async (
  s: NpmRegistry,
): Promise<FetchResult | null> => {
  if (!s.llms) return null;

  const llmsValue = s.llms;

  if (llmsValue.startsWith("http://") || llmsValue.startsWith("https://")) {
    try {
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
      return null;
    }
  }
  return null;
};

export const checkStandardUrls = async (
  baseUrl: string,
): Promise<FetchResult | null> => {
  // Ensure no trailing slash
  const url = new URL(baseUrl);
  const possibilities = [
    `${url.href}/llms.txt`,
    `${url.href}/docs/llms.txt`,
    `${url.origin}/llms.txt`,
    `${url.origin}/docs/llms.txt`,
  ];

  for (const url of possibilities) {
    try {
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
      // Ignore network errors, try next
    }
  }
  return null;
};

export const handleGithub = async (
  homepage: string,
): Promise<FetchResult | null> => {
  const match = homepage.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  const [, owner, repo] = match;

  const branches = ["main", "master"];
  const filenames = ["README.md", "readme.md", "README.txt", "readme.txt"];

  let readmeContent = "";

  // Try to find README
  for (const branch of branches) {
    if (readmeContent) break;
    for (const filename of filenames) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filename}`;
      try {
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

export const findLLMsTxt = async (
  packageName: string,
): Promise<FetchResult | null> => {
  try {
    const info = await getPackageInfo(packageName);

    // 1. Check package.json "llms" key
    const fromPackageJson = await checkPackage(info);
    if (fromPackageJson) return fromPackageJson;

    // 2. Check homepage
    if (info.homepage) return await checkHomepage(info.homepage);

    return null;
  } catch (error) {
    console.error(`Error fetching info for ${packageName}:`, error);
    return null;
  }
};
