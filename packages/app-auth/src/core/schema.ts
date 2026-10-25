import {
  type Timestamp,
  type Generated,
  column,
  type ColumnDefinition,
  type InferTable,
} from "@resolid/app-db";

export const authColumns: {
  id: ColumnDefinition<Generated<number>>;
  groupId: ColumnDefinition<number>;
  password: ColumnDefinition<Generated<string>>;
  email: ColumnDefinition<Generated<string>>;
  username: ColumnDefinition<Generated<string>>;
  nickname: ColumnDefinition<Generated<string>>;
  avatar: ColumnDefinition<Generated<string>>;
  createdAt: ColumnDefinition<Generated<Timestamp>>;
  updatedAt: ColumnDefinition<Timestamp | null>;
  deletedAt: ColumnDefinition<Timestamp | null>;
} = {
  id: column<Generated<number>>(),
  groupId: column<number>(),
  password: column<Generated<string>>(),
  email: column<Generated<string>>(),
  username: column<Generated<string>>(),
  nickname: column<Generated<string>>(),
  avatar: column<Generated<string>>(),
  createdAt: column<Generated<Timestamp>>(),
  updatedAt: column<Timestamp | null>(),
  deletedAt: column<Timestamp | null>(),
};

export type AuthTable = InferTable<typeof authColumns>;

export const RX_DEFAULT_AUTH_GROUP_ID = 101;

export const authGroupColumns: {
  id: ColumnDefinition<Generated<number>>;
  name: ColumnDefinition<Generated<string>>;
  color: ColumnDefinition<Generated<string>>;
  icon: ColumnDefinition<Generated<string>>;
} = {
  id: column<Generated<number>>(),
  name: column<Generated<string>>(),
  color: column<Generated<string>>(),
  icon: column<Generated<string>>(),
};

export type AuthGroupTable = InferTable<typeof authGroupColumns>;

export const authSessionColumns: {
  id: ColumnDefinition<string>;
  identityId: ColumnDefinition<number>;
  createdAt: ColumnDefinition<Generated<Timestamp>>;
  updatedAt: ColumnDefinition<Timestamp | null>;
  expiredAt: ColumnDefinition<Timestamp>;
  remoteAddr: ColumnDefinition<Generated<string>>;
  userAgent: ColumnDefinition<Generated<string>>;
} = {
  id: column<string>(),
  identityId: column<number>(),
  createdAt: column<Generated<Timestamp>>(),
  updatedAt: column<Timestamp | null>(),
  expiredAt: column<Timestamp>(),
  remoteAddr: column<Generated<string>>(),
  userAgent: column<Generated<string>>(),
};

export type AuthSessionTable = InferTable<typeof authSessionColumns>;

export const authPasswordResetColumns: {
  id: ColumnDefinition<string>;
  identityId: ColumnDefinition<number>;
  redeemed: ColumnDefinition<Generated<number>>;
  createdAt: ColumnDefinition<Generated<Timestamp>>;
  expiredAt: ColumnDefinition<Timestamp | null>;
  remoteAddr: ColumnDefinition<Generated<string>>;
  userAgent: ColumnDefinition<Generated<string>>;
} = {
  id: column<string>(),
  identityId: column<number>(),
  redeemed: column<Generated<number>>(),
  createdAt: column<Generated<Timestamp>>(),
  expiredAt: column<Timestamp | null>(),
  remoteAddr: column<Generated<string>>(),
  userAgent: column<Generated<string>>(),
};

export type AuthPasswordResetTable = InferTable<typeof authPasswordResetColumns>;
