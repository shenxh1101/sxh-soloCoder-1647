import { request } from '@/utils/request'
import type {
  WaterBody,
  WaterBodyDetail,
  WaterBodyListParams,
  PageResult,
  WaterBodyTrendPoint,
  Project,
  Complaint
} from '@/types'

export function getWaterBodyList(params: WaterBodyListParams): Promise<PageResult<WaterBody>> {
  return request<PageResult<WaterBody>>({
    url: '/api/water-body/list',
    method: 'get',
    params
  })
}

export function getWaterBodyDetail(id: number): Promise<WaterBodyDetail> {
  return request<WaterBodyDetail>({
    url: `/api/water-body/${id}`,
    method: 'get'
  })
}

export function getWaterBodyTrend(
  id: number,
  params?: { days?: number; indicators?: string[] }
): Promise<WaterBodyTrendPoint[]> {
  return request<WaterBodyTrendPoint[]>({
    url: `/api/water-body/${id}/trend`,
    method: 'get',
    params
  })
}

export function getWaterBodyProjects(
  id: number,
  params?: { pageNum?: number; pageSize?: number }
): Promise<PageResult<Project>> {
  return request<PageResult<Project>>({
    url: `/api/water-body/${id}/projects`,
    method: 'get',
    params
  })
}

export function getWaterBodyComplaints(
  id: number,
  params?: { pageNum?: number; pageSize?: number }
): Promise<PageResult<Complaint>> {
  return request<PageResult<Complaint>>({
    url: `/api/water-body/${id}/complaints`,
    method: 'get',
    params
  })
}
