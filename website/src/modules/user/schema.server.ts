import {
  type AuthIdentity,
  authColumns,
  authGroupColumns,
  authSessionColumns,
  authPasswordResetColumns,
} from "@resolid/app-auth";
import { type Timestamp, defineTable, column, type Generated } from "@resolid/app-db";

export const userTable = defineTable("user", {
  ...authColumns,
  emailVerifiedAt: column<Timestamp | null>(),
  createdIp: column<Generated<string>>(),
  createdFrom: column<Generated<string>>(),
});

export type User = typeof userTable.$select;

export const userGroupTable = defineTable("userGroup", authGroupColumns);

export type UserGroup = typeof userGroupTable.$select;

export const userSessionTable = defineTable("userSession", authSessionColumns);

export const userPasswordResetTable = defineTable("userPasswordReset", authPasswordResetColumns);

export type UserPasswordReset = typeof userPasswordResetTable.$select;

export type UserIdentity = AuthIdentity<User, UserGroup>;

declare module "@resolid/app-db" {
  interface Database {
    user: typeof userTable.$infer;
    userGroup: typeof userGroupTable.$infer;
    userSession: typeof userSessionTable.$infer;
    userPasswordReset: typeof userPasswordResetTable.$infer;
  }
}
