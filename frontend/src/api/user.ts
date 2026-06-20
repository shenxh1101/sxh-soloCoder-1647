import { request } from '@/utils/request'
import type { UserInfo, UserListParams, PageResult, UserFormData } from '@/types'

export function getUserList(params: UserListParams): Promise<PageResult<UserInfo>> {
  return request<PageResult<UserInfo>>({
    url: '/api/user/list',
    method: 'get',
    params
  })
}

export function getUserDetail(id: number): Promise<UserInfo> {
  return request<UserInfo>({
    url: `/api/user/${id}`,
    method: 'get'
  })
}

export function createUser(data: UserFormData): Promise<UserInfo> {
  return request<UserInfo>({
    url: '/api/user',
    method: 'post',
    data
  })
}

export function updateUser(id: number, data: Partial<UserFormData>): Promise<UserInfo> {
  return request<UserInfo>({
    url: `/api/user/${id}`,
    method: 'put',
    data
  })
}

export function deleteUser(id: number): Promise<void> {
  return request<void>({
    url: `/api/user/${id}`,
    method: 'delete'
  })
}

export function updateUserStatus(id: number, status: number): Promise<void> {
  return request<void>({
    url: `/api/user/${id}/status`,
    method: 'patch',
    data: { status }
  })
}
