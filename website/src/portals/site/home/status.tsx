import { Suspense } from "react";
import { systemRepository } from "~/modules/system/system.server";
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
      <div className={"my-5 rounded bg-green-100 p-4 font-medium text-green-800"}>静态页面访问正常</div>
      <div className={"my-5 rounded bg-green-100 p-4 font-medium text-green-800"}>{ssr.message}</div>
      <Suspense
        fallback={<div className="my-5 rounded bg-yellow-100 p-4 font-medium text-yellow-800">正在查询数据库</div>}
      >
        {db.then((data) => (
          <div
            className={
              "my-5 rounded p-4 font-medium " +
              (data.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")
            }
          >
            {data.message}
          </div>
        ))}
      </Suspense>
    </div>
  );
}
