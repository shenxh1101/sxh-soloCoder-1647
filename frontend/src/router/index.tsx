import { Navigate, type RouteObject } from 'react-router-dom'
import BasicLayout from '@/layouts/BasicLayout'
import Home from '@/pages/Home'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import Alert from '@/pages/Alert'
import Approval from '@/pages/Approval'
import Complaint from '@/pages/Complaint'
import Project from '@/pages/Project'
import WaterBodyDetail from '@/pages/WaterBody/Detail'
import UserManagement from '@/pages/system/UserManagement'
import SystemConfig from '@/pages/system/SystemConfig'
import JobManagement from '@/pages/system/JobManagement'
import TaskManagement from '@/pages/TaskManagement'
import ReportManagement from '@/pages/ReportManagement'
import { AuthGuard, GuestGuard } from './guards'

export const menuConfig = [
  {
    key: '/home',
    icon: 'HomeOutlined',
    label: '首页'
  },
  {
    key: '/dashboard',
    icon: 'DashboardOutlined',
    label: '核心看板'
  },
  {
    key: '/water-body',
    icon: 'CloudOutlined',
    label: '水体管理',
    children: [
      {
        key: '/water-body/list',
        icon: 'UnorderedListOutlined',
        label: '水体列表'
      },
      {
        key: '/water-body/detail',
        icon: 'FileTextOutlined',
        label: '水体详情',
        hidden: true
      }
    ]
  },
  {
    key: '/project',
    icon: 'ProjectOutlined',
    label: '项目管理'
  },
  {
    key: '/complaint',
    icon: 'MessageOutlined',
    label: '投诉管理'
  },
  {
    key: '/alert',
    icon: 'BellOutlined',
    label: '预警管理'
  },
  {
    key: '/approval',
    icon: 'CheckSquareOutlined',
    label: '审批管理'
  },
  {
    key: '/task',
    icon: 'FileTextOutlined',
    label: '任务管理'
  },
  {
    key: '/report',
    icon: 'BarChartOutlined',
    label: '报告管理'
  },
  {
    key: '/system',
    icon: 'SettingOutlined',
    label: '系统管理',
    children: [
      {
        key: '/system/user',
        icon: 'UserOutlined',
        label: '用户管理'
      },
      {
        key: '/system/config',
        icon: 'SettingOutlined',
        label: '系统配置'
      },
      {
        key: '/system/job',
        icon: 'ClockCircleOutlined',
        label: '定时任务'
      }
    ]
  }
]

const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <GuestGuard>
        <Login />
      </GuestGuard>
    )
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <BasicLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/home" replace />
      },
      {
        path: 'home',
        element: <Home />
      },
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'water-body',
        children: [
          {
            index: true,
            element: <Navigate to="/water-body/list" replace />
          },
          {
            path: 'list',
            element: (
              <AuthGuard permissions="water:view">
                <div>水体列表页面（待实现）</div>
              </AuthGuard>
            )
          },
          {
            path: 'detail/:id',
            element: (
              <AuthGuard permissions="water:view">
                <WaterBodyDetail />
              </AuthGuard>
            )
          }
        ]
      },
      {
        path: 'project',
        element: (
          <AuthGuard permissions="project:view">
            <Project />
          </AuthGuard>
        )
      },
      {
        path: 'complaint',
        element: (
          <AuthGuard permissions="complaint:view">
            <Complaint />
          </AuthGuard>
        )
      },
      {
        path: 'alert',
        element: (
          <AuthGuard permissions="alert:view">
            <Alert />
          </AuthGuard>
        )
      },
      {
        path: 'approval',
        element: (
          <AuthGuard permissions="approval:view">
            <Approval />
          </AuthGuard>
        )
      },
      {
        path: 'task',
        element: (
          <AuthGuard permissions="task:view">
            <TaskManagement />
          </AuthGuard>
        )
      },
      {
        path: 'report',
        element: (
          <AuthGuard permissions="report:view">
            <ReportManagement />
          </AuthGuard>
        )
      },
      {
        path: 'system',
        children: [
          {
            index: true,
            element: <Navigate to="/system/user" replace />
          },
          {
            path: 'user',
            element: (
              <AuthGuard permissions="system:user:view">
                <UserManagement />
              </AuthGuard>
            )
          },
          {
            path: 'config',
            element: (
              <AuthGuard permissions="system:config:view">
                <SystemConfig />
              </AuthGuard>
            )
          },
          {
            path: 'job',
            element: (
              <AuthGuard permissions="system:job:view">
                <JobManagement />
              </AuthGuard>
            )
          }
        ]
      }
    ]
  },
  {
    path: '/403',
    element: (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <h1>403</h1>
        <p>抱歉，您没有权限访问此页面</p>
      </div>
    )
  },
  {
    path: '*',
    element: <Navigate to="/home" replace />
  }
]

export default routes
