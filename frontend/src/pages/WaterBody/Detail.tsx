import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Table,
  Spin,
  Typography,
  Space,
  Statistic,
  Divider
} from 'antd'
import {
  EnvironmentOutlined,
  InfoCircleOutlined,
  ProjectOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import { useParams } from 'react-router-dom'
import {
  getWaterBodyDetail,
  getWaterBodyTrend,
  getWaterBodyProjects
} from '@/api/waterBody'
import type {
  WaterBodyDetail as WaterBodyDetailType,
  WaterBodyTrendPoint,
  Project,
  WaterQualityProcess,
  HotwordItem
} from '@/types'

const { Text } = Typography

function WaterBodyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<WaterBodyDetailType | null>(null)
  const [trendData, setTrendData] = useState<WaterBodyTrendPoint[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    if (id) {
      fetchData(parseInt(id))
    }
  }, [id])

  const fetchData = async (waterBodyId: number) => {
    setLoading(true)
    try {
      const [detailRes, trendRes, projectsRes] = await Promise.all([
        getWaterBodyDetail(waterBodyId),
        getWaterBodyTrend(waterBodyId, { days: 7 }),
        getWaterBodyProjects(waterBodyId, { pageNum: 1, pageSize: 10 })
      ])
      setDetail(detailRes)
      setTrendData(trendRes)
      setProjects(projectsRes.list)
    } finally {
      setLoading(false)
    }
  }

  const statusMap: Record<string, { color: string; text: string }> = {
    normal: { color: 'success', text: '正常' },
    warning: { color: 'warning', text: '预警' },
    treatment: { color: 'processing', text: '治理中' }
  }

  const typeMap: Record<string, string> = {
    river: '河流',
    lake: '湖泊',
    reservoir: '水库',
    ocean: '海洋'
  }

  const trendChartOption = useMemo(() => {
    if (!trendData.length) return {}

    const dates = trendData.map((item) => item.date)
    const indicators = [
      { key: 'ph', name: 'pH值', color: '#1890ff', unit: '' },
      { key: 'dissolvedOxygen', name: '溶解氧', color: '#52c41a', unit: 'mg/L' },
      { key: 'cod', name: 'COD', color: '#fa8c16', unit: 'mg/L' },
      { key: 'ammoniaNitrogen', name: '氨氮', color: '#f5222d', unit: 'mg/L' }
    ]

    const series = indicators.map((indicator) => ({
      name: indicator.name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: {
        width: 2,
        color: indicator.color
      },
      itemStyle: {
        color: indicator.color
      },
      data: trendData.map(
        (item) => item[indicator.key as keyof WaterBodyTrendPoint]
      )
    }))

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: indicators.map((item) => item.name),
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
        boundaryGap: false,
        data: dates
      },
      yAxis: [
        {
          type: 'value',
          name: 'pH/溶解氧',
          position: 'left'
        },
        {
          type: 'value',
          name: 'COD/氨氮(mg/L)',
          position: 'right'
        }
      ],
      series: series.map((s, index) => ({
        ...s,
        yAxisIndex: index >= 2 ? 1 : 0
      }))
    }
  }, [trendData])

  const processPieOption = useMemo(() => {
    if (!detail?.processList) return {}

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
          name: '治理工艺',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: detail.processList.map((item: WaterQualityProcess) => ({
            value: item.count,
            name: item.name
          }))
        }
      ]
    }
  }, [detail])

  const hotwordChartOption = useMemo(() => {
    if (!detail?.complaintHotwords) return {}

    const maxCount = Math.max(...detail.complaintHotwords.map((w: HotwordItem) => w.count))

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}次'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        max: maxCount + 2,
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'category',
        data: [...detail.complaintHotwords].reverse().map((w: HotwordItem) => w.word),
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [
        {
          type: 'bar',
          data: [...detail.complaintHotwords].reverse().map((w: HotwordItem) => ({
            value: w.count,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#1890ff' },
                { offset: 1, color: '#722ed1' }
              ])
            }
          })),
          barWidth: '60%',
          label: {
            show: true,
            position: 'right',
            formatter: '{c}次'
          }
        }
      ]
    }
  }, [detail])

  const projectColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '项目类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          governance: '治理工程',
          monitoring: '监测设施',
          infrastructure: '基础设施',
          research: '科研项目'
        }
        return typeMap[type] || type
      }
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => `${progress}%`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'default', text: '待开始' },
          processing: { color: 'processing', text: '进行中' },
          suspended: { color: 'warning', text: '已暂停' },
          completed: { color: 'success', text: '已完成' },
          accepted: { color: 'blue', text: '已验收' }
        }
        const info = statusMap[status] || { color: 'default', text: status }
        return <Tag color={info.color}>{info.text}</Tag>
      }
    }
  ]

  const outletColumns = [
    {
      title: '排污口名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code'
    },
    {
      title: '排放量(吨/日)',
      dataIndex: 'discharge',
      key: 'discharge'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = status === 'normal'
          ? { color: 'success', text: '正常' }
          : { color: 'error', text: '异常' }
        return <Tag color={info.color}>{info.text}</Tag>
      }
    },
    {
      title: '最近检查时间',
      dataIndex: 'lastCheckTime',
      key: 'lastCheckTime'
    }
  ]

  if (!detail) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  const statusInfo = statusMap[detail.status] || { color: 'default', text: detail.status }

  return (
    <div style={{ padding: 16 }}>
      <Spin spinning={loading}>
        <Card
          title={
            <Space>
              <EnvironmentOutlined />
              <span>{detail.name}</span>
              <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions bordered column={3}>
            <Descriptions.Item label="水体编码">{detail.code}</Descriptions.Item>
            <Descriptions.Item label="水体类型">
              {typeMap[detail.type] || detail.type}
            </Descriptions.Item>
            <Descriptions.Item label="水质等级">
              <Tag color="blue">{'ⅠⅡⅢⅣⅤ'.charAt(detail.level - 1)}类</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="所在地区">
              {detail.province} {detail.city}
            </Descriptions.Item>
            <Descriptions.Item label="水域面积">
              {detail.area} 平方公里
            </Descriptions.Item>
            <Descriptions.Item label="长度">
              {detail.length ? `${detail.length} 公里` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="当前水质">
              <Text strong>{detail.currentQuality}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="目标水质">
              <Text type="success">{detail.targetQuality}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {detail.updatedAt}
            </Descriptions.Item>
            <Descriptions.Item label="描述" span={3}>
              {detail.description}
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="pH值"
                value={detail.indicators.ph}
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="溶解氧(mg/L)"
                value={detail.indicators.dissolvedOxygen}
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="COD(mg/L)"
                value={detail.indicators.cod}
                precision={2}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="氨氮(mg/L)"
                value={detail.indicators.ammoniaNitrogen}
                precision={2}
                valueStyle={{ color: '#f5222d' }}
              />
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={16}>
            <Card
              title={
                <Space>
                  <InfoCircleOutlined />
                  近7天水质趋势曲线
                </Space>
              }
            >
              <ReactECharts option={trendChartOption} style={{ height: 350 }} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <ProjectOutlined />
                  治理工艺占比
                </Space>
              }
            >
              <ReactECharts option={processPieOption} style={{ height: 350 }} />
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <ExclamationCircleOutlined />
              公众投诉热词分布
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <ReactECharts option={hotwordChartOption} style={{ height: 300 }} />
        </Card>

        <Card
          title={
            <Space>
              <ProjectOutlined />
              关联项目列表
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Table
            dataSource={projects}
            columns={projectColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>

        <Card
          title={
            <Space>
              <ExclamationCircleOutlined />
              关联排污口列表
            </Space>
          }
        >
          <Table
            dataSource={detail.relatedOutlets}
            columns={outletColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      </Spin>
    </div>
  )
}

export default WaterBodyDetailPage
