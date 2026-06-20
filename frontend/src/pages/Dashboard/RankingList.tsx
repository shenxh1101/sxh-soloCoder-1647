import { useState, useEffect } from 'react'
import { Card, Radio, Table, Tag, Space } from 'antd'
import { getRegionStats } from '@/api/stats'
import type { RegionStats, StatsFilterParams } from '@/types'

interface RankingListProps {
  filterParams?: StatsFilterParams
}

type RankDimension = 'qualifiedRate' | 'completionRate' | 'satisfaction'
type RankScope = 'province' | 'city'

function RankingList({ filterParams }: RankingListProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<RegionStats[]>([])
  const [dimension, setDimension] = useState<RankDimension>('qualifiedRate')
  const [scope, setScope] = useState<RankScope>('province')

  useEffect(() => {
    fetchData()
  }, [filterParams, scope])

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await getRegionStats(filterParams)
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  const sortedData = [...data]
    .sort((a, b) => b[dimension] - a[dimension])
    .slice(0, 10)

  const getDimensionLabel = () => {
    switch (dimension) {
      case 'qualifiedRate':
        return '水质达标率'
      case 'completionRate':
        return '治理完成率'
      case 'satisfaction':
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
      dataIndex: 'province',
      key: 'province'
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
      sorter: (a: RegionStats, b: RegionStats) => a[dimension] - b[dimension]
    },
    {
      title: '水体总数',
      dataIndex: 'waterBodyCount',
      key: 'waterBodyCount'
    },
    {
      title: '达标数',
      dataIndex: 'qualifiedCount',
      key: 'qualifiedCount'
    },
    {
      title: '治理项目数',
      dataIndex: 'treatmentCount',
      key: 'treatmentCount'
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
            <Radio.Button value="qualifiedRate">达标率</Radio.Button>
            <Radio.Button value="completionRate">完成率</Radio.Button>
            <Radio.Button value="satisfaction">满意度</Radio.Button>
          </Radio.Group>
        </Space>
      }
    >
      <Table
        dataSource={sortedData}
        columns={columns}
        rowKey="provinceCode"
        pagination={false}
        size="small"
      />
    </Card>
  )
}

export default RankingList
