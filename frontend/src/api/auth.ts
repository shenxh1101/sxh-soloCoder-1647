import { request } from '@/utils/request'
import type { LoginParams, LoginResult, UserInfo, ChangePasswordParams } from '@/types'

export function login(data: LoginParams): Promise<LoginResult> {
  return request<LoginResult>({
    url: '/api/auth/login',
    method: 'post',
    data
  })
}

export function logout(): Promise<void> {
  return request<void>({
    url: '/api/auth/logout',
    method: 'post'
  })
}

export function refreshToken(): Promise<{ token: string; refreshToken: string; expiresIn: number }> {
  return request<{ token: string; refreshToken: string; expiresIn: number }>({
    url: '/api/auth/refresh-token',
    method: 'post'
  })
}

export function getProfile(): Promise<UserInfo> {
  return request<UserInfo>({
    url: '/api/auth/profile',
    method: 'get'
  })
}

export function changePassword(data: ChangePasswordParams): Promise<void> {
  return request<void>({
    url: '/api/auth/change-password',
    method: 'post',
    data
  })
}
