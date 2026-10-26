import type { Selectable, Simplify } from "kysely";
import type { AuthGroupTable, AuthPasswordResetTable, AuthSessionTable, AuthTable } from "./schema";

export type Auth = Selectable<AuthTable>;
export type AuthGroup = Selectable<AuthGroupTable>;
export type AuthSession = Selectable<AuthSessionTable>;
export type AuthPasswordReset = Selectable<AuthPasswordResetTable>;

export type AuthWithGroup<TAuth extends Auth, TGroup extends AuthGroup> = TAuth & {
  group: TGroup;
};

export type AuthIdentity<TAuth extends Auth, TGroup extends AuthGroup> = Simplify<
  Omit<AuthWithGroup<TAuth, TGroup>, "password" | "createdAt" | "updatedAt" | "deletedAt">
>;

export type AuthSessionData<TAuth extends Auth, TGroup extends AuthGroup> = {
  identity: AuthIdentity<TAuth, TGroup>;
  remoteAddr: string;
  userAgent: string;
};
