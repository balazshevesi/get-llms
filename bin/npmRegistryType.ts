export interface Author {
  name: string;
  email: string;
}

export interface Zshy {
  exports: { [key: string]: string };
  conditions?: { [key: string]: string };
}

export interface ExportCondition {
  types?: string;
  import?: string;
  require?: string;
}

export interface Repository {
  type: string;
  url: string;
}

export interface Bugs {
  url: string;
}

export interface Backing {
  "npm-funding"?: boolean;
}

export interface Support {
  backing?: Backing;
}

export interface Provenance {
  predicateType: string;
}

export interface Attestations {
  url: string;
  provenance?: Provenance;
}

export interface Signature {
  keyid: string;
  sig: string;
}

export interface Dist {
  integrity: string;
  shasum: string;
  tarball: string;
  fileCount: number;
  unpackedSize: number;
  attestations?: Attestations;
  signatures?: Array<Signature>;
}

export interface NpmUser {
  name: string;
  email: string;
}

export interface Maintainer {
  name: string;
  email: string;
}

export interface NpmOperationalInternal {
  host: string;
  tmp: string;
}

export interface NpmRegistryResponse {
  name: string;
  version: string;
  type: string;
  license: string;
  author: Author;
  description: string;
  homepage: string;
  llms?: string;
  llmsFull?: string;
  mcpServer?: string;
  funding?: string;
  sideEffects?: boolean;
  keywords: string[];
  main?: string;
  types?: string;
  module?: string;
  zshy?: Zshy;
  exports: { [key: string]: string | ExportCondition };
  repository: Repository;
  bugs: Bugs;
  support?: Support;
  scripts?: { [key: string]: string };
  _id: string;
  gitHead?: string;
  _nodeVersion?: string;
  _npmVersion?: string;
  dist: Dist;
  _npmUser?: NpmUser;
  directories?: { [key: string]: unknown };
  maintainers?: Array<Maintainer>;
  _npmOperationalInternal?: NpmOperationalInternal;
  _hasShrinkwrap?: boolean;
}
