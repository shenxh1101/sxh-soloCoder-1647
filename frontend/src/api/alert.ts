import { request } from '@/utils/request'
import type {
  Alert,
  AlertDetail,
  AlertListParams,
  PageResult,
  AlertHandleParams,
  AlertStats
} from '@/types'

export function getAlertList(params: AlertListParams): Promise<PageResult<Alert>> {
  return request<PageResult<Alert>>({
    url: '/api/alert/list',
    method: 'get',
    params
  })
}

export function getAlertDetail(id: number): Promise<AlertDetail> {
  return request<AlertDetail>({
    url: `/api/alert/${id}`,
    method: 'get'
  })
}

export function handleAlert(params: AlertHandleParams): Promise<void> {
  return request<void>({
    url: `/api/alert/${params.id}/handle`,
    method: 'post',
    data: params
  })
}

export function getAlertStats(params?: { startDate?: string; endDate?: string }): Promise<AlertStats> {
  return request<AlertStats>({
    url: '/api/alert/stats',
    method: 'get',
    params
  })
}
