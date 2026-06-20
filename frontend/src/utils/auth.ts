const TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const TOKEN_EXPIRES_KEY = 'token_expires'

export function setToken(token: string, remember?: boolean): void {
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

export function setRefreshToken(refreshToken: string, remember?: boolean): void {
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY)
}

export function removeRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function setTokenExpires(expiresIn: number, remember?: boolean): void {
  const expiresAt = Date.now() + expiresIn * 1000
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString())
}

export function getTokenExpires(): number | null {
  const expiresAt = localStorage.getItem(TOKEN_EXPIRES_KEY) || sessionStorage.getItem(TOKEN_EXPIRES_KEY)
  return expiresAt ? parseInt(expiresAt, 10) : null
}

export function removeTokenExpires(): void {
  localStorage.removeItem(TOKEN_EXPIRES_KEY)
  sessionStorage.removeItem(TOKEN_EXPIRES_KEY)
}

export function isTokenExpired(): boolean {
  const expiresAt = getTokenExpires()
  if (!expiresAt) {
    return true
  }
  return Date.now() >= expiresAt
}

export function isTokenAboutToExpire(threshold: number = 300): boolean {
  const expiresAt = getTokenExpires()
  if (!expiresAt) {
    return true
  }
  return Date.now() + threshold * 1000 >= expiresAt
}

export function clearAuthStorage(): void {
  removeToken()
  removeRefreshToken()
  removeTokenExpires()
}

export function decodeToken(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    return null
  }
}

export function getTokenExpiration(token: string): number | null {
  const decoded = decodeToken(token)
  if (decoded && decoded.exp) {
    return decoded.exp * 1000
  }
  return null
}
