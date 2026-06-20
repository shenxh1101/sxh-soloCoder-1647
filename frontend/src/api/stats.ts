import { request } from '@/utils/request'
import type { RegionStats, WaterBodyStats, RealtimeStats, TrendData, StatsFilterParams, DashboardStats } from '@/types'

export function getRegionStats(params?: StatsFilterParams): Promise<RegionStats[]> {
  return request<RegionStats[]>({
    url: '/api/stats/region',
    method: 'get',
    params
  })
}

export function getWaterBodyStats(params?: StatsFilterParams): Promise<WaterBodyStats> {
  return request<WaterBodyStats>({
    url: '/api/stats/water-body',
    method: 'get',
    params
  })
}

export function getRealtimeStats(waterBodyId?: number): Promise<RealtimeStats> {
  return request<RealtimeStats>({
    url: '/api/stats/realtime',
    method: 'get',
    params: { waterBodyId }
  })
}

export function getTrendData(params?: StatsFilterParams & { days?: number }): Promise<TrendData> {
  return request<TrendData>({
    url: '/api/stats/trend',
    method: 'get',
    params
  })
}

export function getDashboardStats(params?: StatsFilterParams & { days?: number }): Promise<DashboardStats> {
  return request<DashboardStats>({
    url: '/api/stats/dashboard',
    method: 'get',
    params
  })
}
