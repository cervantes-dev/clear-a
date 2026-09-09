export type UserRole = "student" | "staff";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string;
  lrn?: string;
  createdAt?: string;
}