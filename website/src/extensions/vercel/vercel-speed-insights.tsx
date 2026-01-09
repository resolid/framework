import type { SpeedInsightsProps } from "@vercel/speed-insights";
import { SpeedInsights as SpeedInsightsScript } from "@vercel/speed-insights/react";
import { getBasePath, useRoute } from "~/extensions/vercel/utils";

export const VercelSpeedInsights = (props: Omit<SpeedInsightsProps, "route">) => {
  const route = useRoute();

  return (
    <SpeedInsightsScript
      route={route.route}
      {...props}
      basePath={getBasePath()}
      framework="react-router"
    />
  );
};
