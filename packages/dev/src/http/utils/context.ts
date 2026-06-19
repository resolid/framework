import type { Context } from "hono";
import { createContext, type RouterContext } from "react-router";

export const honoContext: RouterContext<Context> = createContext<Context>();
