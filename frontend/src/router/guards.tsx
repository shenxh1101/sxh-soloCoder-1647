import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import useUserStore from '@/store/userStore'
import { isTokenAboutToExpire } from '@/utils/auth'

interface AuthGuardProps {
  children: React.ReactNode
  permissions?: string | string[]
}

export function AuthGuard({ children, permissions }: AuthGuardProps) {
  const location = useLocation()
  const { isLoggedIn, userInfo, fetchUserInfo, refreshToken, hasPermission } = useUserStore()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!isLoggedIn) {
          setAuthorized(false)
          setLoading(false)
          return
        }

        if (isTokenAboutToExpire()) {
          await refreshToken()
        }

        if (!userInfo) {
          await fetchUserInfo()
        }

        if (permissions && !hasPermission(permissions)) {
          setAuthorized(false)
          setLoading(false)
          return
        }

        setAuthorized(true)
      } catch (error) {
        setAuthorized(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [isLoggedIn, userInfo, permissions, fetchUserInfo, refreshToken, hasPermission])

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  if (!authorized) {
    if (!isLoggedIn) {
      return <Navigate to="/login" state={{ from: location.pathname }} replace />
    }
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useUserStore()
  const location = useLocation()

  if (isLoggedIn) {
    const from = (location.state as { from?: string })?.from || '/'
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}

export function withAuthGuard(
  Component: React.ComponentType,
  permissions?: string | string[]
) {
  return function WrappedComponent(props: any) {
    return (
      <AuthGuard permissions={permissions}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}

export function withGuestGuard(Component: React.ComponentType) {
  return function WrappedComponent(props: any) {
    return (
      <GuestGuard>
        <Component {...props} />
      </GuestGuard>
    )
  }
}
