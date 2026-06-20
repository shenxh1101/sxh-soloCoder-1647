import { request } from '@/utils/request'
import type {
  Report,
  ReportDetail,
  ReportListParams,
  PageResult,
  GenerateWeeklyParams
} from '@/types'

export function getReportList(params: ReportListParams): Promise<PageResult<Report>> {
  return request<PageResult<Report>>({
    url: '/api/report/list',
    method: 'get',
    params
  })
}

export function getReportDetail(id: number): Promise<ReportDetail> {
  return request<ReportDetail>({
    url: `/api/report/${id}`,
    method: 'get'
  })
}

export function generateWeeklyReport(params: GenerateWeeklyParams): Promise<Report> {
  return request<Report>({
    url: '/api/report/generate-weekly',
    method: 'post',
    data: params
  })
}

export function exportReport(id: number): Promise<Blob> {
  return request<Blob>({
    url: `/api/report/${id}/export`,
    method: 'get',
    responseType: 'blob'
  })
}
