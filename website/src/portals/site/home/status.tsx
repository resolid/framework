import { format } from "@formkit/tempo";
import { getClientIp, getRequestId } from "@resolid/dev/http.server";
import { mergeMeta } from "@resolid/dev/router";
import { Alert, AlertDescription, AlertTitle, ClientOnly } from "@resolid/react-ui";
import { Suspense, useMemo } from "react";
import { systemRepository } from "~/modules/system/repository.server";
import type { Route } from "./+types/status";

export const meta = mergeMeta(() => [
  {
    title: "运行状态",
  },
]);

export async function loader({ context }: Route.LoaderArgs) {
  return {
    ssr: {
      message: "服务器渲染正常",
      datetime: new Date().toISOString(),
      requestId: getRequestId(context),
      remoteAddress: getClientIp(context),
    },
    db: systemRepository()
      .getFirst()
      .then(() => ({ success: true, message: "数据库访问正常" }))
      .catch(() => ({ success: false, message: "数据库访问失败" })),
  };
}

export default function Status({ loaderData }: Route.ComponentProps) {
  const { ssr, db } = loaderData;

  const clientTimeZone = useMemo(() => {
    if (typeof window !== "undefined") {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    return "";
  }, []);

  const formatDatetime = (datetime: Date | string) =>
    format({
      date: datetime,
      format: "YYYY-MM-DD HH:mm",
      tz: clientTimeZone,
    });

  return (
    <div className="mx-auto prose px-4 py-8 dark:prose-invert">
      <h1 className="text-center">运行状态</h1>
      <Alert className="my-5" color="success">
        <AlertTitle>静态页面访问正常</AlertTitle>
      </Alert>
      <Alert className="my-5" color="success">
        <AlertTitle>{ssr.message}</AlertTitle>
      </Alert>
      <Suspense
        fallback={
          <Alert color="warning" className="my-5">
            <AlertTitle>正在查询数据库</AlertTitle>
          </Alert>
        }
      >
        {db.then((data) => (
          <Alert color={data.success ? "success" : "danger"} className="my-5">
            <AlertTitle>{data.message}</AlertTitle>
          </Alert>
        ))}
      </Suspense>
      <Alert className="not-prose my-5" color="primary">
        <AlertDescription className="grid grid-cols-1 items-center gap-1 md:grid-cols-[max-content_1fr]">
          <dt>服务器时间：</dt>
          <dd className="font-mono text-sm">
            <ClientOnly>{() => formatDatetime(ssr.datetime)}</ClientOnly>
          </dd>
          <dt>客户端地址：</dt>
          <dd className="font-mono text-sm">{ssr.remoteAddress}</dd>
          <dt>客户端时间：</dt>
          <dd className="font-mono text-sm">
            <ClientOnly>{() => formatDatetime(new Date())}</ClientOnly>
          </dd>
          <dt>客户端时区：</dt>
          <dd className="font-mono text-sm">
            <ClientOnly>{clientTimeZone}</ClientOnly>
          </dd>
          <dt>请求 Id：</dt>
          <dd className="font-mono text-sm">{ssr.requestId}</dd>
        </AlertDescription>
      </Alert>
    </div>
  );
}
