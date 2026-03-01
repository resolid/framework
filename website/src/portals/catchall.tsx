import { httpNotFound } from "@resolid/dev/http.server";
import { mergeMeta } from "@resolid/dev/router";
import { ErrorComponent } from "~/components/error-component";

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

export const ErrorBoundary = ErrorComponent;
