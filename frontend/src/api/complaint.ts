import { request } from '@/utils/request'
import type {
  Complaint,
  ComplaintDetail,
  ComplaintListParams,
  PageResult,
  ComplaintHandleParams,
  ComplaintStats
} from '@/types'

export function getComplaintList(params: ComplaintListParams): Promise<PageResult<Complaint>> {
  return request<PageResult<Complaint>>({
    url: '/api/complaint/list',
    method: 'get',
    params
  })
}

export function getComplaintDetail(id: number): Promise<ComplaintDetail> {
  return request<ComplaintDetail>({
    url: `/api/complaint/${id}`,
    method: 'get'
  })
}

export function handleComplaint(params: ComplaintHandleParams): Promise<void> {
  return request<void>({
    url: `/api/complaint/${params.id}/handle`,
    method: 'post',
    data: params
  })
}

export function getComplaintStats(params?: { startDate?: string; endDate?: string }): Promise<ComplaintStats> {
  return request<ComplaintStats>({
    url: '/api/complaint/stats',
    method: 'get',
    params
  })
}
