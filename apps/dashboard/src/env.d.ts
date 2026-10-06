/// <reference types="vite/client" />

/** The examples, built from the locked cases by vite.config.ts. */
declare module "virtual:examples" {
  export interface Example {
    id: string;
    label: string;
    fictional: boolean;
    defaultExitValue: string;
    /** An exit input in the engine's format. Built from rounds, it names the event whose cap table it runs on (C2). */
    exit: unknown;
    /** The company's holders and events, for an example built from its rounds. */
    company?: { holders: unknown[]; events: unknown[] };
  }
  const examples: Example[];
  export default examples;
}

/** What the page was built from, read by vite.config.ts at build time. */
declare module "virtual:build" {
  const build: {
    /** The engine's version in packages/engine/package.json, e.g. "0.1.0". */
    engineVersion: string;
    /** The short commit, e.g. "abc1234"; with ", modified" when built from uncommitted changes. */
    commit: string;
  };
  export default build;
}
