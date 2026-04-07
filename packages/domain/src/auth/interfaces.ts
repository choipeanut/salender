import type { AuthSession, AuthUser, SignInWithPasswordInput } from "./types";

export interface AuthGateway {
  signInWithPassword(input: SignInWithPasswordInput): Promise<AuthSession>;
  signOut(accessToken: string): Promise<void>;
  getUserFromAccessToken(accessToken: string): Promise<AuthUser | null>;
}
