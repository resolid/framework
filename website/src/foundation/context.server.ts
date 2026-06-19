import { createContext } from "react-router";
import type { App } from "~/foundation/app.server";

export { honoContext } from "@resolid/dev/http.server";

export const appContext = createContext<App>();
