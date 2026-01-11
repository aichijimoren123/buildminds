import { createAuthClient } from "better-auth/react";

export const { useSession, signIn, signOut } = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:10086",
});
