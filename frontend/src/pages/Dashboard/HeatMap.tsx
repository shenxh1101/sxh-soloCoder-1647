import { useMemo, useState } from 'react'
import { Card, Button, Empty, Spin } from 'antd'
import ReactECharts from 'echarts-for-react'
import type { DashboardStats, StatsFilterParams } from '@/types'

interface HeatMapProps {
  data?: DashboardStats['regionList']
  loading?: boolean
  filterParams?: StatsFilterParams
  onDrillDown?: (province: string | null) => void
}

type RegionItem = DashboardStats['regionList'][number]

function getRateColor(rate: number): string {
  const ratio = Math.max(0, Math.min(1, rate / 100))
  const r = Math.round(245 * (1 - ratio) + 82 * ratio)
  const g = Math.round(34 * (1 - ratio) + 196 * ratio)
  const b = Math.round(45 * (1 - ratio) + 26 * ratio)
  return `rgb(${r}, ${g}, ${b})`
}

function HeatMap({ data = [], loading, filterParams, onDrillDown }: HeatMapProps) {
  const [drillDown, setDrillDown] = useState<string | null>(null)

  const displayData = useMemo(() => {
    if (!filterParams?.province && !drillDown) {
      return data.filter(item => item.level === 'province')
    }
    const provinceName = drillDown || filterParams?.province
    if (provinceName) {
      return data.filter(item => item.level === 'city' && item.provinceName === provinceName)
    }
    return data.filter(item => item.level === 'province')
  }, [data, drillDown, filterParams])

  const sortedData = useMemo(
    () => [...displayData].sort((a, b) => a.waterQualityComplianceRate - b.waterQualityComplianceRate),
    [displayData]
  )

  const getRegionName = useMemo(() => {
    return (item: RegionItem) => item.regionName
  }, [])

  const buildTooltipHtml = (raw: RegionItem) => {
    const name = getRegionName(raw)
    return [
      `<div style="font-weight:bold;margin-bottom:6px;font-size:13px">${name}</div>`,
      `<div style="display:flex;justify-content:space-between;gap:24px">`,
      `<span>水质达标率</span><span style="font-weight:600">${raw.waterQualityComplianceRate.toFixed(1)}%</span>`,
      `</div>`,
      `<div style="display:flex;justify-content:space-between;gap:24px">`,
      `<span>治理完成率</span><span style="font-weight:600">${raw.governanceCompletionRate.toFixed(1)}%</span>`,
      `</div>`,
      `<div style="display:flex;justify-content:space-between;gap:24px">`,
      `<span>公众满意度</span><span style="font-weight:600">${raw.publicSatisfaction.toFixed(1)}%</span>`,
      `</div>`,
      `<div style="display:flex;justify-content:space-between;gap:24px">`,
      `<span>水体总数</span><span style="font-weight:600">${raw.waterBodyCount}</span>`,
      `</div>`,
      `<div style="display:flex;justify-content:space-between;gap:24px">`,
      `<span>达标水体</span><span style="font-weight:600">${raw.qualifiedWaterBodyCount}</span>`,
      `</div>`,
      `<div style="display:flex;justify-content:space-between;gap:24px">`,
      `<span>治理项目数</span><span style="font-weight:600">${raw.projectCount}</span>`,
      `</div>`
    ].join('')
  }

  const chartOption = useMemo(() => {
    if (sortedData.length === 0) return null

    const names = sortedData.map(getRegionName)

    const barData = sortedData.map((d) => ({
      value: d.waterQualityComplianceRate,
      itemStyle: { color: getRateColor(d.waterQualityComplianceRate) },
      rawData: d
    }))

    const scatterData = sortedData.map((d) => ({
      value: [d.governanceCompletionRate, d.publicSatisfaction],
      name: getRegionName(d),
      rawData: d,
      itemStyle: { color: getRateColor(d.waterQualityComplianceRate) }
    }))

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const raw = params.data?.rawData
          if (!raw) return ''
          return buildTooltipHtml(raw)
        }
      },
      grid: [
        { left: 100, right: '38%', top: 30, bottom: 30 },
        { left: '66%', right: 40, top: 30, bottom: 30 }
      ],
      xAxis: [
        {
          type: 'value',
          gridIndex: 0,
          max: 100,
          name: '达标率 (%)',
          nameLocation: 'center',
          nameGap: 25,
          axisLabel: { formatter: '{value}%' },
          splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
        },
        {
          type: 'value',
          gridIndex: 1,
          max: 100,
          name: '完成率 (%)',
          nameLocation: 'center',
          nameGap: 25,
          axisLabel: { formatter: '{value}%' },
          splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
        }
      ],
      yAxis: [
        {
          type: 'category',
          gridIndex: 0,
          data: names,
          axisLabel: {
            fontSize: 11,
            width: 80,
            overflow: 'truncate',
            ellipsis: '...'
          },
          triggerEvent: true
        },
        {
          type: 'value',
          gridIndex: 1,
          max: 100,
          name: '满意度 (%)',
          nameLocation: 'center',
          nameGap: 45,
          axisLabel: { formatter: '{value}%' },
          splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
        }
      ],
      series: [
        {
          name: '达标率',
          type: 'bar',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: barData,
          barMaxWidth: 24,
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => `${p.value.toFixed(1)}%`,
            fontSize: 10
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0,0,0,0.25)'
            }
          },
          ...(drillDown || filterParams?.province
            ? {}
            : {
                cursor: 'pointer'
              })
        },
        {
          name: '指标分布',
          type: 'scatter',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: scatterData,
          symbolSize: 14,
          label: {
            show: sortedData.length <= 15,
            formatter: '{b}',
            position: 'right',
            fontSize: 9,
            color: '#666'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0,0,0,0.25)'
            }
          }
        }
      ]
    }
  }, [sortedData, drillDown, getRegionName, filterParams?.province])

  const handleChartClick = (params: any) => {
    if (drillDown || filterParams?.province) return
    if (params.componentType === 'series' && params.seriesType === 'bar') {
      const provinceName = params.name
      if (provinceName) {
        setDrillDown(provinceName)
        onDrillDown?.(provinceName)
      }
    }
  }

  const handleBack = () => {
    setDrillDown(null)
    onDrillDown?.(null)
  }

  const chartHeight = Math.max(300, sortedData.length * 36 + 60)
  const currentProvince = drillDown || filterParams?.province

  return (
    <Card
      title={currentProvince ? `${currentProvince} — 城市治理数据` : '全国水体治理达标率'}
      extra={
        currentProvince ? (
          <Button type="link" onClick={handleBack}>
            ← 返回全国
          </Button>
        ) : null
      }
    >
      <Spin spinning={loading}>
        {chartOption ? (
          <ReactECharts
            option={chartOption}
            style={{ height: chartHeight }}
            onEvents={{ click: handleChartClick }}
          />
        ) : (
          !loading && <Empty description="暂无数据" />
        )}
      </Spin>
    </Card>
  )
}

export default HeatMap
