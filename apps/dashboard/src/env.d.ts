/// <reference types="vite/client" />

/** The examples, built from the locked cases by vite.config.ts. */
declare module "virtual:examples" {
  export interface Example {
    id: string;
    label: string;
    fictional: boolean;
    defaultExitValue: string;
    /** An exit input in the engine's format. */
    exit: unknown;
  }
  const examples: Example[];
  export default examples;
}

/** What the page was built from, read by vite.config.ts at build time. */
declare module "virtual:build" {
  const build: {
    /** The engine's version in packages/engine/package.json, e.g. "0.0.1". */
    engineVersion: string;
    /** The short commit, e.g. "abc1234"; with ", modified" when built from uncommitted changes. */
    commit: string;
  };
  export default build;
}
