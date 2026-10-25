import { inject } from "@resolid/app";
import { AuthService } from "@resolid/app-auth";
import type { User, UserGroup } from "./schema.server";
import { UserRepository } from "./repository.server";

export class UserService extends AuthService<User, UserGroup> {
  constructor(repository = inject(UserRepository)) {
    super(repository);
  }
}
