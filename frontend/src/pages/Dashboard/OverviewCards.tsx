import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Spin } from 'antd'
import {
  RiseOutlined,
  FallOutlined,
  DashboardOutlined,
  CheckCircleOutlined,
  SmileOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { getWaterBodyStats, getTrendData } from '@/api/stats'
import type { StatsFilterParams } from '@/types'

interface OverviewCardsProps {
  filterParams?: StatsFilterParams
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

function OverviewCards({ filterParams }: OverviewCardsProps) {
  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState<CardData[]>([])

  useEffect(() => {
    fetchData()
  }, [filterParams])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [waterStats, trendData] = await Promise.all([
        getWaterBodyStats(filterParams),
        getTrendData(filterParams)
      ])

      const cardData: CardData[] = [
        {
          title: '水质达标率',
          value: waterStats.qualifiedRate,
          suffix: '%',
          icon: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 32 }} />,
          color: '#52c41a',
          yearOnYear: trendData.comparison.yearOnYear,
          monthOnMonth: trendData.comparison.monthOnMonth
        },
        {
          title: '治理完成率',
          value: 0,
          suffix: '%',
          icon: <DashboardOutlined style={{ color: '#1890ff', fontSize: 32 }} />,
          color: '#1890ff',
          yearOnYear: 3.2,
          monthOnMonth: 1.5
        },
        {
          title: '公众满意度',
          value: 0,
          suffix: '%',
          icon: <SmileOutlined style={{ color: '#722ed1', fontSize: 32 }} />,
          color: '#722ed1',
          yearOnYear: 2.8,
          monthOnMonth: 0.9
        },
        {
          title: '排污口异常指数',
          value: 0,
          suffix: '',
          icon: <WarningOutlined style={{ color: '#fa8c16', fontSize: 32 }} />,
          color: '#fa8c16',
          yearOnYear: -5.3,
          monthOnMonth: -2.1
        }
      ]

      if (trendData.days.length > 0) {
        const latest = trendData.days[trendData.days.length - 1]
        cardData[1].value = latest.completionRate
        cardData[2].value = latest.satisfaction
        cardData[3].value = latest.abnormalIndex
      }

      setCards(cardData)
    } finally {
      setLoading(false)
    }
  }

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
