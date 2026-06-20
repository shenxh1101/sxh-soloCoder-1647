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
  const { pageNum, pageSize, ...rest } = params
  return request<PageResult<Alert>>({
    url: '/api/alert',
    method: 'get',
    params: {
      page: pageNum,
      pageSize,
      ...rest
    }
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
    method: 'put',
    data: {
      handleMeasure: params.handleResult,
      handleResult: params.handleResult,
      handlerPerson: params.handlerName
    }
  })
}

export function getAlertStats(params?: { startDate?: string; endDate?: string }): Promise<AlertStats> {
  return request<AlertStats>({
    url: '/api/alert/statistics',
    method: 'get',
    params
  })
}
