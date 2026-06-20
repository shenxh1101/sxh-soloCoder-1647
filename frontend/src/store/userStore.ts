import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo, LoginParams, LoginResult } from '@/types'
import { login, logout, getProfile, refreshToken as apiRefreshToken } from '@/api/auth'
import { getToken, setToken, removeToken, setRefreshToken, removeRefreshToken, setTokenExpires, removeTokenExpires } from '@/utils/auth'

interface UserState {
  token: string | null
  refreshTokenValue: string | null
  userInfo: UserInfo | null
  permissions: string[]
  isLoggedIn: boolean
  loading: boolean
  login: (params: LoginParams) => Promise<LoginResult>
  logout: () => Promise<void>
  fetchUserInfo: () => Promise<UserInfo>
  refreshToken: () => Promise<{ token: string; refreshToken: string; expiresIn: number } | null>
  setUserInfo: (userInfo: UserInfo) => void
  clearUserState: () => void
  hasPermission: (permission: string | string[]) => boolean
}

const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      token: getToken(),
      refreshTokenValue: null,
      userInfo: null,
      permissions: [],
      isLoggedIn: !!getToken(),
      loading: false,

      login: async (params: LoginParams) => {
        set({ loading: true })
        try {
          const result = await login(params)
          setToken(result.token, params.remember)
          setRefreshToken(result.refreshToken, params.remember)
          setTokenExpires(result.expiresIn, params.remember)
          set({
            token: result.token,
            refreshTokenValue: result.refreshToken,
            userInfo: result.userInfo,
            permissions: result.userInfo.permissions || [],
            isLoggedIn: true,
            loading: false
          })
          return result
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          await logout()
        } finally {
          get().clearUserState()
        }
      },

      fetchUserInfo: async () => {
        try {
          const userInfo = await getProfile()
          set({
            userInfo,
            permissions: userInfo.permissions || [],
            isLoggedIn: true
          })
          return userInfo
        } catch (error) {
          get().clearUserState()
          throw error
        }
      },

      refreshToken: async () => {
        const currentRefreshToken = get().refreshTokenValue
        if (!currentRefreshToken) {
          get().clearUserState()
          return null
        }
        try {
          const result = await apiRefreshToken()
          setToken(result.token)
          setRefreshToken(result.refreshToken)
          setTokenExpires(result.expiresIn)
          set({
            token: result.token,
            refreshTokenValue: result.refreshToken
          })
          return result
        } catch (error) {
          get().clearUserState()
          return null
        }
      },

      setUserInfo: (userInfo: UserInfo) => {
        set({
          userInfo,
          permissions: userInfo.permissions || []
        })
      },

      clearUserState: () => {
        removeToken()
        removeRefreshToken()
        removeTokenExpires()
        set({
          token: null,
          refreshTokenValue: null,
          userInfo: null,
          permissions: [],
          isLoggedIn: false
        })
      },

      hasPermission: (permission: string | string[]) => {
        const { permissions } = get()
        if (permissions.includes('*')) {
          return true
        }
        if (Array.isArray(permission)) {
          return permission.some(p => permissions.includes(p))
        }
        return permissions.includes(permission)
      }
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        token: state.token,
        refreshTokenValue: state.refreshTokenValue,
        userInfo: state.userInfo,
        permissions: state.permissions,
        isLoggedIn: state.isLoggedIn
      })
    }
  )
)

export default useUserStore
