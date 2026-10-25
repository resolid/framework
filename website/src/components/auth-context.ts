import { createContext, use } from "react";

export function createAuthContext<T>() {
  const AuthContext = createContext<T | undefined>(undefined);

  function useAuth() {
    return use(AuthContext);
  }

  return { AuthContext, useAuth };
}
