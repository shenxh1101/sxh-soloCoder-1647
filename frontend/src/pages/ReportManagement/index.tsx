import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Form,
  Select,
  Modal,
  message,
  Space,
  Card,
  Row,
  Col,
  Tag,
  Descriptions,
  Divider,
  List,
  Typography,
  Statistic,
  Progress,
  Empty
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  BarChartOutlined,
  PieChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import PermissionButton from '@/components/PermissionButton'
import {
  getReportList,
  getReportDetail,
  generateWeeklyReport,
  exportReport
} from '@/api/report'
import type { Report, ReportListParams, ReportDetail, ReportWeeklyData } from '@/types'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

function ReportManagement() {
  const [searchForm] = Form.useForm()
  const [generateForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [reportList, setReportList] = useState<Report[]>([])
  const [total, setTotal] = useState(0)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [detailVisible, setDetailVisible] = useState(false)
  const [generateVisible, setGenerateVisible] = useState(false)
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)

  const statusMap: Record<string, { color: string; text: string }> = {
    draft: { color: 'default', text: '草稿' },
    published: { color: 'green', text: '已发布' },
    archived: { color: 'blue', text: '已归档' }
  }

  const typeMap: Record<string, string> = {
    weekly: '周报',
    monthly: '月报',
    quarterly: '季报',
    annual: '年报'
  }

  const fetchReportList = async (params?: Partial<ReportListParams>) => {
    setLoading(true)
    try {
      const searchValues = searchForm.getFieldsValue()
      const result = await getReportList({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        ...searchValues,
        ...params
      })
      setReportList(result.list)
      setTotal(result.total)
    } catch (error) {
      message.error('获取报告列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportList()
  }, [pagination.current, pagination.pageSize])

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchReportList({ pageNum: 1 })
  }

  const handleReset = () => {
    searchForm.resetFields()
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchReportList({ pageNum: 1 })
  }

  const handleViewDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const detail = await getReportDetail(id)
      setReportDetail(detail)
      setDetailVisible(true)
    } catch (error) {
      message.error('获取报告详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleGenerateWeekly = async () => {
    try {
      const values = await generateForm.validateFields()
      setGenerating(true)
      const result = await generateWeeklyReport(values)
      message.success('周报生成成功')
      setGenerateVisible(false)
      generateForm.resetFields()
      fetchReportList()
      handleViewDetail(result.id)
    } catch (error) {
      message.error('生成周报失败')
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = async (id: number, name: string) => {
    try {
      const blob = await exportReport(id)
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.download = `${name}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (error) {
      message.error('导出失败')
    }
  }

  const handlePreview = async (id: number) => {
    setDetailLoading(true)
    try {
      const detail = await getReportDetail(id)
      setReportDetail(detail)
      setPreviewVisible(true)
    } catch (error) {
      message.error('获取报告详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const getWeekOptions = () => {
    const options = []
    for (let i = 1; i <= 52; i++) {
      options.push(<Option key={i} value={i}>第{i}周</Option>)
    }
    return options
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUpOutlined style={{ color: '#f5222d' }} />
      case 'down':
        return <ArrowDownOutlined style={{ color: '#52c41a' }} />
      default:
        return <MinusOutlined style={{ color: '#8c8c8c' }} />
    }
  }

  const columns: ColumnsType<Report> = [
    {
      title: '报告编号',
      dataIndex: 'code',
      key: 'code',
      width: 140
    },
    {
      title: '报告名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => typeMap[type] || type
    },
    {
      title: '年度',
      dataIndex: 'year',
      key: 'year',
      width: 80,
      render: (year: number) => `${year}年`
    },
    {
      title: '周/月',
      dataIndex: 'week',
      key: 'week',
      width: 100,
      render: (week: number, record) => {
        if (record.week) return `第${week}周`
        if (record.month) return `${record.month}月`
        if (record.quarter) return `第${record.quarter}季度`
        return '-'
      }
    },
    {
      title: '区域',
      dataIndex: 'province',
      key: 'province',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const info = statusMap[status]
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '生成时间',
      dataIndex: 'generateTime',
      key: 'generateTime',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '生成人',
      dataIndex: 'generator',
      key: 'generator',
      width: 100
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record.id)}
          >
            预览
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleViewDetail(record.id)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleExport(record.id, record.name)}
          >
            导出
          </Button>
        </Space>
      )
    }
  ]

  const renderReportContent = (content: ReportWeeklyData) => (
    <div style={{ padding: 16 }}>
      <Card title="一、核心指标" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {content.coreIndicators.map((indicator, index) => (
            <Col xs={12} sm={8} md={6} key={index}>
              <Card size="small">
                <Statistic
                  title={indicator.name}
                  value={indicator.value}
                  suffix={indicator.unit}
                  prefix={getTrendIcon(indicator.trend)}
                  valueStyle={{ color: indicator.trend === 'up' ? '#f5222d' : indicator.trend === 'down' ? '#52c41a' : '#8c8c8c' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {indicator.trendValue > 0 ? '+' : ''}{indicator.trendValue}%
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="二、同比环比分析" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card size="small" title="同比分析">
              <List
                size="small"
                dataSource={content.comparisonData.yearOnYear}
                renderItem={(item) => (
                  <List.Item>
                    <span>{item.name}</span>
                    <span>{item.value}</span>
                    <Tag color={item.rate >= 0 ? 'red' : 'green'}>
                      {item.rate >= 0 ? '+' : ''}{item.rate}%
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="环比分析">
              <List
                size="small"
                dataSource={content.comparisonData.monthOnMonth}
                renderItem={(item) => (
                  <List.Item>
                    <span>{item.name}</span>
                    <span>{item.value}</span>
                    <Tag color={item.rate >= 0 ? 'red' : 'green'}>
                      {item.rate >= 0 ? '+' : ''}{item.rate}%
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title="三、投诉分布" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {content.complaintDistribution.map((item, index) => (
            <Col xs={12} sm={8} md={6} key={index}>
              <Card size="small">
                <Statistic
                  title={item.name}
                  value={item.value}
                  prefix={<PieChartOutlined />}
                />
                <Progress
                  percent={Math.round((item.value / content.complaintDistribution.reduce((sum, i) => sum + i.value, 0)) * 100)}
                  size="small"
                  showInfo={false}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="四、延误分析" style={{ marginBottom: 16 }}>
        <List
          dataSource={content.delayAnalysis}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<BarChartOutlined />}
                title={item.type}
                description={
                  <div>
                    <Text>共 {item.count} 件，平均延误 {item.avgDays} 天</Text>
                    <br />
                    <Text type="secondary">主要原因：{item.reasons.join('、')}</Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <Card title="五、项目进度" style={{ marginBottom: 16 }}>
        <List
          dataSource={content.projectProgress}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={item.projectName}
                description={
                  <div>
                    <Progress
                      percent={item.actualProgress}
                      size="small"
                      status={item.status === 'delayed' ? 'exception' : item.status === 'ahead' ? 'success' : 'active'}
                    />
                    <Text type="secondary">
                      计划进度：{item.plannedProgress}%，实际进度：{item.actualProgress}%
                    </Text>
                  </div>
                }
              />
              <Tag color={item.status === 'delayed' ? 'red' : item.status === 'ahead' ? 'green' : 'blue'}>
                {item.status === 'delayed' ? '滞后' : item.status === 'ahead' ? '超前' : '正常'}
              </Tag>
            </List.Item>
          )}
        />
      </Card>

      <Card title="六、本周工作总结" style={{ marginBottom: 16 }}>
        <Paragraph>{content.summary}</Paragraph>
      </Card>

      <Card title="七、存在问题" style={{ marginBottom: 16 }}>
        <List
          dataSource={content.problems}
          renderItem={(item, index) => (
            <List.Item>
              <Text strong>{index + 1}.</Text> {item}
            </List.Item>
          )}
        />
      </Card>

      <Card title="八、下周工作计划">
        <List
          dataSource={content.suggestions}
          renderItem={(item, index) => (
            <List.Item>
              <Text strong>{index + 1}.</Text> {item}
            </List.Item>
          )}
        />
      </Card>
    </div>
  )

  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ margin: '0 0 16px 0' }}>
        <FileTextOutlined /> 报告管理
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="报告总数"
                value={total}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="本周报告"
                value={reportList.filter((r) => r.type === 'weekly' && r.year === dayjs().year()).length}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="已发布"
                value={reportList.filter((r) => r.status === 'published').length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="草稿"
                value={reportList.filter((r) => r.status === 'draft').length}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#8c8c8c' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline">
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col span={6}>
              <Form.Item name="year" label="年份">
                <Select placeholder="请选择年份" allowClear style={{ width: '100%' }}>
                  {[2021, 2022, 2023, 2024, 2025, 2026].map((year) => (
                    <Option key={year} value={year}>
                      {year}年
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="week" label="周次">
                <Select placeholder="请选择周次" allowClear style={{ width: '100%' }}>
                  {getWeekOptions()}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="province" label="区域">
                <Select placeholder="请选择区域" allowClear style={{ width: '100%' }}>
                  <Option value="北京市">北京市</Option>
                  <Option value="上海市">上海市</Option>
                  <Option value="广东省">广东省</Option>
                  <Option value="江苏省">江苏省</Option>
                  <Option value="浙江省">浙江省</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item>
                <Space>
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                    查询
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <PermissionButton
              type="primary"
              icon={<PlusOutlined />}
              permission="report:generate"
              onClick={() => setGenerateVisible(true)}
            >
              生成周报
            </PermissionButton>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={reportList}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            ...pagination,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize })
            }
          }}
        />
      </Card>

      <Modal
        title="生成周报"
        open={generateVisible}
        onOk={handleGenerateWeekly}
        onCancel={() => setGenerateVisible(false)}
        confirmLoading={generating}
        width={500}
        destroyOnClose
      >
        <Form form={generateForm} layout="vertical">
          <Form.Item
            name="year"
            label="年份"
            rules={[{ required: true, message: '请选择年份' }]}
            initialValue={dayjs().year()}
          >
            <Select placeholder="请选择年份">
              {[2021, 2022, 2023, 2024, 2025, 2026].map((year) => (
                <Option key={year} value={year}>
                  {year}年
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="week"
            label="周次"
            rules={[{ required: true, message: '请选择周次' }]}
            initialValue={(() => {
              const now = dayjs()
              const start = dayjs(now.year().toString() + '-01-01')
              const diff = now.diff(start, 'day')
              return Math.ceil((diff + 1) / 7)
            })()}
          >
            <Select placeholder="请选择周次">
              {getWeekOptions()}
            </Select>
          </Form.Item>
          <Form.Item
            name="province"
            label="区域"
            rules={[{ required: true, message: '请选择区域' }]}
          >
            <Select placeholder="请选择区域">
              <Option value="北京市">北京市</Option>
              <Option value="上海市">上海市</Option>
              <Option value="广东省">广东省</Option>
              <Option value="江苏省">江苏省</Option>
              <Option value="浙江省">浙江省</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="报告详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        <div style={{ position: 'relative', minHeight: 200 }}>
          {detailLoading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}><Empty description={false} /></div>}
          {reportDetail && (
            <div>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="报告编号">{reportDetail.code}</Descriptions.Item>
                <Descriptions.Item label="报告名称">{reportDetail.name}</Descriptions.Item>
                <Descriptions.Item label="类型">{typeMap[reportDetail.type] || reportDetail.type}</Descriptions.Item>
                <Descriptions.Item label="年度">{reportDetail.year}年</Descriptions.Item>
                <Descriptions.Item label="周/月">
                  {reportDetail.week ? `第${reportDetail.week}周` : reportDetail.month ? `${reportDetail.month}月` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="区域">{reportDetail.province}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusMap[reportDetail.status]?.color}>
                    {statusMap[reportDetail.status]?.text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="生成时间">{dayjs(reportDetail.generateTime).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="生成人">{reportDetail.generator}</Descriptions.Item>
              </Descriptions>
              <Divider orientation="left">报告摘要</Divider>
              <Paragraph ellipsis={{ rows: 3 }}>
                {reportDetail.content?.summary || '暂无摘要'}
              </Paragraph>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title="报告预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button
            key="export"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => reportDetail && handleExport(reportDetail.id, reportDetail.name)}
          >
            导出Excel
          </Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        width={1000}
        style={{ top: 20 }}
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {reportDetail ? (
            renderReportContent(reportDetail.content)
          ) : (
            <Empty description="暂无数据" />
          )}
        </div>
      </Modal>
    </div>
  )
}

export default ReportManagement
