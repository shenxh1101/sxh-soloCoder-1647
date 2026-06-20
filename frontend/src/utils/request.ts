import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { message } from 'antd'
import { getToken, clearAuthStorage } from './auth'

interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

let isRefreshing = false
let pendingRequests: Array<() => void> = []

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

service.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data
    if (res.code !== 200) {
      message.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res.data
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<void>((resolve) => {
          pendingRequests.push(() => {
            resolve(service(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { default: useUserStore } = await import('@/store/userStore')
        const result = await useUserStore.getState().refreshToken()

        if (result) {
          pendingRequests.forEach((cb) => cb())
          pendingRequests = []
          return service(originalRequest)
        } else {
          clearAuthStorage()
          window.location.href = '/login'
          return Promise.reject(error)
        }
      } catch (refreshError) {
        clearAuthStorage()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (error.response?.status === 403) {
      message.error('您没有权限执行此操作')
    } else if (error.response?.status === 404) {
      message.error('请求的资源不存在')
    } else if (error.response?.status >= 500) {
      message.error('服务器错误，请稍后重试')
    } else {
      message.error(error.message || '网络错误')
    }

    return Promise.reject(error)
  }
)

export function request<T = any>(config: AxiosRequestConfig): Promise<T> {
  return service.request<T, T>(config)
}

export default service
