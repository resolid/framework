import type { IntRange } from "type-fest";
import {
  createSessionStorage,
  type SessionStorage,
  type SessionIdStorageStrategy,
} from "react-router";
import type { AuthService } from "./service";
import type { Auth, AuthGroup, AuthIdentity, AuthSessionData } from "./types";

type DateOption<T extends IntRange<1, 366> | undefined = undefined> = T extends undefined
  ? undefined
  : Date;

export const getCookieExpires = <T extends IntRange<1, 366> | undefined>(
  days?: T,
): DateOption<T> => {
  return days
    ? (new Date(Date.now() + 1000 * 60 * 60 * 24 * days) as DateOption<T>)
    : (undefined as DateOption<T>);
};

type Cookie = SessionIdStorageStrategy["cookie"];

export abstract class AuthSessionService<
  AT extends Auth,
  GT extends AuthGroup,
  S extends AuthService<AT, GT> = AuthService<AT, GT>,
> {
  private readonly _service: S;
  private readonly _storage: SessionStorage;

  constructor(cookie: Cookie, service: S) {
    this._service = service;
    this._storage = createSessionStorage({
      cookie,
      async createData(data, expires) {
        const expiredAt = expires ?? getCookieExpires(1);

        return await service.createSession(data as AuthSessionData<AT, GT>, expiredAt);
      },
      async updateData(id, data, expires) {
        const expiredAt = expires ?? getCookieExpires(1);

        await service.updateSession(id, data as AuthSessionData<AT, GT>, expiredAt);
      },
      async readData(id) {
        const identity = await service.getIdentity(id);

        return identity ? { identity } : null;
      },
      async deleteData(id) {
        await service.revokeSession(id);
      },
    });
  }

  get service(): S {
    return this._service;
  }

  async getIdentity(request: Request): Promise<AuthIdentity<AT, GT> | undefined> {
    const session = await this._storage.getSession(request.headers.get("Cookie"));

    return session.has("identity") ? session.data.identity : undefined;
  }

  async commitSession(
    request: Request,
    identity: AuthIdentity<AT, GT>,
    remoteAddr: string,
    rememberMe: boolean,
  ): Promise<string> {
    const session = await this._storage.getSession(request.headers.get("Cookie"));

    session.set("identity", identity);
    session.set("remoteAddr", remoteAddr);
    session.set("userAgent", request.headers.get("user-agent") ?? "");

    return await this._storage.commitSession(session, {
      expires: getCookieExpires(rememberMe ? 365 : undefined),
    });
  }

  async destroySession(request: Request): Promise<string> {
    return await this._storage.destroySession(
      await this._storage.getSession(request.headers.get("Cookie")),
    );
  }
}
