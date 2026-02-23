import { createRequestIdMiddleware } from "@resolid/dev/router.server";

export const [requestIdMiddleware, getRequestId] = createRequestIdMiddleware();
