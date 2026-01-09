import type { AnalyticsProps } from "@vercel/analytics";
import { Analytics as AnalyticsScript } from "@vercel/analytics/react";
import { getBasePath, useRoute } from "~/extensions/vercel/utils";

export const VercelAnalytics = (props: Omit<AnalyticsProps, "route">) => (
  <AnalyticsScript {...useRoute()} {...props} basePath={getBasePath()} framework="react-router" />
);
