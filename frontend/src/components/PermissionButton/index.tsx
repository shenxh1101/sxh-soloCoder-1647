import { Button, type ButtonProps } from 'antd'
import useUserStore from '@/store/userStore'

interface PermissionButtonProps extends ButtonProps {
  permission?: string | string[]
  hideWhenNoPermission?: boolean
}

function PermissionButton({
  permission,
  hideWhenNoPermission = true,
  disabled,
  children,
  ...restProps
}: PermissionButtonProps) {
  const { hasPermission } = useUserStore()

  if (permission && !hasPermission(permission)) {
    if (hideWhenNoPermission) {
      return null
    }
    return (
      <Button disabled {...restProps}>
        {children}
      </Button>
    )
  }

  return (
    <Button disabled={disabled} {...restProps}>
      {children}
    </Button>
  )
}

export default PermissionButton
