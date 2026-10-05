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
