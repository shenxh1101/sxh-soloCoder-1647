import { useState, useEffect, useMemo } from 'react'
import { Card, Radio, DatePicker, Space, Checkbox, Spin } from 'antd'
import ReactECharts from 'echarts-for-react'
import { getTrendData } from '@/api/stats'
import type { TrendData, StatsFilterParams } from '@/types'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

interface TrendChartProps {
  filterParams?: StatsFilterParams
}

type TimeRange = '7' | '30' | '90' | 'custom'

interface IndicatorConfig {
  key: keyof TrendData['days'][0]
  name: string
  color: string
  unit: string
}

const INDICATORS: IndicatorConfig[] = [
  { key: 'qualifiedRate', name: '水质达标率', color: '#52c41a', unit: '%' },
  { key: 'completionRate', name: '治理完成率', color: '#1890ff', unit: '%' },
  { key: 'satisfaction', name: '公众满意度', color: '#722ed1', unit: '%' },
  { key: 'abnormalIndex', name: '排污口异常指数', color: '#fa8c16', unit: '' }
]

function TrendChart({ filterParams }: TrendChartProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<TrendData | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('30')
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([
    'qualifiedRate',
    'completionRate',
    'satisfaction',
    'abnormalIndex'
  ])

  useEffect(() => {
    fetchData()
  }, [filterParams, timeRange, customRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      let days = parseInt(timeRange)
      let params: StatsFilterParams & { days?: number; startDate?: string; endDate?: string } = {
        ...filterParams
      }

      if (timeRange === 'custom' && customRange) {
        params.startDate = customRange[0].format('YYYY-MM-DD')
        params.endDate = customRange[1].format('YYYY-MM-DD')
      } else {
        params.days = days
      }

      const result = await getTrendData(params)
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  const chartOption = useMemo(() => {
    if (!data) return {}

    const dates = data.days.map((item) => item.date)
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
      data: data.days.map((item) => item[indicator.key as keyof typeof item])
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

  const handleIndicatorChange = (checkedValues: string[]) => {
    setSelectedIndicators(checkedValues)
  }

  return (
    <Card
      title="核心指标趋势图"
      loading={loading}
      extra={
        <Space wrap>
          <Radio.Group value={timeRange} onChange={(e) => setTimeRange(e.target.value)} size="small">
            <Radio.Button value="7">近7天</Radio.Button>
            <Radio.Button value="30">近30天</Radio.Button>
            <Radio.Button value="90">近90天</Radio.Button>
            <Radio.Button value="custom">自定义</Radio.Button>
          </Radio.Group>
          {timeRange === 'custom' && (
            <RangePicker
              value={customRange}
              onChange={(dates) => setCustomRange(dates as [Dayjs, Dayjs])}
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
