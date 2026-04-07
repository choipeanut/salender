import { createClient } from "@supabase/supabase-js";

import { ApiDomainError } from "../api/errors";
import type { AuthGateway } from "./interfaces";
import type { AuthSession, AuthUser, SignInWithPasswordInput } from "./types";

interface SupabaseSessionLike {
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
}

interface SupabaseUserLike {
  id: string;
  email?: string | null;
}

const toAuthSession = (session: SupabaseSessionLike, user: SupabaseUserLike): AuthSession => ({
  userId: user.id,
  email: user.email ?? null,
  accessToken: session.access_token,
  refreshToken: session.refresh_token ?? null,
  expiresAt: session.expires_at ?? null
});

export interface SupabaseAuthGatewayConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export class SupabaseAuthGateway implements AuthGateway {
  private readonly client;

  constructor(config: SupabaseAuthGatewayConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  async signInWithPassword(input: SignInWithPasswordInput): Promise<AuthSession> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password
    });

    if (error) {
      throw new ApiDomainError(401, "auth_failed", error.message);
    }
    if (!data.session || !data.user) {
      throw new ApiDomainError(401, "auth_failed", "No session returned from Supabase Auth.");
    }

    return toAuthSession(data.session as SupabaseSessionLike, data.user as SupabaseUserLike);
  }

  async signOut(accessToken: string): Promise<void> {
    void accessToken;
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new ApiDomainError(400, "signout_failed", error.message);
    }
  }

  async getUserFromAccessToken(accessToken: string): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error) {
      throw new ApiDomainError(401, "invalid_token", error.message);
    }
    if (!data.user) {
      return null;
    }
    return {
      userId: data.user.id,
      email: data.user.email ?? null
    };
  }
}
