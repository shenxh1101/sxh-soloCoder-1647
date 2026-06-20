import { useState, useEffect } from 'react'
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Breadcrumb,
  Badge,
  Space,
  Typography
} from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  DashboardOutlined,
  CloudOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  ProjectOutlined,
  MessageOutlined,
  BellOutlined,
  CheckSquareOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  NotificationOutlined,
  DownOutlined
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import useAppStore from '@/store'
import { menuConfig } from '@/router'
import { logout, getProfile } from '@/api/auth'
import { clearAuthStorage } from '@/utils/auth'
import type { MenuProps } from 'antd'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const iconMap: Record<string, React.ReactNode> = {
  HomeOutlined: <HomeOutlined />,
  DashboardOutlined: <DashboardOutlined />,
  CloudOutlined: <CloudOutlined />,
  UnorderedListOutlined: <UnorderedListOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  ProjectOutlined: <ProjectOutlined />,
  MessageOutlined: <MessageOutlined />,
  BellOutlined: <BellOutlined />,
  CheckSquareOutlined: <CheckSquareOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  SettingOutlined: <SettingOutlined />,
  UserOutlined: <UserOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />
}

interface MenuItem {
  key: string
  icon: string
  label: string
  hidden?: boolean
  children?: MenuItem[]
}

function BasicLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { collapsed, toggleCollapsed } = useAppStore()
  const [userInfo, setUserInfo] = useState<any>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const [notificationCount] = useState(5)

  useEffect(() => {
    const pathname = location.pathname
    setSelectedKeys([pathname])

    const parentKeys: string[] = []
    menuConfig.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.key))) {
        parentKeys.push(item.key)
      }
    })
    setOpenKeys(parentKeys)
  }, [location.pathname])

  useEffect(() => {
    if (!userInfo) {
      fetchUserInfo()
    }
  }, [userInfo])

  const fetchUserInfo = async () => {
    try {
      const info = await getProfile()
      setUserInfo(info)
    } catch (error) {
      console.error('Failed to fetch user info:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuthStorage()
      setUserInfo(null)
      navigate('/login')
    }
  }

  const buildMenuItems = (items: MenuItem[]): MenuProps['items'] => {
    return items
      .filter((item) => !item.hidden)
      .map((item) => {
        const result: any = {
          key: item.key,
          icon: iconMap[item.icon],
          label: item.label
        }

        if (item.children) {
          result.children = buildMenuItems(item.children)
        }

        return result
      })
  }

  const menuItems = buildMenuItems(menuConfig)

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
    setOpenKeys(keys)
  }

  const getBreadcrumbItems = () => {
    const items: { title: React.ReactNode }[] = [
      { title: <HomeOutlined onClick={() => navigate('/home')} style={{ cursor: 'pointer' }} /> }
    ]

    const findPath = (
      menuItems: MenuItem[],
      targetPath: string,
      path: { label: string; key: string }[] = []
    ): { label: string; key: string }[] | null => {
      for (const item of menuItems) {
        if (item.key === targetPath && !item.hidden) {
          return [...path, { label: item.label, key: item.key }]
        }
        if (item.children) {
          const result = findPath(item.children, targetPath, [
            ...path,
            { label: item.label, key: item.key }
          ])
          if (result) return result
        }
      }
      return null
    }

    const pathParts = location.pathname.split('/').filter(Boolean)
    let currentPath = ''

    for (let i = 0; i < pathParts.length; i++) {
      currentPath += '/' + pathParts[i]
      const menuPath = findPath(menuConfig, currentPath)
      if (menuPath && menuPath.length > 0) {
        const lastItem = menuPath[menuPath.length - 1]
        if (i === pathParts.length - 1) {
          items.push({ title: lastItem.label })
        } else {
          items.push({
            title: (
              <span onClick={() => navigate(lastItem.key)} style={{ cursor: 'pointer' }}>
                {lastItem.label}
              </span>
            )
          })
        }
      }
    }

    return items
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  const notificationItems: MenuProps['items'] = [
    {
      key: '1',
      label: (
        <Space direction="vertical" size={0} style={{ width: 280 }}>
          <Text strong>新的预警通知</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            水质检测异常，请及时处理
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            2分钟前
          </Text>
        </Space>
      )
    },
    {
      type: 'divider'
    },
    {
      key: '2',
      label: (
        <Space direction="vertical" size={0} style={{ width: 280 }}>
          <Text strong>审批提醒</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            您有一条新的审批待处理
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            10分钟前
          </Text>
        </Space>
      )
    },
    {
      type: 'divider'
    },
    {
      key: '3',
      label: (
        <Text style={{ textAlign: 'center', display: 'block', color: '#1677ff' }}>
          查看全部
        </Text>
      )
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000
        }}
      >
        <div
          style={{
            height: 64,
            margin: '16px 16px',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            overflow: 'hidden'
          }}
        >
          {collapsed ? (
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>W</span>
          ) : (
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              水环境管理系统
            </span>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          items={menuItems}
          onClick={handleMenuClick}
          onOpenChange={handleOpenChange}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 16px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 999,
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
          }}
        >
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
              style={{ fontSize: '16px', width: 48, height: 48 }}
            />
            <Breadcrumb items={getBreadcrumbItems()} />
          </Space>

          <Space size={16}>
            <Dropdown menu={{ items: notificationItems }} placement="bottomRight">
              <Badge count={notificationCount} size="small">
                <Button
                  type="text"
                  icon={<NotificationOutlined />}
                  style={{ width: 48, height: 48 }}
                />
              </Badge>
            </Dropdown>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer', padding: '0 8px' }}>
                <Avatar
                  size="small"
                  src={userInfo?.avatar}
                  icon={!userInfo?.avatar && <UserOutlined />}
                />
                {!collapsed && (
                  <>
                    <span>{userInfo?.nickname || userInfo?.username || '用户'}</span>
                    <DownOutlined style={{ fontSize: 12 }} />
                  </>
                )}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            margin: '16px',
            padding: 0,
            minHeight: 'calc(100vh - 96px)',
            background: '#f0f2f5',
            borderRadius: 8
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default BasicLayout
