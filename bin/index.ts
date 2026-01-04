#! /usr/bin/env node --import tsx/esm
import fs from "fs";
import { PackageJson } from "./packageJsonType";
import { getPackageInfo } from "./utils";
const currentDir = process.cwd();

const main = async () => {
  console.log("index.ts was ran from:", currentDir);
  const packageJsonPath = `${currentDir}/package.json`;
  // TODO: Add error handling and logging
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as
    | PackageJson
    | undefined;

  if (!packageJson || !packageJson.dependencies) return;

  for (const [key, value] of Object.entries(packageJson?.dependencies)) {
    const packageInfo = await getPackageInfo(key);
    console.log(key, value, packageInfo.homepage);
  }
};
main();
