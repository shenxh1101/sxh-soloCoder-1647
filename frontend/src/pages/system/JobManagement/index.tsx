import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  message,
  Space,
  Card,
  Tag,
  Switch,
  List,
  Typography,
  Statistic,
  Row,
  Col,
  Descriptions
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  HistoryOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import PermissionButton from '@/components/PermissionButton'
import {
  getJobList,
  controlJob,
  getJobLogs
} from '@/api/config'
import type { JobInfo } from '@/types'
import dayjs from 'dayjs'

const { Title, Text } = Typography

function JobManagement() {
  const [loading, setLoading] = useState(false)
  const [jobList, setJobList] = useState<JobInfo[]>([])
  const [logsVisible, setLogsVisible] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [jobLogs, setJobLogs] = useState<{ time: string; content: string; success: boolean }[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    running: { color: 'green', text: '运行中', icon: <PlayCircleOutlined /> },
    stopped: { color: 'default', text: '已停止', icon: <PauseCircleOutlined /> },
    error: { color: 'red', text: '异常', icon: <ExclamationCircleOutlined /> }
  }

  const fetchJobList = async () => {
    setLoading(true)
    try {
      const result = await getJobList()
      setJobList(result)
    } catch (error) {
      message.error('获取任务列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobList()
  }, [])

  const handleToggleJob = async (jobId: string, currentStatus: string) => {
    const action = currentStatus === 'running' ? 'stop' : 'start'
    try {
      await controlJob({ jobId, action })
      message.success(`任务${action === 'start' ? '启动' : '停止'}成功`)
      fetchJobList()
    } catch (error) {
      message.error(`任务${action === 'start' ? '启动' : '停止'}失败`)
      fetchJobList()
    }
  }

  const handleExecuteJob = async (jobId: string) => {
    try {
      await controlJob({ jobId, action: 'execute' })
      message.success('任务执行成功')
      fetchJobList()
    } catch (error) {
      message.error('任务执行失败')
    }
  }

  const handleViewLogs = async (jobId: string) => {
    setCurrentJobId(jobId)
    setLogsVisible(true)
    fetchJobLogs(jobId)
  }

  const fetchJobLogs = async (jobId: string) => {
    setLogsLoading(true)
    try {
      const result = await getJobLogs(jobId)
      setJobLogs(result)
    } catch (error) {
      message.error('获取任务日志失败')
    } finally {
      setLogsLoading(false)
    }
  }

  const columns: ColumnsType<JobInfo> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <Space>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({record.id})
          </Text>
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Cron表达式',
      dataIndex: 'cron',
      key: 'cron',
      width: 180,
      render: (cron) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {cron}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const info = statusMap[status]
        return (
          <Space>
            {info.icon}
            <Tag color={info.color}>{info.text}</Tag>
          </Space>
        )
      }
    },
    {
      title: '上次执行',
      dataIndex: 'lastExecuteTime',
      key: 'lastExecuteTime',
      width: 180,
      render: (time: string, record) => (
        <Space>
          {time && dayjs(time).format('YYYY-MM-DD HH:mm:ss')}
          {record.lastExecuteResult && (
            record.lastExecuteResult === 'success'
              ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
              : <CloseCircleOutlined style={{ color: '#f5222d' }} />
          )}
        </Space>
      )
    },
    {
      title: '下次执行',
      dataIndex: 'nextExecuteTime',
      key: 'nextExecuteTime',
      width: 180,
      render: (time: string) => (
        <Space>
          <ClockCircleOutlined />
          {time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'}
        </Space>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Switch
            checked={record.status === 'running'}
            checkedChildren="运行"
            unCheckedChildren="停止"
            onChange={() => handleToggleJob(record.id, record.status)}
            size="small"
          />
          <PermissionButton
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            permission="system:job:execute"
            onClick={() => handleExecuteJob(record.id)}
          >
            执行
          </PermissionButton>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewLogs(record.id)}
          >
            日志
          </Button>
        </Space>
      )
    }
  ]

  const currentJob = jobList.find((j) => j.id === currentJobId)

  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ margin: '0 0 16px 0' }}>
        <SettingOutlined /> 定时任务管理
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="任务总数"
                value={jobList.length}
                prefix={<SettingOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="运行中"
                value={jobList.filter((j) => j.status === 'running').length}
                prefix={<PlayCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="已停止"
                value={jobList.filter((j) => j.status === 'stopped').length}
                prefix={<PauseCircleOutlined />}
                valueStyle={{ color: '#8c8c8c' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="异常"
                value={jobList.filter((j) => j.status === 'error').length}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={fetchJobList}>
              刷新
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={jobList}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={false}
        />
      </Card>

      <Modal
        title="任务执行日志"
        open={logsVisible}
        onCancel={() => setLogsVisible(false)}
        footer={[
          <Button key="close" onClick={() => setLogsVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {currentJob && (
          <div>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="任务名称">{currentJob.name}</Descriptions.Item>
              <Descriptions.Item label="任务ID">{currentJob.id}</Descriptions.Item>
              <Descriptions.Item label="Cron表达式">{currentJob.cron}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[currentJob.status]?.color}>
                  {statusMap[currentJob.status]?.text}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            <div
              style={{
                maxHeight: 400,
                overflowY: 'auto',
                background: '#1e1e1e',
                padding: 16,
                borderRadius: 4
              }}
            >
              {logsLoading ? (
                <div style={{ textAlign: 'center', color: '#888' }}>加载中...</div>
              ) : jobLogs.length > 0 ? (
                <List
                  size="small"
                  dataSource={jobLogs}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <Space>
                        <Text style={{ color: '#888', fontSize: 12, fontFamily: 'monospace' }}>
                          {dayjs(item.time).format('YYYY-MM-DD HH:mm:ss')}
                        </Text>
                        {item.success ? (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        ) : (
                          <CloseCircleOutlined style={{ color: '#f5222d' }} />
                        )}
                        <Text style={{ color: item.success ? '#52c41a' : '#f5222d', fontFamily: 'monospace' }}>
                          {item.content}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#888' }}>暂无日志记录</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default JobManagement
