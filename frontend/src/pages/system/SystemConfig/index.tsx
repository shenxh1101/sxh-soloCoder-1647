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
  Tabs,
  InputNumber,
  Switch,
  Checkbox,
  Popconfirm,
  Tooltip,
  Typography,
  Alert
} from 'antd'
import {
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  SaveOutlined,
  UndoOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import PermissionButton from '@/components/PermissionButton'
import {
  getConfigList,
  updateConfig,
  batchUpdateConfig,
  resetConfigToDefault
} from '@/api/config'
import type { SystemConfig, ConfigListParams } from '@/types'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs
const { Title, Text } = Typography

function SystemConfig() {
  const [searchForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [configList, setConfigList] = useState<SystemConfig[]>([])
  const [total, setTotal] = useState(0)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [editVisible, setEditVisible] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null)
  const [activeGroup, setActiveGroup] = useState<string>('all')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchEditVisible, setBatchEditVisible] = useState(false)
  const [batchEditForm] = Form.useForm()

  const groupMap: Record<string, { label: string; color: string }> = {
    alert: { label: '预警配置', color: 'red' },
    water_quality: { label: '水质标准', color: 'blue' },
    approval: { label: '审批配置', color: 'green' },
    report: { label: '报告配置', color: 'purple' },
    system: { label: '系统配置', color: 'orange' }
  }

  const typeMap: Record<string, string> = {
    string: '字符串',
    number: '数字',
    boolean: '布尔值',
    json: 'JSON'
  }

  const fetchConfigList = async (params?: Partial<ConfigListParams>) => {
    setLoading(true)
    try {
      const searchValues = searchForm.getFieldsValue()
      const result = await getConfigList({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        group: activeGroup === 'all' ? undefined : activeGroup,
        ...searchValues,
        ...params
      })
      setConfigList(result.list)
      setTotal(result.total)
    } catch (error) {
      message.error('获取配置列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigList()
  }, [pagination.current, pagination.pageSize, activeGroup])

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchConfigList({ pageNum: 1 })
  }

  const handleReset = () => {
    searchForm.resetFields()
    setPagination((prev) => ({ ...prev, current: 1 }))
    setActiveGroup('all')
    fetchConfigList({ pageNum: 1, group: undefined })
  }

  const handleEdit = (record: SystemConfig) => {
    setEditingConfig(record)
    editForm.setFieldsValue({
      key: record.key,
      value: record.value,
      name: record.name,
      description: record.description
    })
    setEditVisible(true)
  }

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields()
      if (editingConfig) {
        await updateConfig(editingConfig.key, { value: values.value })
        message.success('配置更新成功')
        setEditVisible(false)
        fetchConfigList()
      }
    } catch (error) {
      // 表单验证错误已处理
    }
  }

  const handleBatchEdit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要修改的配置项')
      return
    }
    batchEditForm.resetFields()
    setBatchEditVisible(true)
  }

  const handleBatchEditSubmit = async () => {
    try {
      const values = await batchEditForm.validateFields()
      const items = selectedRowKeys.map((key) => ({
        key: key as string,
        value: values.value
      }))
      await batchUpdateConfig({ items })
      message.success('批量更新成功')
      setBatchEditVisible(false)
      setSelectedRowKeys([])
      fetchConfigList()
    } catch (error) {
      // 表单验证错误已处理
    }
  }

  const handleResetToDefault = async (keys: string[]) => {
    try {
      await resetConfigToDefault(keys)
      message.success('恢复默认配置成功')
      setSelectedRowKeys([])
      fetchConfigList()
    } catch (error) {
      message.error('恢复默认配置失败')
    }
  }

  const renderValueInput = (config: SystemConfig) => {
    if (config.type === 'boolean') {
      return <Switch checked={config.value === 'true'} disabled />
    } else if (config.type === 'number') {
      return <InputNumber value={parseFloat(config.value)} disabled style={{ width: '100%' }} />
    } else if (config.type === 'json') {
      return <TextArea value={config.value} disabled autoSize />
    }
    return <Input value={config.value} disabled />
  }

  const renderEditValueInput = () => {
    if (!editingConfig) return null

    if (editingConfig.type === 'boolean') {
      return (
        <Form.Item name="value" label="配置值" rules={[{ required: true, message: '请选择' }]}>
          <Select>
            <Option value="true">启用</Option>
            <Option value="false">禁用</Option>
          </Select>
        </Form.Item>
      )
    } else if (editingConfig.type === 'number') {
      return (
        <Form.Item name="value" label="配置值" rules={[{ required: true, message: '请输入数值' }]}>
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
      )
    } else if (editingConfig.type === 'json') {
      return (
        <Form.Item name="value" label="配置值" rules={[{ required: true, message: '请输入JSON' }]}>
          <TextArea rows={6} placeholder="请输入JSON格式内容" />
        </Form.Item>
      )
    }
    return (
      <Form.Item name="value" label="配置值" rules={[{ required: true, message: '请输入配置值' }]}>
        <Input placeholder="请输入配置值" />
      </Form.Item>
    )
  }

  const columns: ColumnsType<SystemConfig> = [
    {
      title: '配置名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name, record) => (
        <Space>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({record.key})
          </Text>
        </Space>
      )
    },
    {
      title: '分组',
      dataIndex: 'group',
      key: 'group',
      width: 100,
      render: (group: string) => {
        const info = groupMap[group]
        return <Tag color={info?.color}>{info?.label || group}</Tag>
      }
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => typeMap[type] || type
    },
    {
      title: '配置值',
      dataIndex: 'value',
      key: 'value',
      render: (_, record) => renderValueInput(record)
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description) => (
        <Tooltip title={description}>
          <span>{description}</span>
        </Tooltip>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '更新人',
      dataIndex: 'updatedBy',
      key: 'updatedBy',
      width: 100
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <PermissionButton
            type="link"
            size="small"
            icon={<EditOutlined />}
            permission="system:config:edit"
            onClick={() => handleEdit(record)}
          >
            编辑
          </PermissionButton>
          <PermissionButton
            type="link"
            size="small"
            icon={<UndoOutlined />}
            permission="system:config:reset"
            onClick={() => handleResetToDefault([record.key])}
          >
            恢复
          </PermissionButton>
        </Space>
      )
    }
  ]

  const filteredConfigList = activeGroup === 'all'
    ? configList
    : configList.filter((c) => c.group === activeGroup)

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <Title level={3} style={{ margin: '0 0 16px 0' }}>
        <SettingOutlined /> 系统配置
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline">
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col span={6}>
              <Form.Item name="keyword" label="关键词">
                <Input placeholder="配置名称/键名" allowClear />
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
              icon={<SaveOutlined />}
              permission="system:config:edit"
              onClick={handleBatchEdit}
              disabled={selectedRowKeys.length === 0}
            >
              批量修改 ({selectedRowKeys.length})
            </PermissionButton>
            <Popconfirm
              title="确定要将选中的配置恢复为默认值吗？"
              onConfirm={() => handleResetToDefault(selectedRowKeys as string[])}
              okText="确定"
              cancelText="取消"
              disabled={selectedRowKeys.length === 0}
            >
              <PermissionButton
                icon={<UndoOutlined />}
                permission="system:config:reset"
                disabled={selectedRowKeys.length === 0}
              >
                恢复默认
              </PermissionButton>
            </Popconfirm>
          </Space>
        </div>

        <Tabs
          activeKey={activeGroup}
          onChange={(key) => {
            setActiveGroup(key)
            setPagination((prev) => ({ ...prev, current: 1 }))
          }}
          style={{ marginBottom: 16 }}
        >
          <TabPane tab="全部" key="all" />
          {Object.entries(groupMap).map(([key, info]) => (
            <TabPane
              tab={
                <span>
                  <Tag color={info.color}>{info.label}</Tag>
                </span>
              }
              key={key}
            />
          ))}
        </Tabs>

        <Table
          columns={columns}
          dataSource={filteredConfigList}
          rowKey="key"
          loading={loading}
          scroll={{ x: 1200 }}
          rowSelection={rowSelection}
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
        title="编辑配置"
        open={editVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="key" label="配置键">
            <Input disabled />
          </Form.Item>
          <Form.Item name="name" label="配置名称">
            <Input disabled />
          </Form.Item>
          <Form.Item name="description" label="配置描述">
            <Input disabled />
          </Form.Item>
          {renderEditValueInput()}
        </Form>
      </Modal>

      <Modal
        title="批量修改配置"
        open={batchEditVisible}
        onOk={handleBatchEditSubmit}
        onCancel={() => setBatchEditVisible(false)}
        width={500}
        destroyOnClose
      >
        <Alert
          message="注意"
          description={`将为 ${selectedRowKeys.length} 个配置项设置相同的值，请谨慎操作。`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={batchEditForm} layout="vertical">
          <Form.Item
            name="value"
            label="配置值"
            rules={[{ required: true, message: '请输入配置值' }]}
          >
            <TextArea rows={4} placeholder="请输入配置值" />
          </Form.Item>
          <Form.Item label="选中的配置项">
            <Checkbox.Group
              value={selectedRowKeys as string[]}
              disabled
              options={selectedRowKeys.map((key) => {
                const config = configList.find((c) => c.key === key)
                return { label: config?.name || String(key), value: String(key) }
              })}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SystemConfig
