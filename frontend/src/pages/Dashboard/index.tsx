import { useMemo, useCallback, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Row, Col, Select, Space, Typography, Spin } from 'antd'
import { FilterOutlined } from '@ant-design/icons'
import HeatMap from './HeatMap'
import RankingList from './RankingList'
import OverviewCards from './OverviewCards'
import TrendChart from './TrendChart'
import { getDashboardStats } from '@/api/stats'
import type { StatsFilterParams, DashboardStats } from '@/types'

const { Title, Text } = Typography

const WATER_LEVEL_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'black_odorous', label: '黑臭级' },
  { value: 'mild', label: '轻度黑臭' },
  { value: 'severe', label: '重度黑臭' },
  { value: 'eliminated', label: '已消除' }
]

const PROVINCE_OPTIONS = [
  { value: 'all', label: '全部省份' },
  { value: '北京市', label: '北京市' },
  { value: '上海市', label: '上海市' },
  { value: '广东省', label: '广东省' },
  { value: '江苏省', label: '江苏省' },
  { value: '浙江省', label: '浙江省' },
  { value: '山东省', label: '山东省' },
  { value: '四川省', label: '四川省' },
  { value: '湖北省', label: '湖北省' },
  { value: '湖南省', label: '湖南省' },
  { value: '河南省', label: '河南省' }
]

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [days, setDays] = useState(30)

  const province = searchParams.get('province') || 'all'
  const waterLevel = searchParams.get('waterLevel') || 'all'

  const filterParams = useMemo<StatsFilterParams>(() => ({
    province: province !== 'all' ? province : undefined,
    waterLevel: waterLevel !== 'all' ? waterLevel : undefined
  }), [province, waterLevel])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDashboardStats({
        ...filterParams,
        days
      })
      setDashboardData(data)
    } finally {
      setLoading(false)
    }
  }, [filterParams, days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleProvinceChange = useCallback((value: string) => {
    setSearchParams((prev) => {
      if (value === 'all') {
        prev.delete('province')
      } else {
        prev.set('province', value)
      }
      if (waterLevel !== 'all') {
        prev.set('waterLevel', waterLevel)
      }
      return prev
    })
  }, [setSearchParams, waterLevel])

  const handleWaterLevelChange = useCallback((value: string) => {
    setSearchParams((prev) => {
      if (value === 'all') {
        prev.delete('waterLevel')
      } else {
        prev.set('waterLevel', value)
      }
      if (province !== 'all') {
        prev.set('province', province)
      }
      return prev
    })
  }, [setSearchParams, province])

  const handleDrillDown = useCallback((drillProvince: string | null) => {
    setSearchParams((prev) => {
      if (drillProvince) {
        prev.set('province', drillProvince)
      } else {
        prev.delete('province')
      }
      if (waterLevel !== 'all') {
        prev.set('waterLevel', waterLevel)
      }
      return prev
    })
  }, [setSearchParams, waterLevel])

  const handleTimeRangeChange = useCallback((newDays: number) => {
    setDays(newDays)
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          水环境治理核心看板
          {province !== 'all' && (
            <Text type="secondary" style={{ fontSize: 14, marginLeft: 12 }}>
              - {province}
            </Text>
          )}
          {waterLevel !== 'all' && (
            <Text type="secondary" style={{ fontSize: 14, marginLeft: 12 }}>
              - {WATER_LEVEL_OPTIONS.find(o => o.value === waterLevel)?.label}
            </Text>
          )}
        </Title>
        <Space>
          <FilterOutlined />
          <span>筛选条件：</span>
          <Select
            value={province}
            onChange={handleProvinceChange}
            style={{ width: 150 }}
            options={PROVINCE_OPTIONS}
          />
          <Select
            value={waterLevel}
            onChange={handleWaterLevelChange}
            style={{ width: 150 }}
            options={WATER_LEVEL_OPTIONS}
          />
        </Space>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <OverviewCards 
              data={dashboardData?.overview} 
              loading={loading}
            />
          </Col>

          <Col xs={24} lg={16}>
            <HeatMap 
              data={dashboardData?.regionList} 
              loading={loading}
              filterParams={filterParams}
              onDrillDown={handleDrillDown}
            />
          </Col>

          <Col xs={24} lg={8}>
            <RankingList 
              data={dashboardData?.regionList} 
              loading={loading}
            />
          </Col>

          <Col xs={24}>
            <TrendChart 
              data={dashboardData?.trend} 
              loading={loading}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </Col>
        </Row>
      </Spin>
    </div>
  )
}

export default Dashboard
