import { getHonoContext, httpRedirect } from "@resolid/dev/http";
import { UserSessionService } from "~/modules/user/session.service.server";
import type { Route } from "./+types/logout";

export async function action({ request, context }: Route.ActionArgs) {
  httpRedirect(
    new URL(request.url).searchParams.get("redirect") ?? "",
    await getHonoContext(context).get("app").get(UserSessionService).destroySession(request),
  );
}
