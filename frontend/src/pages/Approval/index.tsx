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
  Tabs,
  Typography,
  Divider,
  Steps,
  Timeline,
  List,
  message,
  Spin,
  Descriptions,
  Progress
} from 'antd'
import {
  FileTextOutlined,
  UserOutlined,
  PaperClipOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  MinusCircleOutlined,
  AlertOutlined
} from '@ant-design/icons'
import {
  getApprovalList,
  getApprovalDetail,
  approve,
  reject
} from '@/api/approval'
import type { Approval, ApprovalDetail, ApprovalListParams } from '@/types'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

function ApprovalPage() {
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [data, setData] = useState<Approval[]>([])
  const [detail, setDetail] = useState<ApprovalDetail | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [handleVisible, setHandleVisible] = useState(false)
  const [handleType, setHandleType] = useState<'approve' | 'reject'>('approve')
  const [activeTab, setActiveTab] = useState('pending')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [form] = Form.useForm()

  const typeMap: Record<string, string> = {
    project: '项目审批',
    fund: '资金审批',
    plan: '计划审批',
    other: '其他审批'
  }

  const statusMap: Record<string, { color: string; text: string }> = {
    pending: { color: 'warning', text: '待审批' },
    processing: { color: 'processing', text: '审批中' },
    approved: { color: 'success', text: '已通过' },
    rejected: { color: 'error', text: '已驳回' }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async (params?: Partial<ApprovalListParams>) => {
    setLoading(true)
    try {
      const result = await getApprovalList({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        tab: activeTab as 'pending' | 'initiated' | 'all',
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
      const result = await getApprovalDetail(id)
      setDetail(result)
      setDetailVisible(true)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleTableChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({ ...prev, current: page, pageSize }))
    fetchData({ pageNum: page, pageSize })
  }

  const openHandleModal = (record: Approval, type: 'approve' | 'reject') => {
    setDetail(record as ApprovalDetail)
    setHandleType(type)
    form.setFieldsValue({
      id: record.id,
      opinion: ''
    })
    setHandleVisible(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      if (handleType === 'approve') {
        await approve({ id: values.id, opinion: values.opinion, pass: true })
        message.success('审批通过成功')
      } else {
        await reject({ id: values.id, opinion: values.opinion, pass: false })
        message.success('审批驳回成功')
      }
      setHandleVisible(false)
      fetchData()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const columns = [
    {
      title: '审批编号',
      dataIndex: 'code',
      key: 'code',
      width: 140
    },
    {
      title: '审批标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '审批类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => typeMap[type] || type
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      key: 'applicantName',
      width: 100
    },
    {
      title: '申请部门',
      dataIndex: 'applicantDept',
      key: 'applicantDept',
      width: 120
    },
    {
      title: '审批进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (_: any, record: Approval) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={Math.round((record.currentStep / record.totalSteps) * 100)}
            size="small"
            style={{ width: 80 }}
          />
          <Text type="secondary">
            {record.currentStep}/{record.totalSteps}
          </Text>
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
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '当前审批人',
      dataIndex: 'currentApprover',
      key: 'currentApprover',
      width: 100,
      render: (text: string) => text || '-'
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
      render: (_: any, record: Approval) => (
        <Space>
          <Button type="link" size="small" onClick={() => fetchDetail(record.id)}>
            详情
          </Button>
          {activeTab === 'pending' && record.status === 'pending' && (
            <>
              <Button type="primary" size="small" onClick={() => openHandleModal(record, 'approve')}>
                通过
              </Button>
              <Button danger size="small" onClick={() => openHandleModal(record, 'reject')}>
                驳回
              </Button>
            </>
          )}
        </Space>
      )
    }
  ]

  const tabItems = [
    { key: 'pending', label: '待我审批' },
    { key: 'initiated', label: '我发起的' },
    { key: 'all', label: '全部审批' }
  ]

  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ margin: '0 0 16px 0' }}>
        <FileTextOutlined /> 审批管理
      </Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />

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
        title="审批详情"
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
                <Descriptions.Item label="审批编号">{detail.code}</Descriptions.Item>
                <Descriptions.Item label="审批标题">{detail.title}</Descriptions.Item>
                <Descriptions.Item label="审批类型">
                  {typeMap[detail.type] || detail.type}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusMap[detail.status].color}>
                    {statusMap[detail.status].text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="申请人">{detail.applicantName}</Descriptions.Item>
                <Descriptions.Item label="申请部门">{detail.applicantDept}</Descriptions.Item>
                <Descriptions.Item label="关联预警" span={2}>
                  {detail.relatedAlert ? (
                    <Space>
                      <AlertOutlined style={{ color: '#faad14' }} />
                      <Text>{detail.relatedAlert.code} - {detail.relatedAlert.content}</Text>
                    </Space>
                  ) : (
                    <Text type="secondary">无关联预警</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间" span={2}>
                  {detail.createdAt}
                </Descriptions.Item>
              </Descriptions>

              <Divider orientation="left">审批内容</Divider>
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{detail.content}</Paragraph>

              {detail.attachments && detail.attachments.length > 0 && (
                <>
                  <Divider orientation="left">
                    <Space>
                      <PaperClipOutlined />
                      附件
                    </Space>
                  </Divider>
                  <List
                    size="small"
                    dataSource={detail.attachments}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={<a href={item.url}>{item.name}</a>}
                          description={`${(item.size / 1024).toFixed(2)} KB`}
                        />
                      </List.Item>
                    )}
                  />
                </>
              )}

              <Divider orientation="left">审批流程</Divider>
              <Steps
                direction="vertical"
                size="small"
                current={detail.flow.findIndex((f) => f.status === 'current') + 1}
                items={detail.flow.map((step, index) => {
                  const stageNames = ['治理单位确认', '区级主管部门复核', '市级政府批准']
                  const stepStatus = step.status === 'approved' ? 'finish' : step.status === 'rejected' ? 'error' : step.status === 'current' ? 'process' : 'wait'
                  const statusIconMap: Record<string, React.ReactNode> = {
                    approved: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                    rejected: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
                    current: <ClockCircleOutlined style={{ color: '#1677ff' }} />,
                    pending: <MinusCircleOutlined style={{ color: '#d9d9d9' }} />,
                  }
                  return {
                    title: stageNames[index] || step.name,
                    icon: statusIconMap[step.status],
                    description: (
                      <div>
                        {step.approver && (
                          <div>
                            <UserOutlined /> {step.approver}
                          </div>
                        )}
                        {step.opinion && <Text type="secondary">{step.opinion}</Text>}
                        {step.time && (
                          <div style={{ fontSize: 12, color: '#999' }}>{step.time}</div>
                        )}
                      </div>
                    ),
                    status: stepStatus,
                  }
                })}
              />

              {detail.flow && detail.flow.length > 0 && (
                <>
                  <Divider orientation="left">审批历史</Divider>
                  <Timeline
                    items={detail.flow.map((step) => {
                      const colorMap: Record<string, string> = {
                        approved: 'green',
                        rejected: 'red',
                        current: 'blue',
                        pending: 'gray',
                      }
                      const statusTextMap: Record<string, string> = {
                        approved: '已通过',
                        rejected: '已驳回',
                        current: '审批中',
                        pending: '待处理',
                      }
                      return {
                        color: colorMap[step.status] || 'gray',
                        children: (
                          <div>
                            <div>
                              <Text strong>{step.name}</Text>
                              <Tag
                                color={step.status === 'approved' ? 'success' : step.status === 'rejected' ? 'error' : step.status === 'current' ? 'processing' : 'default'}
                                style={{ marginLeft: 8 }}
                              >
                                {statusTextMap[step.status] || step.status}
                              </Tag>
                            </div>
                            {step.approver && (
                              <div style={{ marginTop: 4 }}>
                                <UserOutlined /> {step.approver}
                              </div>
                            )}
                            {step.opinion && (
                              <div style={{ marginTop: 4, color: '#666' }}>{step.opinion}</div>
                            )}
                            {step.time && (
                              <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>{step.time}</div>
                            )}
                          </div>
                        ),
                      }
                    })}
                  />
                </>
              )}
            </div>
          )}
        </Spin>
      </Modal>

      <Modal
        title={handleType === 'approve' ? '审批通过' : '审批驳回'}
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
            name="opinion"
            label={handleType === 'approve' ? '审批意见' : '驳回原因'}
            rules={[{ required: true, message: `请输入${handleType === 'approve' ? '审批意见' : '驳回原因'}` }]}
          >
            <TextArea rows={4} placeholder={`请输入${handleType === 'approve' ? '审批意见' : '驳回原因'}`} />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setHandleVisible(false)}>取消</Button>
              <Button type={handleType === 'approve' ? 'primary' : 'primary'} danger={handleType === 'reject'} htmlType="submit">
                {handleType === 'approve' ? '确认通过' : '确认驳回'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ApprovalPage
