import { useState, useEffect, useMemo } from 'react'
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
  Typography,
  Divider,
  List,
  message,
  Spin,
  Descriptions,
  Statistic,
  Image
} from 'antd'
import {
  MessageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  PhoneOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import {
  getComplaintList,
  getComplaintDetail,
  handleComplaint,
  getComplaintStats
} from '@/api/complaint'
import type { Complaint, ComplaintDetail, ComplaintListParams, ComplaintStats } from '@/types'

const { Title, Text, Paragraph } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input
const { Option } = Select

function ComplaintPage() {
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [data, setData] = useState<Complaint[]>([])
  const [stats, setStats] = useState<ComplaintStats | null>(null)
  const [detail, setDetail] = useState<ComplaintDetail | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [handleVisible, setHandleVisible] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [form] = Form.useForm()
  const [filterForm] = Form.useForm()

  const typeMap: Record<string, string> = {
    water_quality: '水质问题',
    pollution: '污染问题',
    facility: '设施问题',
    other: '其他问题'
  }

  const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    pending: { color: 'warning', text: '待处理', icon: <ClockCircleOutlined /> },
    processing: { color: 'processing', text: '处理中', icon: <ExclamationCircleOutlined /> },
    resolved: { color: 'success', text: '已解决', icon: <CheckCircleOutlined /> },
    closed: { color: 'default', text: '已关闭', icon: <CheckCircleOutlined /> }
  }

  const priorityMap: Record<string, { color: string; text: string }> = {
    low: { color: 'blue', text: '低' },
    medium: { color: 'gold', text: '中' },
    high: { color: 'red', text: '高' }
  }

  useEffect(() => {
    fetchData()
    fetchStats()
  }, [])

  const fetchData = async (params?: Partial<ComplaintListParams>) => {
    setLoading(true)
    try {
      const result = await getComplaintList({
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
      const result = await getComplaintStats()
      setStats(result)
    } catch (error) {
      console.error('Failed to fetch complaint stats:', error)
    }
  }

  const fetchDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const result = await getComplaintDetail(id)
      setDetail(result)
      setDetailVisible(true)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSearch = (values: any) => {
    const params: Partial<ComplaintListParams> = {
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

  const openHandleModal = (record: Complaint) => {
    setDetail(record as ComplaintDetail)
    form.setFieldsValue({
      id: record.id,
      action: 'process',
      remark: '',
      handlerName: ''
    })
    setHandleVisible(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      await handleComplaint({
        id: values.id,
        action: values.action,
        remark: values.remark,
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

  const typeChartOption = useMemo(() => {
    if (!stats?.typeDistribution) return {}

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '投诉类型分布',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['60%', '50%'],
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          data: stats.typeDistribution.map((item) => ({
            value: item.value,
            name: typeMap[item.name] || item.name
          }))
        }
      ]
    }
  }, [stats])

  const trendChartOption = useMemo(() => {
    if (!stats?.dailyTrend) return {}

    const dates = stats.dailyTrend.map((item) => item.date)
    const counts = stats.dailyTrend.map((item) => item.count)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        type: 'value',
        minInterval: 1
      },
      series: [
        {
          name: '投诉数量',
          type: 'bar',
          data: counts,
          barWidth: '50%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#1890ff' },
                { offset: 1, color: '#722ed1' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          }
        }
      ]
    }
  }, [stats])

  const columns = [
    {
      title: '投诉编号',
      dataIndex: 'code',
      key: 'code',
      width: 140
    },
    {
      title: '投诉标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '投诉类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => typeMap[type] || type
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => {
        const info = priorityMap[priority]
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '关联水体',
      dataIndex: 'waterBodyName',
      key: 'waterBodyName',
      render: (text: string) => text || '-'
    },
    {
      title: '所在地区',
      dataIndex: 'province',
      key: 'province',
      render: (_: any, record: Complaint) => `${record.province} ${record.city}`
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
      title: '投诉人',
      dataIndex: 'reporterName',
      key: 'reporterName',
      render: (text: string, record: Complaint) =>
        record.anonymous ? '匿名' : text
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
      render: (_: any, record: Complaint) => (
        <Space>
          <Button type="link" size="small" onClick={() => fetchDetail(record.id)}>
            详情
          </Button>
          {(record.status === 'pending' || record.status === 'processing') && (
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
        <MessageOutlined /> 投诉管理
      </Title>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="投诉总数"
                value={stats.total}
                prefix={<MessageOutlined />}
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
                title="今日新增"
                value={stats.todayCount}
                prefix={<MessageOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="平均处理时长"
                value={stats.avgHandleTime}
                suffix="小时"
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="投诉类型分布" size="small">
            <ReactECharts option={typeChartOption} style={{ height: 250 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="近7天投诉趋势" size="small">
            <ReactECharts option={trendChartOption} style={{ height: 250 }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Form form={filterForm} layout="inline" onFinish={handleSearch} style={{ flexWrap: 'wrap' }}>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="请输入关键词" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="type" label="投诉类型">
            <Select placeholder="请选择" style={{ width: 140 }} allowClear>
              <Option value="water_quality">水质问题</Option>
              <Option value="pollution">污染问题</Option>
              <Option value="facility">设施问题</Option>
              <Option value="other">其他问题</Option>
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
          <Form.Item name="priority" label="优先级">
            <Select placeholder="请选择" style={{ width: 140 }} allowClear>
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
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
        title="投诉详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <Spin spinning={detailLoading}>
          {detail && (
            <div>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="投诉编号">{detail.code}</Descriptions.Item>
                <Descriptions.Item label="投诉标题">{detail.title}</Descriptions.Item>
                <Descriptions.Item label="投诉类型">
                  {typeMap[detail.type] || detail.type}
                </Descriptions.Item>
                <Descriptions.Item label="优先级">
                  <Tag color={priorityMap[detail.priority].color}>
                    {priorityMap[detail.priority].text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="关联水体">
                  {detail.waterBodyName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusMap[detail.status].color}>
                    {statusMap[detail.status].text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="所在地区">
                  <EnvironmentOutlined /> {detail.province} {detail.city}
                </Descriptions.Item>
                <Descriptions.Item label="详细地址">{detail.location}</Descriptions.Item>
                <Descriptions.Item label="投诉人">
                  <UserOutlined /> {detail.anonymous ? '匿名' : detail.reporterName}
                </Descriptions.Item>
                <Descriptions.Item label="联系电话">
                  <PhoneOutlined /> {detail.anonymous ? '匿名' : detail.reporterPhone}
                </Descriptions.Item>
                <Descriptions.Item label="处理人">{detail.handlerName || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{detail.createdAt}</Descriptions.Item>
                <Descriptions.Item label="投诉内容" span={2}>
                  <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {detail.description}
                  </Paragraph>
                </Descriptions.Item>
              </Descriptions>

              {detail.images && detail.images.length > 0 && (
                <>
                  <Divider orientation="left">投诉图片</Divider>
                  <Image.PreviewGroup>
                    <Row gutter={[8, 8]}>
                      {detail.images.map((img, index) => (
                        <Col key={index} xs={12} sm={8} md={6}>
                          <Image
                            src={img}
                            width="100%"
                            height={120}
                            style={{ objectFit: 'cover', borderRadius: 4 }}
                          />
                        </Col>
                      ))}
                    </Row>
                  </Image.PreviewGroup>
                </>
              )}

              {detail.handleHistory && detail.handleHistory.length > 0 && (
                <>
                  <Divider orientation="left">处理记录</Divider>
                  <List
                    size="small"
                    dataSource={detail.handleHistory}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              <Text strong>{item.operator}</Text>
                              <Text type="secondary">{item.action}</Text>
                            </Space>
                          }
                          description={
                            <div>
                              <div>{item.remark}</div>
                              {item.images && item.images.length > 0 && (
                                <Image.PreviewGroup>
                                  <Row gutter={[4, 4]} style={{ marginTop: 8 }}>
                                    {item.images.map((img, index) => (
                                      <Col key={index} span={4}>
                                        <Image
                                          src={img}
                                          width="100%"
                                          height={48}
                                          style={{ objectFit: 'cover', borderRadius: 2 }}
                                        />
                                      </Col>
                                    ))}
                                  </Row>
                                </Image.PreviewGroup>
                              )}
                            </div>
                          }
                        />
                        <div style={{ fontSize: 12, color: '#999', alignSelf: 'flex-start' }}>
                          {item.time}
                        </div>
                      </List.Item>
                    )}
                  />
                </>
              )}
            </div>
          )}
        </Spin>
      </Modal>

      <Modal
        title="处理投诉"
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
              <Option value="close">关闭投诉</Option>
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
            name="remark"
            label="处理说明"
            rules={[{ required: true, message: '请输入处理说明' }]}
          >
            <TextArea rows={4} placeholder="请输入处理说明" />
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

export default ComplaintPage
