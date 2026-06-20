import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  Typography,
  Divider,
  List,
  message,
  Spin,
  Descriptions
} from 'antd'
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import {
  getAlertList,
  getAlertDetail,
  handleAlert,
  getAlertStats
} from '@/api/alert'
import type { Alert, AlertDetail, AlertListParams, AlertStats } from '@/types'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input
const { Option } = Select

function AlertPage() {
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [data, setData] = useState<Alert[]>([])
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [detail, setDetail] = useState<AlertDetail | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [handleVisible, setHandleVisible] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [form] = Form.useForm()
  const [filterForm] = Form.useForm()

  const levelMap: Record<string, { color: string; text: string }> = {
    low: { color: 'blue', text: '低' },
    medium: { color: 'gold', text: '中' },
    high: { color: 'orange', text: '高' },
    critical: { color: 'red', text: '严重' }
  }

  const typeMap: Record<string, string> = {
    water_quality: '水质异常',
    outlet: '排污口异常',
    project: '项目异常',
    complaint: '投诉预警'
  }

  const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    pending: { color: 'warning', text: '待处理', icon: <ClockCircleOutlined /> },
    processing: { color: 'processing', text: '处理中', icon: <ExclamationCircleOutlined /> },
    resolved: { color: 'success', text: '已解决', icon: <CheckCircleOutlined /> },
    closed: { color: 'default', text: '已关闭', icon: <CloseCircleOutlined /> }
  }

  useEffect(() => {
    fetchData()
    fetchStats()
  }, [])

  const fetchData = async (params?: Partial<AlertListParams>) => {
    setLoading(true)
    try {
      const result = await getAlertList({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        ...params
      })
      setData(result.list)
      setPagination((prev) => ({ ...prev, total: result.total }))
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const result = await getAlertStats()
      setStats(result)
    } catch (error) {
      console.error('Failed to fetch alert stats:', error)
    }
  }

  const fetchDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const result = await getAlertDetail(id)
      setDetail(result)
      setDetailVisible(true)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSearch = (values: any) => {
    const params: Partial<AlertListParams> = {
      ...values
    }
    if (values.dateRange) {
      params.startDate = values.dateRange[0]?.format('YYYY-MM-DD')
      params.endDate = values.dateRange[1]?.format('YYYY-MM-DD')
    }
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchData(params)
  }

  const handleReset = () => {
    filterForm.resetFields()
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchData()
  }

  const handleTableChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({ ...prev, current: page, pageSize }))
    fetchData({ pageNum: page, pageSize })
  }

  const openHandleModal = (record: Alert) => {
    setDetail(record as AlertDetail)
    form.setFieldsValue({
      id: record.id,
      handlerName: '',
      handleResult: ''
    })
    setHandleVisible(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      await handleAlert({
        id: values.id,
        action: values.action,
        handleResult: values.handleResult,
        handlerName: values.handlerName
      })
      message.success('处理成功')
      setHandleVisible(false)
      fetchData()
      fetchStats()
    } catch (error) {
      message.error('处理失败')
    }
  }

  const columns = [
    {
      title: '预警编号',
      dataIndex: 'code',
      key: 'code',
      width: 140
    },
    {
      title: '预警标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '预警级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => {
        const info = levelMap[level]
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '预警类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => typeMap[type] || type
    },
    {
      title: '关联水体',
      dataIndex: 'waterBodyName',
      key: 'waterBodyName',
      ellipsis: true
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const info = statusMap[status]
        return (
          <Tag color={info.color}>
            {info.icon} {info.text}
          </Tag>
        )
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Alert) => (
        <Space>
          <Button type="link" size="small" onClick={() => fetchDetail(record.id)}>
            详情
          </Button>
          {record.status === 'pending' && (
            <Button type="primary" size="small" onClick={() => openHandleModal(record)}>
              处理
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ margin: '0 0 16px 0' }}>
        <BellOutlined /> 预警管理
      </Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="预警总数"
                value={stats.total}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="待处理"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="处理中"
                value={stats.processing}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="已解决"
                value={stats.resolved}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="严重预警"
                value={stats.critical}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="今日新增"
                value={stats.todayCount}
                prefix={<BellOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card style={{ marginBottom: 16 }}>
        <Form
          form={filterForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ flexWrap: 'wrap' }}
        >
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="请输入关键词" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="level" label="预警级别">
            <Select placeholder="请选择" style={{ width: 140 }} allowClear>
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
              <Option value="critical">严重</Option>
            </Select>
          </Form.Item>
          <Form.Item name="type" label="预警类型">
            <Select placeholder="请选择" style={{ width: 140 }} allowClear>
              <Option value="water_quality">水质异常</Option>
              <Option value="outlet">排污口异常</Option>
              <Option value="project">项目异常</Option>
              <Option value="complaint">投诉预警</Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择" style={{ width: 140 }} allowClear>
              <Option value="pending">待处理</Option>
              <Option value="processing">处理中</Option>
              <Option value="resolved">已解决</Option>
              <Option value="closed">已关闭</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="时间范围">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Table
          loading={loading}
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: handleTableChange
          }}
        />
      </Card>

      <Modal
        title="预警详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        <Spin spinning={detailLoading}>
          {detail && (
            <div>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="预警编号">{detail.code}</Descriptions.Item>
                <Descriptions.Item label="预警标题">{detail.title}</Descriptions.Item>
                <Descriptions.Item label="预警级别">
                  <Tag color={levelMap[detail.level].color}>
                    {levelMap[detail.level].text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="预警类型">
                  {typeMap[detail.type] || detail.type}
                </Descriptions.Item>
                <Descriptions.Item label="关联水体">{detail.waterBodyName}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusMap[detail.status].color}>
                    {statusMap[detail.status].text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="指标">{detail.indicator || '-'}</Descriptions.Item>
                <Descriptions.Item label="阈值">{detail.threshold || '-'}</Descriptions.Item>
                <Descriptions.Item label="当前值">{detail.currentValue || '-'}</Descriptions.Item>
                <Descriptions.Item label="处理人">{detail.handlerName || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间" span={2}>
                  {detail.createdAt}
                </Descriptions.Item>
                <Descriptions.Item label="预警描述" span={2}>
                  {detail.description}
                </Descriptions.Item>
                {detail.handleResult && (
                  <Descriptions.Item label="处理结果" span={2}>
                    {detail.handleResult}
                  </Descriptions.Item>
                )}
              </Descriptions>

              <Divider orientation="left">处理记录</Divider>
              <List
                size="small"
                dataSource={detail.history || []}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{item.operator}</Text>
                          <Text type="secondary">{item.action}</Text>
                        </Space>
                      }
                      description={item.remark}
                    />
                    <div style={{ fontSize: 12, color: '#999' }}>{item.time}</div>
                  </List.Item>
                )}
              />
            </div>
          )}
        </Spin>
      </Modal>

      <Modal
        title="处理预警"
        open={handleVisible}
        onCancel={() => setHandleVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="action"
            label="处理动作"
            rules={[{ required: true, message: '请选择处理动作' }]}
          >
            <Select placeholder="请选择处理动作">
              <Option value="process">开始处理</Option>
              <Option value="resolve">标记解决</Option>
              <Option value="close">关闭预警</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="handlerName"
            label="处理人"
            rules={[{ required: true, message: '请输入处理人姓名' }]}
          >
            <Input placeholder="请输入处理人姓名" />
          </Form.Item>
          <Form.Item
            name="handleResult"
            label="处理结果"
            rules={[{ required: true, message: '请输入处理结果' }]}
          >
            <TextArea rows={4} placeholder="请输入处理结果描述" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setHandleVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                提交
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AlertPage
