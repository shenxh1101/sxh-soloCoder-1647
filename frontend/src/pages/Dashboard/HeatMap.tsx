import { useState, useEffect, useMemo } from 'react'
import { Card, Select, Spin } from 'antd'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import { getRegionStats } from '@/api/stats'
import type { RegionStats, StatsFilterParams } from '@/types'

interface HeatMapProps {
  filterParams?: StatsFilterParams
}

function HeatMap({ filterParams }: HeatMapProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<RegionStats[]>([])
  const [level, setLevel] = useState<string>('all')
  const [drillDown, setDrillDown] = useState<{ province: string; provinceCode: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [filterParams, drillDown])

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await getRegionStats({
        ...filterParams,
        waterLevel: level !== 'all' ? level : undefined
      })
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  const chartOption = useMemo(() => {
    const mapData = data.map((item) => ({
      name: item.province,
      value: item.qualifiedRate,
      ...item
    }))

    const maxValue = Math.max(...data.map((item) => item.qualifiedRate), 100)

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (!params.data) return params.name
          const d = params.data
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 8px;">${d.name}</div>
              <div>水质达标率: ${d.value.toFixed(1)}%</div>
              <div>水体总数: ${d.waterBodyCount}</div>
              <div>达标水体: ${d.qualifiedCount}</div>
              <div>治理完成率: ${d.completionRate.toFixed(1)}%</div>
              <div>公众满意度: ${d.satisfaction.toFixed(1)}%</div>
              <div>治理项目数: ${d.treatmentCount}</div>
            </div>
          `
        }
      },
      visualMap: {
        min: 0,
        max: maxValue,
        left: 'left',
        top: 'bottom',
        text: ['高', '低'],
        calculable: true,
        inRange: {
          color: ['#f0f9eb', '#67c23a', '#409eff', '#e6a23c', '#f56c6c']
        }
      },
      series: [
        {
          name: '水质达标率',
          type: 'map',
          map: drillDown ? drillDown.province : 'china',
          roam: true,
          scaleLimit: {
            min: 0.8,
            max: 3
          },
          label: {
            show: true,
            fontSize: 10
          },
          emphasis: {
            label: {
              show: true,
              fontWeight: 'bold'
            },
            itemStyle: {
              areaColor: '#ffd700'
            }
          },
          data: mapData
        }
      ]
    }
  }, [data, drillDown])

  const handleChartClick = (params: any) => {
    if (params.componentType === 'series') {
      if (!drillDown) {
        const item = data.find((d) => d.province === params.name)
        if (item) {
          setDrillDown({ province: item.province, provinceCode: item.provinceCode })
        }
      }
    }
  }

  const handleBack = () => {
    setDrillDown(null)
  }

  const registerMap = () => {
    echarts.registerMap('china', {
      type: 'FeatureCollection',
      features: []
    })
  }

  useEffect(() => {
    registerMap()
  }, [])

  return (
    <Card
      title="全国水体治理热力图"
      loading={loading}
      extra={
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {drillDown && (
            <a onClick={handleBack} style={{ marginRight: 12 }}>
              ← 返回全国
            </a>
          )}
          <span>水体等级：</span>
          <Select
            value={level}
            onChange={setLevel}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: '全部' },
              { value: '1', label: 'Ⅰ类' },
              { value: '2', label: 'Ⅱ类' },
              { value: '3', label: 'Ⅲ类' },
              { value: '4', label: 'Ⅳ类' },
              { value: '5', label: 'Ⅴ类' }
            ]}
          />
        </div>
      }
    >
      <Spin spinning={loading}>
        <ReactECharts
          option={chartOption}
          style={{ height: 500 }}
          onEvents={{
            click: handleChartClick
          }}
        />
      </Spin>
    </Card>
  )
}

export default HeatMap
