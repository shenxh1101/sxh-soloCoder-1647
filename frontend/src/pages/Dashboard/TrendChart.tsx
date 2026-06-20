import { useState, useMemo } from 'react'
import { Card, Radio, DatePicker, Space, Checkbox, Spin } from 'antd'
import ReactECharts from 'echarts-for-react'
import type { DashboardStats } from '@/types'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

interface TrendChartProps {
  data?: DashboardStats['trend']
  loading?: boolean
  onTimeRangeChange?: (days: number, startDate?: string, endDate?: string) => void
}

type TimeRange = '7' | '30' | '90' | 'custom'

type TrendItem = DashboardStats['trend'][number]

interface IndicatorConfig {
  key: keyof Omit<TrendItem, 'date'>
  name: string
  color: string
  unit: string
}

const INDICATORS: IndicatorConfig[] = [
  { key: 'waterQualityComplianceRate', name: '水质达标率', color: '#52c41a', unit: '%' },
  { key: 'governanceCompletionRate', name: '治理完成率', color: '#1890ff', unit: '%' },
  { key: 'publicSatisfaction', name: '公众满意度', color: '#722ed1', unit: '%' },
  { key: 'outletAbnormalityIndex', name: '排污口异常指数', color: '#fa8c16', unit: '' }
]

function TrendChart({ data = [], loading, onTimeRangeChange }: TrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30')
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([
    'waterQualityComplianceRate',
    'governanceCompletionRate',
    'publicSatisfaction',
    'outletAbnormalityIndex'
  ])

  const chartOption = useMemo(() => {
    if (!data || data.length === 0) return {}

    const dates = data.map((item) => item.date)
    const selectedConfig = INDICATORS.filter((item) => selectedIndicators.includes(item.key))

    const series = selectedConfig.map((indicator) => ({
      name: indicator.name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: 2,
        color: indicator.color
      },
      itemStyle: {
        color: indicator.color
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: indicator.color + '40' },
            { offset: 1, color: indicator.color + '05' }
          ]
        }
      },
      data: data.map((item) => item[indicator.key])
    }))

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params: any) => {
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${params[0].axisValue}</div>`
          params.forEach((param: any) => {
            const config = INDICATORS.find((i) => i.name === param.seriesName)
            result += `
              <div style="display: flex; justify-content: space-between; gap: 16px; margin: 4px 0;">
                <span>
                  <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color}; margin-right: 8px;"></span>
                  ${param.seriesName}
                </span>
                <span style="font-weight: bold;">${param.value}${config?.unit || ''}</span>
              </div>
            `
          })
          return result
        }
      },
      legend: {
        data: selectedConfig.map((item) => item.name),
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: {
          lineStyle: { color: '#e8e8e8' }
        },
        axisLabel: {
          color: '#666',
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        splitLine: {
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 11,
          formatter: '{value}%'
        }
      },
      series
    }
  }, [data, selectedIndicators])

  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value)
    if (value !== 'custom') {
      onTimeRangeChange?.(parseInt(value))
    }
  }

  const handleCustomRangeChange = (dates: any) => {
    setCustomRange(dates as [Dayjs, Dayjs])
    if (dates && dates[0] && dates[1]) {
      const startDate = dates[0].format('YYYY-MM-DD')
      const endDate = dates[1].format('YYYY-MM-DD')
      const days = dates[1].diff(dates[0], 'day') + 1
      onTimeRangeChange?.(days, startDate, endDate)
    }
  }

  const handleIndicatorChange = (checkedValues: string[]) => {
    setSelectedIndicators(checkedValues)
  }

  return (
    <Card
      title="核心指标趋势图"
      loading={loading}
      extra={
        <Space wrap>
          <Radio.Group value={timeRange} onChange={(e) => handleTimeRangeChange(e.target.value)} size="small">
            <Radio.Button value="7">近7天</Radio.Button>
            <Radio.Button value="30">近30天</Radio.Button>
            <Radio.Button value="90">近90天</Radio.Button>
            <Radio.Button value="custom">自定义</Radio.Button>
          </Radio.Group>
          {timeRange === 'custom' && (
            <RangePicker
              value={customRange}
              onChange={handleCustomRangeChange}
              size="small"
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          )}
          <Checkbox.Group
            value={selectedIndicators}
            onChange={handleIndicatorChange}
            options={INDICATORS.map((item) => ({
              label: item.name,
              value: item.key
            }))}
          />
        </Space>
      }
    >
      <Spin spinning={loading}>
        <ReactECharts option={chartOption} style={{ height: 400 }} />
      </Spin>
    </Card>
  )
}

export default TrendChart
