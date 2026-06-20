import { request } from '@/utils/request'
import type {
  Approval,
  ApprovalDetail,
  ApprovalListParams,
  PageResult,
  ApprovalSubmitParams,
  ApprovalHandleParams
} from '@/types'

export function getApprovalList(params: ApprovalListParams): Promise<PageResult<Approval>> {
  return request<PageResult<Approval>>({
    url: '/api/approval/list',
    method: 'get',
    params
  })
}

export function getApprovalDetail(id: number): Promise<ApprovalDetail> {
  return request<ApprovalDetail>({
    url: `/api/approval/${id}`,
    method: 'get'
  })
}

export function submitApproval(data: ApprovalSubmitParams): Promise<Approval> {
  return request<Approval>({
    url: '/api/approval',
    method: 'post',
    data
  })
}

export function approve(params: ApprovalHandleParams): Promise<void> {
  return request<void>({
    url: `/api/approval/${params.id}/approve`,
    method: 'post',
    data: { opinion: params.opinion }
  })
}

export function reject(params: ApprovalHandleParams): Promise<void> {
  return request<void>({
    url: `/api/approval/${params.id}/reject`,
    method: 'post',
    data: { opinion: params.opinion }
  })
}
