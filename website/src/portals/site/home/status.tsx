import { Alert, AlertTitle } from "@resolid/react-ui";
import { Suspense } from "react";
import { systemRepository } from "~/modules/system/repository.server";
import type { Route } from "./+types/status";

export async function loader() {
  return {
    ssr: {
      message: "服务器渲染正常",
    },
    db: systemRepository()
      .getFirst()
      .then(() => ({ success: true, message: "数据库访问正常" }))
      .catch((reason) => {
        console.log(reason);
        return { success: false, message: "数据库访问失败" };
      }),
  };
}

export default function Status({ loaderData }: Route.ComponentProps) {
  const { ssr, db } = loaderData;

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
    </div>
  );
}
