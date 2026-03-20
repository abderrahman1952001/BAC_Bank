export type UserRole = 'USER' | 'ADMIN';

const ROLE_STORAGE_KEY = 'bb_role';

export function getClientRole(): UserRole {
  if (typeof window === 'undefined') {
    return 'USER';
  }

  const fromStorage = window.localStorage.getItem(ROLE_STORAGE_KEY);

  if (fromStorage === 'ADMIN' || fromStorage === 'USER') {
    return fromStorage;
  }

  const fromCookie = document.cookie
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${ROLE_STORAGE_KEY}=`));

  if (!fromCookie) {
    return 'USER';
  }

  const cookieValue = decodeURIComponent(fromCookie.split('=')[1] ?? 'USER');
  return cookieValue === 'ADMIN' ? 'ADMIN' : 'USER';
}

export function setClientRole(role: UserRole) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  document.cookie = `${ROLE_STORAGE_KEY}=${encodeURIComponent(role)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function clearClientRole() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ROLE_STORAGE_KEY);
  document.cookie = `${ROLE_STORAGE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}
