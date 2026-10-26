import type { Resolver } from "react-hook-form";
import type * as z from "zod";
import { BaseService } from "@resolid/app-db";
import { createFieldErrors, validateData, type ServiceResult } from "@resolid/app/validate";
import { omit, random } from "@resolid/utils";
import { verifyPassword, hashPassword } from "@resolid/utils/password";
import type {
  authPasswordForgotSchema,
  authPasswordResetSchema,
  authLoginSchema,
  authSignupSchema,
} from "../validate";
import type { AuthRepository } from "./repository";
import type { Auth, AuthGroup, AuthIdentity, AuthSessionData, AuthWithGroup } from "./types";

type AuthLoginFormData = z.infer<typeof authLoginSchema>;

type AuthSignupFormData = z.infer<typeof authSignupSchema>;

type AuthPasswordForgotFormData = z.infer<typeof authPasswordForgotSchema>;

type AuthPasswordResetFormData = z.infer<typeof authPasswordResetSchema>;

export const omitIdentity = <TAuth extends Auth, TGroup extends AuthGroup>(
  identity: TAuth | AuthWithGroup<TAuth, TGroup>,
): AuthIdentity<TAuth, TGroup> => {
  return omit(identity, ["password", "createdAt", "updatedAt", "deletedAt"]) as AuthIdentity<
    TAuth,
    TGroup
  >;
};

export abstract class AuthService<
  TAuth extends Auth,
  TGroup extends AuthGroup,
  R extends AuthRepository<TAuth, TGroup> = AuthRepository<TAuth, TGroup>,
> extends BaseService {
  private _repository: R;

  protected constructor(repository: R) {
    super();
    this._repository = repository;
  }

  get repository(): R {
    return this._repository;
  }

  async login<T extends AuthLoginFormData>(
    data: T,
    resolver: Resolver<T>,
  ): Promise<ServiceResult<T, AuthIdentity<TAuth, TGroup>>> {
    const result = await validateData<T>(data, resolver);

    if (!result.success) {
      return [result.errors, undefined];
    }

    const identity = await this._repository.findByEmail(result.values.email, true);

    if (!identity) {
      await hashPassword(result.values.password);
    }

    if (
      identity == undefined ||
      !(await verifyPassword(identity.password, result.values.password))
    ) {
      return [createFieldErrors<T>({ password: "邮箱或密码错误" }), undefined];
    }

    return [undefined, omitIdentity<TAuth, TGroup>(identity)];
  }

  async signup<T extends AuthSignupFormData>(
    data: T,
    defaultGroupId: number,
    resolver: Resolver<T>,
  ): Promise<ServiceResult<T, AuthIdentity<TAuth, TGroup>>> {
    const result = await validateData<T>(data, resolver);

    if (!result.success) {
      return [result.errors, undefined];
    }

    const passwordHash = await hashPassword(result.values.password);

    return await this.database.transaction(async (trx) => {
      const repository = this._repository.withExecutor(trx);

      if (result.values.email && (await repository.existsByEmail(result.values.email))) {
        return [createFieldErrors<T>({ email: "邮箱已存在" }), undefined];
      }

      if (result.values.username && (await repository.existsByUsername(result.values.username))) {
        return [createFieldErrors<T>({ username: "用户名已存在" }), undefined];
      }

      if (result.values.nickname && (await repository.existsByNickname(result.values.nickname))) {
        return [createFieldErrors<T>({ nickname: "昵称已存在" }), undefined];
      }

      const group = await repository.findGroupById(defaultGroupId);

      if (!group) {
        return [createFieldErrors<T>({ groupId: "默认组不存在" }), undefined];
      }

      const identity = await repository.create({
        ...result.values,
        password: passwordHash,
        groupId: group.id,
      } as TAuth);

      return [
        undefined,
        omitIdentity<TAuth, TGroup>({
          ...identity,
          group,
        }),
      ];
    });
  }

  async getIdentity(sessionId: string): Promise<AuthIdentity<TAuth, TGroup> | undefined> {
    const identity = await this._repository.findBySessionId(sessionId, true);

    if (!identity) {
      return undefined;
    }

    return omitIdentity(identity);
  }

  async createSession(session: AuthSessionData<TAuth, TGroup>, expiresAt: Date): Promise<string> {
    const sessionId = random();

    await this._repository.createSession({
      id: sessionId,
      identityId: session.identity.id,
      remoteAddr: session.remoteAddr,
      userAgent: session.userAgent,
      expiresAt,
    });

    return sessionId;
  }

  async updateSession(
    id: string,
    session: AuthSessionData<TAuth, TGroup>,
    expiresAt: Date,
  ): Promise<void> {
    const update = {
      identityId: session.identity.id,
      remoteAddr: session.remoteAddr,
      userAgent: session.userAgent,
      expiresAt,
    };

    await this._repository.updateSession(id, update);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this._repository.deleteSession(sessionId);
  }

  async passwordForgot<T extends AuthPasswordForgotFormData>(
    data: T,
    expiresAt: Date,
    remoteAddr: string,
    userAgent: string,
    resolver: Resolver<T>,
  ): Promise<
    ServiceResult<T, { identity: AuthIdentity<TAuth, TGroup> | undefined; resetId: string }>
  > {
    const result = await validateData<T>(data, resolver);

    if (!result.success) {
      return [result.errors, undefined];
    }

    const resetId = random();

    return await this.database.transaction(async (trx) => {
      const repository = this._repository.withExecutor(trx);

      const identity = await repository.findByEmail(result.values.email);

      if (!identity) {
        return [undefined, { identity: undefined, resetId }];
      }

      await repository.createPasswordReset({
        id: resetId,
        identityId: identity.id,
        expiresAt,
        remoteAddr,
        userAgent,
      });

      return [undefined, { identity: omitIdentity(identity), resetId }];
    });
  }

  async passwordReset<T extends AuthPasswordResetFormData>(
    data: T,
    resetId: string | null,
    resolver: Resolver<T>,
  ): Promise<ServiceResult<T, boolean>> {
    if (resetId == null || resetId.length == 0) {
      return [createFieldErrors<T>({ token: "密码重置无效" }), undefined];
    }

    const result = await validateData<T>(data, resolver);

    if (!result.success) {
      return [result.errors, undefined];
    }

    const passwordHash = await hashPassword(result.values.password);

    return await this.database.transaction(async (trx) => {
      const repository = this._repository.withExecutor(trx);

      const reset = await repository.findPasswordResetById(resetId);

      if (reset == undefined) {
        return [createFieldErrors<T>({ token: "密码重置无效" }), undefined];
      }

      if (!(await repository.consumePasswordReset(reset.id))) {
        return [createFieldErrors<T>({ token: "密码重置无效" }), undefined];
      }

      await repository.updatePassword(reset.identityId, passwordHash);

      return [undefined, true];
    });
  }
}
