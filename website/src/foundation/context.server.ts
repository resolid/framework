import type { Context } from "@resolid/dev/http.server";
import { createContext } from "react-router";
import type { App } from "~/foundation/app.server";

export const appContext = createContext<App>();
export const honoContext = createContext<Context>();
