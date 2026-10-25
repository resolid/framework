export function getIdentityDisplayName<T extends { username: string; nickname: string }>(
  identity: T,
): string {
  return identity.nickname || identity.username;
}
