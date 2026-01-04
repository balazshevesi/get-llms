import { NpmRegistry } from "./npmRegistryType";

export const getPackageInfo = async (packageName: string) => {
  const response = await fetch(
    `https://registry.npmjs.org/${packageName}/latest`,
  );
  const data = (await response.json()) as NpmRegistry;
  return data;
};
