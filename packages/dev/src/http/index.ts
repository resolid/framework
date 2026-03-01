export { getRequestId } from "./middlewares/request-id";
export { getRequestOrigin } from "./middlewares/request-origin";
export { getClientIp } from "./middlewares/client-ip";

export * from "./utils/response";
export * from "./platforms/netlify";
export * from "./platforms/vercel";
export * from "./platforms/node";
