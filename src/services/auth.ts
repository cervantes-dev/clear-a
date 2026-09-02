import { AppUser } from "../types/auth";
import { supabase } from "./supabase";

export async function signUp(
  name: string,
  email: string,
  password: string,
  studentId: string
): Promise<AppUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: "student", student_id: studentId },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error("Sign up failed. Please try again.");

  return {
    id: data.user.id,
    name,
    email,
    role: "student",
    studentId,
  };
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
    studentId: profile.student_id ?? undefined,
  };
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
    studentId: profile.student_id ?? undefined,
  };
}