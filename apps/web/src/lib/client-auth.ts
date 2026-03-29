import { fetchApiJson, withJsonRequest } from "@/lib/api-client";

export type UserRole = "USER" | "ADMIN";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  stream: {
    code: string;
    name: string;
  } | null;
};

export type AuthSessionResponse = {
  user: AuthUser;
};

export type AuthOptionsResponse = {
  streams: Array<{
    code: string;
    name: string;
  }>;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  streamCode: string;
};

async function fetchAuth<T>(path: string, init?: RequestInit): Promise<T> {
  return fetchApiJson<T>(
    `/auth${path}`,
    withJsonRequest(init),
    "Authentication request failed.",
  );
}

export function getAuthOptions() {
  return fetchAuth<AuthOptionsResponse>("/options");
}

export function getCurrentUser() {
  return fetchAuth<AuthSessionResponse>("/me");
}

export function registerUser(payload: RegisterPayload) {
  return fetchAuth<AuthSessionResponse>("/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: LoginPayload) {
  return fetchAuth<AuthSessionResponse>("/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logoutUser() {
  await fetchAuth<{ success: boolean }>("/logout", {
    method: "POST",
  });
}
