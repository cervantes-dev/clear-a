import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { AppUser } from "../types/auth";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

function isDuplicateLrn(error: any): boolean {
  return error?.code === "23505" && String(error?.message ?? "").includes("lrn");
}

export type EmailRegistrationCheck = {
  existsAlready: boolean;
  provider: string | null;
  confirmed: boolean;
};

/** Pre-signup check: is this email already registered, and under which provider? */
export async function checkEmailRegistration(email: string): Promise<EmailRegistrationCheck> {
  const { data, error } = await supabase.rpc("check_email_registration", { check_email: email });
  if (error) throw error;
  const row = data?.[0];
  return {
    existsAlready: row?.exists_already ?? false,
    provider: row?.provider ?? null,
    confirmed: row?.confirmed ?? false,
  };
}

/**
 * Step 1 of signup. Creates the account but never returns a session --
 * with "Confirm email" enabled, Supabase withholds the session until
 * verifySignupOtp() succeeds. The profile row (and its LRN uniqueness
 * check) is created immediately by handle_new_user(), same as before.
 */
export async function startSignUp(
  name: string,
  email: string,
  password: string,
  lrn: string
): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: "student", lrn },
    },
  });

  if (error) {
    if (isDuplicateLrn(error)) {
      throw new Error("This LRN is already registered to another account.");
    }
    throw error;
  }

  if (data.session) {
    // Shouldn't happen once "Confirm email" is on -- guards against
    // silently skipping the OTP step if that Dashboard setting gets
    // toggled off later.
    throw new Error("Email confirmation isn't enabled on this project yet.");
  }
}

/** Step 2 of signup. Exchanges the 6-digit code for a real session. */
export async function verifySignupOtp(email: string, token: string): Promise<AppUser> {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) throw error;
  if (!data.user) throw new Error("Verification failed. Please try again.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found. Please contact canteen staff.");
  }

  return {
    id: data.user.id,
    email: data.user.email!,
    name: profile.name,
    role: profile.role,
    lrn: profile.lrn ?? undefined,
    createdAt: profile.created_at,
  };
}

export async function resendSignupOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw error;
}

export async function signIn(email: string, password: string): Promise<AppUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found. Please contact canteen staff.");
  }

  return {
    id: data.user.id,
    email: data.user.email!,
    name: profile.name,
    role: profile.role,
    lrn: profile.lrn ?? undefined,
    createdAt: profile.created_at,
  };
}

/**
 * Browser-based Google sign-in via Supabase's hosted OAuth flow. If this
 * Google account's email already matches a confirmed email/password
 * account, Supabase links them into the same underlying user by default --
 * that's desired here (one real person, one account), not a bug. This
 * function doesn't need special-case duplicate handling for that reason.
 */
export async function signInWithGoogle(): Promise<AppUser> {
  const redirectTo = AuthSession.makeRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error("Couldn't start Google sign-in. Please try again.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success" || !result.url) {
    throw new Error("Google sign-in was cancelled.");
  }

  const fragment = result.url.split("#")[1] ?? "";
  const params = new URLSearchParams(fragment);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (!access_token || !refresh_token) {
    throw new Error("Google sign-in failed. Please try again.");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (sessionError) throw sessionError;
  if (!sessionData.user) throw new Error("Google sign-in failed. Please try again.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", sessionData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found. Please contact canteen staff.");
  }

  return {
    id: sessionData.user.id,
    email: sessionData.user.email!,
    name: profile.name,
    role: profile.role,
    lrn: profile.lrn ?? undefined,
    createdAt: profile.created_at,
  };
}

export async function completeStudentProfile(lrn: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ lrn })
    .eq("id", userData.user.id);

  if (error) {
    if (isDuplicateLrn(error)) {
      throw new Error("This LRN is already registered to another account.");
    }
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error || !profile) return null;

  return {
    id: session.user.id,
    email: session.user.email!,
    name: profile.name,
    role: profile.role,
    lrn: profile.lrn ?? undefined,
    createdAt: profile.created_at,
  };
}

export async function updateProfileName(name: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { error } = await supabase.from("profiles").update({ name }).eq("id", userId);
  if (error) throw error;
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}