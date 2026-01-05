export interface Person {
  name: string;
  email?: string;
  url?: string;
}

export interface Repository {
  type: string;
  url: string;
  directory?: string;
}

export interface Bugs {
  url?: string;
  email?: string;
}

export interface Scripts {
  [key: string]: string;
}

export interface Dependencies {
  [key: string]: string;
}

export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  homepage?: string;
  bugs?: Bugs | string;
  license?: string;
  author?: Person | string;
  contributors?: Array<Person | string>;
  files?: string[];
  main?: string;
  bin?: string | { [key: string]: string };
  man?: string | string[];
  directories?: {
    bin?: string;
    doc?: string;
    lib?: string;
    man?: string;
  };
  repository?: Repository | string;
  scripts?: Scripts;
  config?: { [key: string]: any };
  dependencies?: Dependencies;
  devDependencies?: Dependencies;
  peerDependencies?: Dependencies;
  optionalDependencies?: Dependencies;
  bundledDependencies?: Dependencies;
  engines?: {
    node?: string;
    npm?: string;
    [key: string]: string | undefined;
  };
  os?: string[];
  cpu?: string[];
  private?: boolean;
  publishConfig?: {
    registry?: string;
    access?: string;
    tag?: string;
    [key: string]: any;
  };
  type?: "commonjs" | "module";
  types?: string;
  typings?: string;
  workspaces?: string[] | { packages: string[] };
}
