import type { Selectable, Simplify } from "kysely";
import type { AuthGroupTable, AuthPasswordResetTable, AuthSessionTable, AuthTable } from "./schema";

export type Auth = Selectable<AuthTable>;
export type AuthGroup = Selectable<AuthGroupTable>;
export type AuthSession = Selectable<AuthSessionTable>;
export type AuthPasswordReset = Selectable<AuthPasswordResetTable>;

export type AuthWithGroup<AT extends Auth, GT extends AuthGroup> = Simplify<
  AT & {
    group?: GT;
  }
>;

export type AuthIdentity<AT extends Auth, GT extends AuthGroup> = Simplify<
  Omit<AT, "password" | "createdAt" | "updatedAt" | "deletedAt"> & { group?: GT }
>;

export type AuthSessionData<AT extends Auth, GT extends AuthGroup> = {
  identity: AuthIdentity<AT, GT>;
  remoteAddr: string;
  userAgent: string;
};
