import type { UserIdentity } from "~/modules/user/schema.server";
import { createAuthContext } from "~/components/auth-context";

export const { AuthContext, useAuth } = createAuthContext<UserIdentity>();
