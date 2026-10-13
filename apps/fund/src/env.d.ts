/// <reference types="vite/client" />

/** The examples, read from the locked fund cases by vite.config.ts. */
declare module "virtual:fund-examples" {
  export interface FundExample {
    /** The fund case it comes from, e.g. "fund-08-carry-steps". */
    id: string;
    label: string;
    fictional: boolean;
    /** The X the page opens it at, as an exact string. */
    defaultX: string;
    /** The fund's input, as SPEC.md describes it: what readFund reads. */
    fund: unknown;
  }
  const examples: FundExample[];
  export default examples;
}

/** What the page was built from, read by vite.config.ts at build time. */
declare module "virtual:fund-build" {
  const build: {
    /** spillpoint-fund's version in packages/fund/package.json. */
    fundVersion: string;
    /** The short commit, e.g. "abc1234"; with ", modified" when built from uncommitted changes. */
    commit: string;
  };
  export default build;
}
