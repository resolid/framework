import type { AnalyticsProps } from "@vercel/analytics";
import { Analytics as AnalyticsScript } from "@vercel/analytics/react";
import { getBasePath, useRoute } from "~/extensions/vercel/utils";

export function VercelAnalytics(props: Omit<AnalyticsProps, "route">) {
  return (
    <AnalyticsScript {...useRoute()} {...props} basePath={getBasePath()} framework="react-router" />
  );
}
