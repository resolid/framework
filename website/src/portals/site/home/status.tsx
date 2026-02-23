import { format } from "@formkit/tempo";
import { mergeMeta } from "@resolid/dev/router";
import { Alert, AlertDescription, AlertTitle, ClientOnly } from "@resolid/react-ui";
import { Suspense, useMemo } from "react";
import { getRequestId } from "~/extensions/middlewares/request-id.server";
import { systemRepository } from "~/modules/system/repository.server";
import type { Route } from "./+types/status";

export const meta = mergeMeta(() => {
  return [
    {
      title: "运行状态",
    },
  ];
});

export async function loader({ context }: Route.LoaderArgs) {
  return {
    ssr: {
      message: "服务器渲染正常",
      datetime: new Date().toISOString(),
      requestId: getRequestId(context),
      remoteAddress: context.remoteAddress ?? "Unknown",
    },
    db: systemRepository()
      .getFirst()
      .then(() => ({ success: true, message: "数据库访问正常" }))
      .catch(() => {
        return { success: false, message: "数据库访问失败" };
      }),
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

  const formatDatetime = (datetime: Date | string) => {
    return format({
      date: datetime,
      format: "YYYY-MM-DD HH:mm",
      tz: clientTimeZone,
    });
  };

  return (
    <div className="mx-auto prose px-4 py-8 dark:prose-invert">
      <h1 className={"text-center"}>运行状态</h1>
      <Alert className="my-5" color={"success"}>
        <AlertTitle>静态页面访问正常</AlertTitle>
      </Alert>
      <Alert className="my-5" color={"success"}>
        <AlertTitle>{ssr.message}</AlertTitle>
      </Alert>
      <Suspense
        fallback={
          <Alert color={"warning"} className="my-5">
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
      <Alert className="not-prose my-5" color={"primary"}>
        <AlertDescription className={"grid grid-cols-2 gap-1"}>
          <dt className={""}>服务器时间：</dt>
          <dd className={"font-mono"}>
            <ClientOnly>{() => formatDatetime(ssr.datetime)}</ClientOnly>
          </dd>
          <dt className={""}>客户端地址：</dt>
          <dd className={"font-mono"}>{ssr.remoteAddress}</dd>
          <dt className={""}>客户端时间：</dt>
          <dd className={"font-mono"}>
            <ClientOnly>{() => formatDatetime(new Date())}</ClientOnly>
          </dd>
          <dt className={""}>客户端时区：</dt>
          <dd className={"font-mono"}>
            <ClientOnly>{clientTimeZone}</ClientOnly>
          </dd>
          <dt className={""}>请求 Id：</dt>
          <dd className={"font-mono"}>{ssr.requestId}</dd>
        </AlertDescription>
      </Alert>
    </div>
  );
}
