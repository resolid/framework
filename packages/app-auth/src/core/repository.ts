import type { Insertable, Kysely, Updateable } from "kysely";
import { BaseRepository, insertOne, type Table } from "@resolid/app-db";
import type { AuthGroupTable, AuthPasswordResetTable, AuthSessionTable, AuthTable } from "./schema";
import type { Auth, AuthGroup, AuthPasswordReset, AuthWithGroup } from "./types";

interface AuthDatabase {
  auth: AuthTable;
  authGroup: AuthGroupTable;
  authSession: AuthSessionTable;
  authPasswordReset: AuthPasswordResetTable;
}

export abstract class AuthRepository<AT extends Auth, GT extends AuthGroup> extends BaseRepository {
  private get authDb(): Kysely<AuthDatabase> {
    return this.db as never as Kysely<AuthDatabase>;
  }

  protected abstract readonly authTable: Table;
  protected abstract readonly authGroupTable: Table;
  protected abstract readonly authSessionTable: Table;
  protected abstract readonly authPasswordResetTable: Table;

  private get authTableName(): "auth" {
    return this.authTable.name as "auth";
  }

  private get authGroupTableName(): "authGroup" {
    return this.authGroupTable.name as "authGroup";
  }

  private get authSessionTableName(): "authSession" {
    return this.authSessionTable.name as "authSession";
  }

  private get authPasswordResetTableName(): "authPasswordReset" {
    return this.authPasswordResetTable.name as "authPasswordReset";
  }

  async create(auth: AT): Promise<AT> {
    return (await insertOne(
      this.authDb,
      this.authTableName,
      this.authTable.filterData(auth),
    )) as AT;
  }

  async updatePassword(id: number, password: string): Promise<void> {
    await this.authDb
      .updateTable(this.authTableName)
      .set({ password })
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const auth = await this.authDb
      .selectFrom(this.authTableName)
      .select("id")
      .where("email", "=", email)
      .executeTakeFirst();

    return auth != undefined;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const auth = await this.authDb
      .selectFrom(this.authTableName)
      .select("id")
      .where("username", "=", username)
      .executeTakeFirst();

    return auth != undefined;
  }

  async existsByNickname(nickname: string): Promise<boolean> {
    const auth = await this.authDb
      .selectFrom(this.authTableName)
      .select("id")
      .where("nickname", "=", nickname)
      .executeTakeFirst();

    return auth != undefined;
  }

  async findGroupById(groupId: number): Promise<GT | undefined> {
    return (await this.authDb
      .selectFrom(this.authGroupTableName)
      .selectAll()
      .where("id", "=", groupId)
      .executeTakeFirst()) as GT;
  }

  async findById(id: number, withGroup = false): Promise<AT | AuthWithGroup<AT, GT> | undefined> {
    const auth = await this.authDb
      .selectFrom(this.authTableName)
      .selectAll()
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    if (auth == undefined || !withGroup) {
      return auth as AT | undefined;
    }

    return { ...auth, group: await this.findGroupById(auth.groupId) } as AuthWithGroup<AT, GT>;
  }

  async findByEmail(
    email: string,
    withGroup = false,
  ): Promise<AT | AuthWithGroup<AT, GT> | undefined> {
    const auth = await this.authDb
      .selectFrom(this.authTableName)
      .selectAll()
      .where("email", "=", email)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    if (auth == undefined || !withGroup) {
      return auth as AT | undefined;
    }

    return { ...auth, group: await this.findGroupById(auth.groupId) } as AuthWithGroup<AT, GT>;
  }

  async findBySessionId(
    sessionId: string,
    withGroup = false,
  ): Promise<AT | AuthWithGroup<AT, GT> | undefined> {
    const auth = await this.authDb
      .selectFrom(this.authTableName)
      .selectAll()
      .where("id", "in", (qb) =>
        qb
          .selectFrom(this.authSessionTableName)
          .select("identityId")
          .where("id", "=", sessionId)
          .where("expiredAt", ">", new Date()),
      )
      .executeTakeFirst();

    if (auth == undefined || !withGroup) {
      return auth as AT | undefined;
    }

    return { ...auth, group: await this.findGroupById(auth.groupId) } as AuthWithGroup<AT, GT>;
  }

  async createSession(sessionData: Insertable<AuthSessionTable>): Promise<void> {
    await this.authDb
      .insertInto(this.authSessionTableName)
      .values(sessionData)
      .executeTakeFirstOrThrow();
  }

  async updateSession(sessionId: string, sessionData: Updateable<AuthSessionTable>): Promise<void> {
    await this.authDb
      .updateTable(this.authSessionTableName)
      .set(sessionData)
      .where("id", "=", sessionId)
      .executeTakeFirst();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.authDb.deleteFrom(this.authSessionTableName).where("id", "=", sessionId).execute();
  }

  async createPasswordReset(resetData: Insertable<AuthPasswordResetTable>): Promise<void> {
    await this.authDb.insertInto(this.authPasswordResetTableName).values(resetData).execute();
  }

  async findPasswordResetById(resetId: string): Promise<AuthPasswordReset | undefined> {
    return await this.authDb
      .selectFrom(this.authPasswordResetTableName)
      .selectAll()
      .where("id", "=", resetId)
      .where("redeemed", "=", 0)
      .where("expiredAt", ">", new Date())
      .executeTakeFirst();
  }

  async redeemedPasswordReset(resetId: string): Promise<void> {
    await this.authDb
      .updateTable(this.authPasswordResetTableName)
      .set({
        redeemed: 1,
      })
      .where("id", "=", resetId)
      .executeTakeFirst();
  }
}
