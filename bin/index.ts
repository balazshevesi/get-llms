#! /usr/bin/env node --import tsx/esm
import fs from "fs";
import { PackageJson } from "./packageJsonType";
import { findLLMsTxt } from "./llmsFetcher";
const currentDir = process.cwd();

const main = async () => {
  console.log("index.ts was ran from:", currentDir);
  const packageJsonPath = `${currentDir}/package.json`;
  let packageJson: PackageJson | undefined;
  try {
    packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8"),
    ) as PackageJson;
    console.error("Found package.json");
  } catch (e) {
    console.error("Could not find package.json", e);
    return;
  }

  const allDependencies = {
    ...packageJson?.dependencies,
    ...packageJson?.devDependencies,
  };

  if (Object.keys(allDependencies).length === 0) {
    console.log("No dependencies found in package.json");
    return;
  }

  console.log(
    `Processing ${Object.keys(allDependencies).length} dependencies...`,
  );

  for (const [key, value] of Object.entries(allDependencies)) {
    const llmsFile = await findLLMsTxt(key);
    if (llmsFile) {
      fs.mkdirSync("docs/llms/", { recursive: true });
      fs.writeFileSync(
        `docs/llms/${key.replaceAll(" ", "_").replaceAll("/", "-")}.txt`,
        llmsFile.content,
      );
      console.log(`✅ ${key}: Found llms.txt at ${llmsFile.location}`);
    } else {
      console.log(`❌ ${key}: No llms.txt found`);
    }
  }
};
main();
