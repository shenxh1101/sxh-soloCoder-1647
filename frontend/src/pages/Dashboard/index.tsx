import { useState } from 'react'
import { Row, Col, Select, Space, Typography } from 'antd'
import { FilterOutlined } from '@ant-design/icons'
import HeatMap from './HeatMap'
import RankingList from './RankingList'
import OverviewCards from './OverviewCards'
import TrendChart from './TrendChart'
import type { StatsFilterParams } from '@/types'

const { Title } = Typography

function Dashboard() {
  const [filterParams, setFilterParams] = useState<StatsFilterParams>({})
  const [province, setProvince] = useState<string>('all')
  const [waterLevel, setWaterLevel] = useState<string>('all')

  const handleFilterChange = () => {
    setFilterParams({
      province: province !== 'all' ? province : undefined,
      waterLevel: waterLevel !== 'all' ? waterLevel : undefined
    })
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          水环境治理核心看板
        </Title>
        <Space>
          <FilterOutlined />
          <span>筛选条件：</span>
          <Select
            value={province}
            onChange={setProvince}
            onBlur={handleFilterChange}
            style={{ width: 150 }}
            options={[
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
            ]}
          />
          <Select
            value={waterLevel}
            onChange={setWaterLevel}
            onBlur={handleFilterChange}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: '全部等级' },
              { value: '1', label: 'Ⅰ类水质' },
              { value: '2', label: 'Ⅱ类水质' },
              { value: '3', label: 'Ⅲ类水质' },
              { value: '4', label: 'Ⅳ类水质' },
              { value: '5', label: 'Ⅴ类水质' }
            ]}
          />
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <OverviewCards filterParams={filterParams} />
        </Col>

        <Col xs={24} lg={16}>
          <HeatMap filterParams={filterParams} />
        </Col>

        <Col xs={24} lg={8}>
          <RankingList filterParams={filterParams} />
        </Col>

        <Col xs={24}>
          <TrendChart filterParams={filterParams} />
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
