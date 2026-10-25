import { AuthRepository } from "@resolid/app-auth";
import {
  userGroupTable,
  userPasswordResetTable,
  userSessionTable,
  userTable,
  type User,
  type UserGroup,
} from "./schema.server";

export class UserRepository extends AuthRepository<User, UserGroup> {
  protected readonly authTable = userTable;
  protected readonly authGroupTable = userGroupTable;
  protected readonly authSessionTable = userSessionTable;
  protected readonly authPasswordResetTable = userPasswordResetTable;
}
