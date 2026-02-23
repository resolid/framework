import { mergeMeta } from "@resolid/dev/router";
import { httpNotFound } from "@resolid/dev/router.server";
import { ErrorComponent } from "~/components/error-component";

export async function loader() {
  httpNotFound();
}

export const meta = mergeMeta(() => {
  return [
    {
      title: "页面未找到",
    },
  ];
});

export default function Catchall() {
  return null;
}

export const ErrorBoundary = ErrorComponent;
