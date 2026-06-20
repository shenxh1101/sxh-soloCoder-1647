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
  Progress,
  InputNumber,
  Statistic
} from 'antd'
import {
  ProjectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  DollarOutlined,
  CalendarOutlined,
  BarChartOutlined,
  PlusOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import {
  getProjectList,
  getProjectDetail,
  getProjectProgress,
  submitProgress
} from '@/api/project'
import type { Project, ProjectDetail, ProjectListParams, ProgressRecord } from '@/types'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

function ProjectPage() {
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [data, setData] = useState<Project[]>([])
  const [detail, setDetail] = useState<ProjectDetail | null>(null)
  const [progressData, setProgressData] = useState<ProgressRecord[]>([])
  const [detailVisible, setDetailVisible] = useState(false)
  const [progressVisible, setProgressVisible] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [form] = Form.useForm()
  const [filterForm] = Form.useForm()

  const typeMap: Record<string, string> = {
    governance: '治理工程',
    monitoring: '监测设施',
    infrastructure: '基础设施',
    research: '科研项目'
  }

  const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    pending: { color: 'default', text: '待开始', icon: <ClockCircleOutlined /> },
    processing: { color: 'processing', text: '进行中', icon: <ProjectOutlined /> },
    suspended: { color: 'warning', text: '已暂停', icon: <PauseCircleOutlined /> },
    completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
    accepted: { color: 'blue', text: '已验收', icon: <CheckCircleOutlined /> }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async (params?: Partial<ProjectListParams>) => {
    setLoading(true)
    try {
      const result = await getProjectList({
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

  const fetchDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const [detailRes, progressRes] = await Promise.all([
        getProjectDetail(id),
        getProjectProgress(id)
      ])
      setDetail(detailRes)
      setProgressData(progressRes)
      setDetailVisible(true)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSearch = (values: any) => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchData(values)
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

  const openProgressModal = (record: Project) => {
    setDetail(record as ProjectDetail)
    form.setFieldsValue({
      projectId: record.id,
      progress: record.progress,
      cost: 0,
      remark: '',
      date: dayjs()
    })
    setProgressVisible(true)
  }

  const handleProgressSubmit = async (values: any) => {
    try {
      await submitProgress({
        projectId: values.projectId,
        progress: values.progress,
        cost: values.cost,
        remark: values.remark,
        date: values.date.format('YYYY-MM-DD')
      })
      message.success('进度提交成功')
      setProgressVisible(false)
      fetchData()
      if (detail) {
        fetchDetail(detail.id)
      }
    } catch (error) {
      message.error('进度提交失败')
    }
  }

  const progressChartOption = useMemo(() => {
    if (!progressData.length) return {}

    const dates = progressData.map((item) => item.date)
    const progress = progressData.map((item) => item.progress)
    const cost = progressData.map((item) => item.cost)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['进度(%)', '投入(万元)'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '12%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: [
        {
          type: 'value',
          name: '进度(%)',
          min: 0,
          max: 100
        },
        {
          type: 'value',
          name: '投入(万元)'
        }
      ],
      series: [
        {
          name: '进度(%)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: '#1890ff'
          },
          itemStyle: {
            color: '#1890ff'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#1890ff40' },
                { offset: 1, color: '#1890ff05' }
              ]
            }
          },
          data: progress
        },
        {
          name: '投入(万元)',
          type: 'bar',
          yAxisIndex: 1,
          barWidth: '40%',
          itemStyle: {
            color: '#52c41a',
            borderRadius: [4, 4, 0, 0]
          },
          data: cost
        }
      ]
    }
  }, [progressData])

  const columns = [
    {
      title: '项目编号',
      dataIndex: 'code',
      key: 'code',
      width: 140
    },
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: '项目类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => typeMap[type] || type
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
      render: (_: any, record: Project) => `${record.province} ${record.city}`
    },
    {
      title: '项目进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 180,
      render: (progress: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress percent={progress} size="small" style={{ width: 100 }} />
          <Text strong>{progress}%</Text>
        </div>
      )
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
      title: '负责人',
      dataIndex: 'managerName',
      key: 'managerName',
      width: 100
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Project) => (
        <Space>
          <Button type="link" size="small" onClick={() => fetchDetail(record.id)}>
            详情
          </Button>
          {record.status === 'processing' && (
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openProgressModal(record)}>
              填报进度
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ margin: '0 0 16px 0' }}>
        <ProjectOutlined /> 项目管理
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <Form form={filterForm} layout="inline" onFinish={handleSearch} style={{ flexWrap: 'wrap' }}>
          <Form.Item name="name" label="项目名称">
            <Input placeholder="请输入项目名称" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="type" label="项目类型">
            <Select placeholder="请选择" style={{ width: 140 }} allowClear>
              <Option value="governance">治理工程</Option>
              <Option value="monitoring">监测设施</Option>
              <Option value="infrastructure">基础设施</Option>
              <Option value="research">科研项目</Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择" style={{ width: 140 }} allowClear>
              <Option value="pending">待开始</Option>
              <Option value="processing">进行中</Option>
              <Option value="suspended">已暂停</Option>
              <Option value="completed">已完成</Option>
              <Option value="accepted">已验收</Option>
            </Select>
          </Form.Item>
          <Form.Item name="managerName" label="负责人">
            <Input placeholder="请输入负责人" style={{ width: 140 }} />
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
        title="项目详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <Spin spinning={detailLoading}>
          {detail && (
            <div>
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="项目预算(万元)"
                      value={detail.budget}
                      prefix={<DollarOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="已投入(万元)"
                      value={detail.actualCost || 0}
                      prefix={<DollarOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="当前进度"
                      value={detail.progress}
                      suffix="%"
                      prefix={<BarChartOutlined />}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small">
                    <Statistic
                      title="项目状态"
                      value={statusMap[detail.status].text}
                      prefix={statusMap[detail.status].icon}
                      valueStyle={{ color: detail.status === 'completed' || detail.status === 'accepted' ? '#52c41a' : '#1890ff' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="项目编号">{detail.code}</Descriptions.Item>
                <Descriptions.Item label="项目名称">{detail.name}</Descriptions.Item>
                <Descriptions.Item label="项目类型">
                  {typeMap[detail.type] || detail.type}
                </Descriptions.Item>
                <Descriptions.Item label="关联水体">
                  {detail.waterBodyName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="所在地区">
                  <EnvironmentOutlined /> {detail.province} {detail.city}
                </Descriptions.Item>
                <Descriptions.Item label="负责人">
                  <UserOutlined /> {detail.managerName}
                </Descriptions.Item>
                <Descriptions.Item label="计划周期">
                  <CalendarOutlined /> {detail.startDate} 至 {detail.endDate}
                </Descriptions.Item>
                <Descriptions.Item label="实际结束">
                  {detail.actualEndDate || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="项目描述" span={2}>
                  {detail.description}
                </Descriptions.Item>
              </Descriptions>

              <Divider orientation="left">
                <Space>
                  <BarChartOutlined />
                  进度趋势
                </Space>
              </Divider>
              <ReactECharts option={progressChartOption} style={{ height: 300 }} />

              {detail.milestones && detail.milestones.length > 0 && (
                <>
                  <Divider orientation="left">里程碑</Divider>
                  <List
                    size="small"
                    dataSource={detail.milestones}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={item.name}
                          description={
                            <Space>
                              <span>计划: {item.targetDate}</span>
                              {item.actualDate && <span>实际: {item.actualDate}</span>}
                            </Space>
                          }
                        />
                        <Tag
                          color={
                            item.status === 'completed'
                              ? 'success'
                              : item.status === 'delayed'
                              ? 'error'
                              : 'default'
                          }
                        >
                          {item.status === 'completed'
                            ? '已完成'
                            : item.status === 'delayed'
                            ? '已延期'
                            : '待完成'}
                        </Tag>
                      </List.Item>
                    )}
                  />
                </>
              )}

              {detail.relatedWaterBodies && detail.relatedWaterBodies.length > 0 && (
                <>
                  <Divider orientation="left">关联水体</Divider>
                  <List
                    size="small"
                    dataSource={detail.relatedWaterBodies}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={item.name}
                          description={`${item.province} ${item.city} | 当前水质: ${item.currentQuality}`}
                        />
                        <Tag color="blue">{'ⅠⅡⅢⅣⅤ'.charAt(item.level - 1)}类</Tag>
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
        title="填报项目进度"
        open={progressVisible}
        onCancel={() => setProgressVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleProgressSubmit}>
          <Form.Item name="projectId" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="date"
            label="填报日期"
            rules={[{ required: true, message: '请选择填报日期' }]}
          >
            <DatePicker style={{ width: '100%' }} disabledDate={(current) => current && current > dayjs().endOf('day')} />
          </Form.Item>
          <Form.Item
            name="progress"
            label="当前进度(%)"
            rules={[{ required: true, message: '请输入当前进度' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="请输入进度百分比" />
          </Form.Item>
          <Form.Item
            name="cost"
            label="本期投入(万元)"
            rules={[{ required: true, message: '请输入本期投入' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入本期投入金额" />
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注说明"
          >
            <TextArea rows={4} placeholder="请输入备注说明" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setProgressVisible(false)}>取消</Button>
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

export default ProjectPage
