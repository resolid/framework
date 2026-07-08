import { httpNotFound } from "@resolid/dev/http.server";
import { mergeMeta } from "@resolid/dev/router";
import { ErrorComponent } from "~/components/error-component";
import type { Route } from "../../.react-router/types/src/portals/+types/catchall";

export async function loader() {
  httpNotFound();
}

export const meta = mergeMeta(() => [
  {
    title: "页面未找到",
  },
]);

export default function Catchall() {
  return null;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <ErrorComponent error={error} />;
}
