import { inject } from "@resolid/app";
import { AuthSessionService } from "@resolid/app-auth";
import { env } from "node:process";
import type { User, UserGroup } from "./schema.server";
import { UserService } from "./service.server";

export class UserSessionService extends AuthSessionService<User, UserGroup> {
  constructor(service = inject(UserService)) {
    super(
      {
        name: "__su",
        httpOnly: true,
        sameSite: "lax",
        secrets: [env.RX_COOKIE_SECRET],
        secure: env.NODE_ENV == "production",
        path: "/",
      },
      service,
    );
  }
}
