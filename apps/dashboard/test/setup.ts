// Testing Library unmounts what each test rendered, so tests don't see each other's pages.
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

import { ANALYSIS_TIMEOUT } from "./analysis.ts";

afterEach(cleanup);

// Much of the page waits on the analysis, which runs on the main thread here (no Worker): every findBy and
// waitFor may wait as long as it can take on a busy machine, not Testing Library's default second.
configure({ asyncUtilTimeout: ANALYSIS_TIMEOUT });
