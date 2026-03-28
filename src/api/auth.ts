import api, { setAccessToken } from "./axios";

export interface User {
  id: number;
  username: string;
  email: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
}

interface GoogleLoginResponse {
  user: { id: number; email: string; name: string };
  access: string;
  refresh: string;
}

export async function login(username: string, password: string): Promise<User> {
  const { data } = await api.post<LoginResponse>("/auth/token/", {
    username,
    password,
  });
  setAccessToken(data.access);
  return getMe();
}

export async function googleLogin(idToken: string): Promise<User> {
  const { data } = await api.post<GoogleLoginResponse>("/auth/google/", {
    id_token: idToken,
  });
  setAccessToken(data.access);
  return {
    id: data.user.id,
    username: data.user.name,
    email: data.user.email,
  };
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me/");
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout/");
  } finally {
    setAccessToken(null);
  }
}

export async function refreshToken(): Promise<string> {
  const { data } = await api.post<{ access: string }>(
    "/auth/token/refresh/cookie/"
  );
  setAccessToken(data.access);
  return data.access;
}
