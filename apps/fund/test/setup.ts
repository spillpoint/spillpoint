// Testing Library unmounts what each test rendered, so tests don't see each other's pages.
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
