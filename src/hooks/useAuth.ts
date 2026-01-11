import { useSession, signOut } from "../lib/auth-client";

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}

export interface AuthState {
  authenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
}

export function useAuth() {
  const { data: session, isPending, error } = useSession();

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return {
    authenticated: !!session?.user,
    user: session?.user
      ? {
          id: session.user.id,
          username: session.user.name || "",
          email: session.user.email,
          avatarUrl: session.user.image,
        }
      : null,
    loading: isPending,
    logout,
    refreshAuth: () => {}, // better-auth handles this automatically
  };
}
