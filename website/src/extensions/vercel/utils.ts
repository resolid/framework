import { computeRoute } from "@vercel/analytics";
import { useLocation, useParams } from "react-router";

export const useRoute = (): { route: string | null; path: string } => {
  const params = useParams();
  const { pathname } = useLocation();

  return { route: computeRoute(pathname, params as never), path: pathname };
};

export function getBasePath(): string | undefined {
  try {
    return import.meta.env.VITE_VERCEL_OBSERVABILITY_BASEPATH as string | undefined;
  } catch {
    // do nothing
  }
}
