import { useState, useMemo } from 'react'
import { Card, Radio, Table, Tag, Space } from 'antd'
import type { DashboardStats } from '@/types'

interface RankingListProps {
  data?: DashboardStats['regionList']
  loading?: boolean
}

type RankDimension = 'waterQualityComplianceRate' | 'governanceCompletionRate' | 'publicSatisfaction'
type RankScope = 'province' | 'city'

function RankingList({ data = [], loading }: RankingListProps) {
  const [dimension, setDimension] = useState<RankDimension>('waterQualityComplianceRate')
  const [scope, setScope] = useState<RankScope>('province')

  const displayData = useMemo(() => {
    return data.filter(item => item.level === scope)
  }, [data, scope])

  const sortedData = useMemo(() => {
    return [...displayData]
      .sort((a, b) => b[dimension] - a[dimension])
      .slice(0, 10)
  }, [displayData, dimension])

  const getDimensionLabel = () => {
    switch (dimension) {
      case 'waterQualityComplianceRate':
        return '水质达标率'
      case 'governanceCompletionRate':
        return '治理完成率'
      case 'publicSatisfaction':
        return '公众满意度'
    }
  }

  const getRankColor = (index: number) => {
    if (index === 0) return 'gold'
    if (index === 1) return 'silver'
    if (index === 2) return '#cd7f32'
    return 'default'
  }

  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => (
        <Tag color={getRankColor(index)} style={{ fontSize: 14, fontWeight: 'bold' }}>
          {index + 1}
        </Tag>
      )
    },
    {
      title: scope === 'province' ? '省份' : '城市',
      dataIndex: 'regionName',
      key: 'regionName'
    },
    {
      title: getDimensionLabel(),
      dataIndex: dimension,
      key: dimension,
      render: (value: number) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {value.toFixed(1)}%
        </span>
      ),
      sorter: (a: any, b: any) => a[dimension] - b[dimension]
    },
    {
      title: '水体总数',
      dataIndex: 'waterBodyCount',
      key: 'waterBodyCount'
    },
    {
      title: '达标数',
      dataIndex: 'qualifiedWaterBodyCount',
      key: 'qualifiedWaterBodyCount'
    },
    {
      title: '治理项目数',
      dataIndex: 'projectCount',
      key: 'projectCount'
    }
  ]

  return (
    <Card
      title="治理效率排名"
      loading={loading}
      extra={
        <Space>
          <Radio.Group value={scope} onChange={(e) => setScope(e.target.value)} size="small">
            <Radio.Button value="province">按省份</Radio.Button>
            <Radio.Button value="city">按城市</Radio.Button>
          </Radio.Group>
          <Radio.Group value={dimension} onChange={(e) => setDimension(e.target.value)} size="small">
            <Radio.Button value="waterQualityComplianceRate">达标率</Radio.Button>
            <Radio.Button value="governanceCompletionRate">完成率</Radio.Button>
            <Radio.Button value="publicSatisfaction">满意度</Radio.Button>
          </Radio.Group>
        </Space>
      }
    >
      <Table
        dataSource={sortedData}
        columns={columns}
        rowKey="regionCode"
        pagination={false}
        size="small"
      />
    </Card>
  )
}

export default RankingList
