import { useState } from 'react'
import { Form, Input, Button, Checkbox, Card, Typography, Alert, Spin } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import useUserStore from '@/store/userStore'
import type { LoginParams } from '@/types'

const { Title } = Typography

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form] = Form.useForm()
  const [error, setError] = useState<string>('')
  const { login, loading } = useUserStore()

  const from = (location.state as { from?: string })?.from || '/'

  const handleSubmit = async (values: LoginParams) => {
    setError('')
    try {
      await login(values)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || '登录失败，请检查用户名和密码')
      } else {
        setError('登录失败，请检查用户名和密码')
      }
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            用户登录
          </Title>
          <Typography.Text type="secondary">
            请输入您的账号和密码
          </Typography.Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError('')}
          />
        )}

        <Form
          form={form}
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleSubmit}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住我</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              disabled={loading}
            >
              {loading ? <Spin size="small" /> : '登录'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Login
