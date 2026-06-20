import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Form,
  Input,
  Select,
  Modal,
  message,
  Space,
  Card,
  Row,
  Col,
  Tag,
  Progress,
  Upload,
  Alert,
  Statistic,
  Descriptions,
  Divider,
  List,
  Typography,
  InputNumber,
  DatePicker
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  UploadOutlined,
  MoneyCollectOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadProps } from 'antd/es/upload/interface'
import PermissionButton from '@/components/PermissionButton'
import {
  getTaskList,
  getTaskDetail,
  createTask,
  updateTask,
  deleteTask,
  importTasks,
  getFundList,
  createFund,
  checkFundAbnormal
} from '@/api/task'
import type { Task, TaskListParams, FundDisbursement, FundAbnormalResult } from '@/types'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

function TaskManagement() {
  const [form] = Form.useForm()
  const [fundForm] = Form.useForm()
  const [searchForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [fundModalVisible, setFundModalVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [taskList, setTaskList] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [fundList, setFundList] = useState<FundDisbursement[]>([])
  const [fundLoading, setFundLoading] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null)
  const [abnormalResult, setAbnormalResult] = useState<FundAbnormalResult | null>(null)
  const [checkingAbnormal, setCheckingAbnormal] = useState(false)
  const [taskDetail, setTaskDetail] = useState<Task | null>(null)

  const statusMap: Record<string, { color: string; text: string }> = {
    pending: { color: 'default', text: '待开始' },
    processing: { color: 'processing', text: '进行中' },
    suspended: { color: 'warning', text: '已暂停' },
    completed: { color: 'success', text: '已完成' },
    cancelled: { color: 'error', text: '已取消' }
  }

  const typeMap: Record<string, string> = {
    governance: '治理任务',
    monitoring: '监测任务',
    protection: '保护任务',
    research: '科研任务'
  }

  const fundTypeMap: Record<string, { color: string; text: string }> = {
    budget: { color: 'blue', text: '预算下达' },
    allocation: { color: 'purple', text: '资金拨付' },
    payment: { color: 'green', text: '款项支付' }
  }

  const severityMap: Record<string, { color: string; icon: React.ReactNode }> = {
    low: { color: 'blue', icon: <InfoCircleOutlined /> },
    medium: { color: 'orange', icon: <WarningOutlined /> },
    high: { color: 'red', icon: <ExclamationCircleOutlined /> }
  }

  const fetchTaskList = async (params?: Partial<TaskListParams>) => {
    setLoading(true)
    try {
      const searchValues = searchForm.getFieldsValue()
      const result = await getTaskList({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        ...searchValues,
        ...params
      })
      setTaskList(result.list)
      setTotal(result.total)
    } catch (error) {
      message.error('获取任务列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTaskList()
  }, [pagination.current, pagination.pageSize])

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchTaskList({ pageNum: 1 })
  }

  const handleReset = () => {
    searchForm.resetFields()
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchTaskList({ pageNum: 1 })
  }

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = async (id: number) => {
    setEditingId(id)
    try {
      const task = await getTaskDetail(id)
      form.setFieldsValue(task)
      setModalVisible(true)
    } catch (error) {
      message.error('获取任务信息失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteTask(id)
      message.success('删除成功')
      fetchTaskList()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingId) {
        await updateTask(editingId, values)
        message.success('更新成功')
      } else {
        await createTask(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchTaskList()
    } catch (error) {
      // 表单验证错误已处理
    }
  }

  const handleViewDetail = async (id: number) => {
    try {
      const detail = await getTaskDetail(id)
      setTaskDetail(detail)
      setDetailVisible(true)
    } catch (error) {
      message.error('获取任务详情失败')
    }
  }

  const handleViewFund = async (id: number) => {
    setCurrentTaskId(id)
    setFundModalVisible(true)
    fetchFundList(id)
  }

  const fetchFundList = async (taskId: number) => {
    setFundLoading(true)
    try {
      const result = await getFundList(taskId)
      setFundList(result)
    } catch (error) {
      message.error('获取资金记录失败')
    } finally {
      setFundLoading(false)
    }
  }

  const handleAddFund = async () => {
    try {
      const values = await fundForm.validateFields()
      if (currentTaskId) {
        await createFund(currentTaskId, {
          ...values,
          date: values.date.format('YYYY-MM-DD')
        })
        message.success('资金记录添加成功')
        fundForm.resetFields()
        fetchFundList(currentTaskId)
      }
    } catch (error) {
      // 表单验证错误已处理
    }
  }

  const handleCheckAbnormal = async (taskId: number) => {
    setCheckingAbnormal(true)
    try {
      const result = await checkFundAbnormal(taskId)
      setAbnormalResult(result)
      if (result.hasAbnormal) {
        message.warning(`检测到 ${result.abnormalItems.length} 项异常`)
      } else {
        message.success('未检测到资金异常')
      }
    } catch (error) {
      message.error('检查资金异常失败')
    } finally {
      setCheckingAbnormal(false)
    }
  }

  const uploadProps: UploadProps = {
    name: 'file',
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const result = await importTasks(file)
        message.success(`导入成功：${result.success} 条，失败：${result.failed} 条`)
        if (result.errors.length > 0) {
          Modal.error({
            title: '导入失败详情',
            content: (
              <List
                size="small"
                dataSource={result.errors}
                renderItem={(item) => (
                  <List.Item>
                    第 {item.row} 行：{item.message}
                  </List.Item>
                )}
              />
            )
          })
        }
        fetchTaskList()
      } catch (error) {
        message.error('导入失败')
      }
      return false
    }
  }

  const columns: ColumnsType<Task> = [
    {
      title: '任务编号',
      dataIndex: 'code',
      key: 'code',
      width: 120
    },
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: '年度',
      dataIndex: 'year',
      key: 'year',
      width: 80
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => typeMap[type] || type
    },
    {
      title: '区域',
      dataIndex: 'province',
      key: 'province',
      width: 100,
      render: (province, record) => `${province} ${record.city || ''}`
    },
    {
      title: '预算金额',
      dataIndex: 'targetAmount',
      key: 'targetAmount',
      width: 120,
      render: (value) => `¥${value.toLocaleString()}`
    },
    {
      title: '已支付',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 120,
      render: (value) => `¥${value.toLocaleString()}`
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number) => (
        <Progress percent={progress} size="small" status={progress >= 100 ? 'success' : 'active'} />
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
      title: '负责人',
      dataIndex: 'managerName',
      key: 'managerName',
      width: 100
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleViewDetail(record.id)}>
            详情
          </Button>
          <PermissionButton
            type="link"
            size="small"
            icon={<EditOutlined />}
            permission="task:edit"
            onClick={() => handleEdit(record.id)}
          >
            编辑
          </PermissionButton>
          <Button type="link" size="small" icon={<MoneyCollectOutlined />} onClick={() => handleViewFund(record.id)}>
            资金
          </Button>
          <Button
            type="link"
            size="small"
            icon={<WarningOutlined />}
            onClick={() => handleCheckAbnormal(record.id)}
            loading={checkingAbnormal}
          >
            校验
          </Button>
          <PermissionButton
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            permission="task:delete"
            onClick={() => handleDelete(record.id)}
          >
            删除
          </PermissionButton>
        </Space>
      )
    }
  ]

  const fundColumns: ColumnsType<FundDisbursement> = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const info = fundTypeMap[type]
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (value) => `¥${value.toLocaleString()}`
    },
    {
      title: '付款方',
      dataIndex: 'payer',
      key: 'payer',
      width: 120
    },
    {
      title: '收款方',
      dataIndex: 'payee',
      key: 'payee',
      width: 120
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    }
  ]

  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ margin: '0 0 16px 0' }}>
        <FileTextOutlined /> 任务管理
      </Title>

      {abnormalResult && abnormalResult.hasAbnormal && (
        <Alert
          message="资金异常提醒"
          description={
            <List
              size="small"
              dataSource={abnormalResult.abnormalItems}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    {severityMap[item.severity]?.icon}
                    <Text type={item.severity === 'high' ? 'danger' : 'warning'}>
                      {item.description}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          }
          type="warning"
          showIcon
          closable
          onClose={() => setAbnormalResult(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="任务总数"
                value={total}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="进行中"
                value={taskList.filter((t) => t.status === 'processing').length}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="已完成"
                value={taskList.filter((t) => t.status === 'completed').length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card size="small">
              <Statistic
                title="总预算"
                value={taskList.reduce((sum, t) => sum + t.targetAmount, 0)}
                prefix="¥"
                valueStyle={{ color: '#722ed1' }}
                formatter={(value) => (value as number).toLocaleString()}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline">
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col span={6}>
              <Form.Item name="year" label="年度">
                <Select placeholder="请选择年度" allowClear style={{ width: '100%' }}>
                  {[2021, 2022, 2023, 2024, 2025, 2026].map((year) => (
                    <Option key={year} value={year}>
                      {year}年
                    </Option>
                  ))}
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
              <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态" allowClear style={{ width: '100%' }}>
                  <Option value="pending">待开始</Option>
                  <Option value="processing">进行中</Option>
                  <Option value="suspended">已暂停</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="cancelled">已取消</Option>
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
              permission="task:add"
              onClick={handleAdd}
            >
              新增任务
            </PermissionButton>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Excel导入</Button>
            </Upload>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={taskList}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
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
        title={editingId ? '编辑任务' : '新增任务'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="任务名称"
                rules={[{ required: true, message: '请输入任务名称' }]}
              >
                <Input placeholder="请输入任务名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="year"
                label="年度"
                rules={[{ required: true, message: '请选择年度' }]}
              >
                <Select placeholder="请选择年度">
                  {[2021, 2022, 2023, 2024, 2025, 2026].map((year) => (
                    <Option key={year} value={year}>
                      {year}年
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="任务类型"
                rules={[{ required: true, message: '请选择任务类型' }]}
              >
                <Select placeholder="请选择任务类型">
                  <Option value="governance">治理任务</Option>
                  <Option value="monitoring">监测任务</Option>
                  <Option value="protection">保护任务</Option>
                  <Option value="research">科研任务</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
                initialValue="pending"
              >
                <Select placeholder="请选择状态">
                  <Option value="pending">待开始</Option>
                  <Option value="processing">进行中</Option>
                  <Option value="suspended">已暂停</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="cancelled">已取消</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="province"
                label="省份"
                rules={[{ required: true, message: '请选择省份' }]}
              >
                <Select placeholder="请选择省份">
                  <Option value="北京市">北京市</Option>
                  <Option value="上海市">上海市</Option>
                  <Option value="广东省">广东省</Option>
                  <Option value="江苏省">江苏省</Option>
                  <Option value="浙江省">浙江省</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="city"
                label="城市"
                rules={[{ required: true, message: '请输入城市' }]}
              >
                <Input placeholder="请输入城市" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="targetAmount"
                label="预算金额"
                rules={[{ required: true, message: '请输入预算金额' }]}
              >
                <InputNumber
                  placeholder="请输入预算金额"
                  min={0}
                  style={{ width: '100%' }}
                  prefix="¥"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="managerName"
                label="负责人"
                rules={[{ required: true, message: '请输入负责人' }]}
              >
                <Input placeholder="请输入负责人姓名" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="description"
            label="任务描述"
            rules={[{ required: true, message: '请输入任务描述' }]}
          >
            <TextArea rows={4} placeholder="请输入任务描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="资金拨付记录"
        open={fundModalVisible}
        onCancel={() => setFundModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setFundModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={900}
      >
        <Card size="small" style={{ marginBottom: 16 }} title="新增资金记录">
          <Form form={fundForm} layout="inline">
            <Form.Item
              name="type"
              label="类型"
              rules={[{ required: true, message: '请选择类型' }]}
            >
              <Select placeholder="请选择" style={{ width: 120 }}>
                <Option value="budget">预算下达</Option>
                <Option value="allocation">资金拨付</Option>
                <Option value="payment">款项支付</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="amount"
              label="金额"
              rules={[{ required: true, message: '请输入金额' }]}
            >
              <InputNumber placeholder="金额" min={0} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item
              name="payer"
              label="付款方"
              rules={[{ required: true, message: '请输入付款方' }]}
            >
              <Input placeholder="付款方" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item
              name="payee"
              label="收款方"
              rules={[{ required: true, message: '请输入收款方' }]}
            >
              <Input placeholder="收款方" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item
              name="date"
              label="日期"
              rules={[{ required: true, message: '请选择日期' }]}
            >
              <DatePicker />
            </Form.Item>
            <Form.Item
              name="operator"
              label="操作人"
              rules={[{ required: true, message: '请输入操作人' }]}
            >
              <Input placeholder="操作人" style={{ width: 100 }} />
            </Form.Item>
            <Form.Item
              name="remark"
              label="备注"
            >
              <Input placeholder="备注" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={handleAddFund}>
                添加
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Table
          columns={fundColumns}
          dataSource={fundList}
          rowKey="id"
          loading={fundLoading}
          pagination={false}
          scroll={{ x: 900 }}
          size="small"
        />
      </Modal>

      <Modal
        title="任务详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {taskDetail && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="任务编号">{taskDetail.code}</Descriptions.Item>
              <Descriptions.Item label="任务名称">{taskDetail.name}</Descriptions.Item>
              <Descriptions.Item label="年度">{taskDetail.year}年</Descriptions.Item>
              <Descriptions.Item label="类型">{typeMap[taskDetail.type] || taskDetail.type}</Descriptions.Item>
              <Descriptions.Item label="区域">{`${taskDetail.province} ${taskDetail.city}`}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[taskDetail.status]?.color}>
                  {statusMap[taskDetail.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="预算金额">¥{taskDetail.targetAmount.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="已支付">¥{taskDetail.paidAmount.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="负责人">{taskDetail.managerName}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{dayjs(taskDetail.createdAt).format('YYYY-MM-DD')}</Descriptions.Item>
              <Descriptions.Item label="任务描述" span={2}>
                {taskDetail.description}
              </Descriptions.Item>
            </Descriptions>
            <Divider orientation="left">执行进度</Divider>
            <Progress percent={taskDetail.progress} status={taskDetail.progress >= 100 ? 'success' : 'active'} />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default TaskManagement
