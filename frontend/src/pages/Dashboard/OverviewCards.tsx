import { Row, Col, Card, Statistic, Spin } from 'antd'
import {
  RiseOutlined,
  FallOutlined,
  DashboardOutlined,
  CheckCircleOutlined,
  SmileOutlined,
  WarningOutlined
} from '@ant-design/icons'
import type { DashboardStats } from '@/types'

interface OverviewCardsProps {
  data?: DashboardStats['overview']
  loading?: boolean
}

interface CardData {
  title: string
  value: number
  suffix: string
  icon: React.ReactNode
  color: string
  yearOnYear: number
  monthOnMonth: number
}

function OverviewCards({ data, loading }: OverviewCardsProps) {
  const cards: CardData[] = data ? [
    {
      title: '水质达标率',
      value: data.waterQualityComplianceRate,
      suffix: '%',
      icon: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 32 }} />,
      color: '#52c41a',
      yearOnYear: data.yearOnYear.waterQualityComplianceRate,
      monthOnMonth: data.monthOnMonth.waterQualityComplianceRate
    },
    {
      title: '治理完成率',
      value: data.governanceCompletionRate,
      suffix: '%',
      icon: <DashboardOutlined style={{ color: '#1890ff', fontSize: 32 }} />,
      color: '#1890ff',
      yearOnYear: data.yearOnYear.governanceCompletionRate,
      monthOnMonth: data.monthOnMonth.governanceCompletionRate
    },
    {
      title: '公众满意度',
      value: data.publicSatisfaction,
      suffix: '%',
      icon: <SmileOutlined style={{ color: '#722ed1', fontSize: 32 }} />,
      color: '#722ed1',
      yearOnYear: data.yearOnYear.publicSatisfaction,
      monthOnMonth: data.monthOnMonth.publicSatisfaction
    },
    {
      title: '排污口异常指数',
      value: data.outletAbnormalityIndex,
      suffix: '',
      icon: <WarningOutlined style={{ color: '#fa8c16', fontSize: 32 }} />,
      color: '#fa8c16',
      yearOnYear: data.yearOnYear.outletAbnormalityIndex,
      monthOnMonth: data.monthOnMonth.outletAbnormalityIndex
    }
  ] : []

  const renderTrend = (value: number, type: 'yearOnYear' | 'monthOnMonth') => {
    const label = type === 'yearOnYear' ? '同比' : '环比'
    const isPositive = value >= 0
    const Icon = isPositive ? RiseOutlined : FallOutlined
    const color = isPositive ? '#52c41a' : '#f5222d'

    return (
      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
        {label}:
        <span style={{ color, marginLeft: 4 }}>
          <Icon /> {Math.abs(value).toFixed(1)}%
        </span>
      </div>
    )
  }

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]}>
        {cards.map((card, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Statistic
                    title={card.title}
                    value={card.value}
                    suffix={card.suffix}
                    precision={1}
                    valueStyle={{ color: card.color }}
                  />
                  {renderTrend(card.yearOnYear, 'yearOnYear')}
                  {renderTrend(card.monthOnMonth, 'monthOnMonth')}
                </div>
                <div style={{ marginTop: 8 }}>{card.icon}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Spin>
  )
}

export default OverviewCards
