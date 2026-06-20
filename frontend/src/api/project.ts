import { request } from '@/utils/request'
import type {
  Project,
  ProjectDetail,
  ProjectListParams,
  PageResult,
  ProgressRecord,
  ProgressSubmitParams
} from '@/types'

export function getProjectList(params: ProjectListParams): Promise<PageResult<Project>> {
  return request<PageResult<Project>>({
    url: '/api/project/list',
    method: 'get',
    params
  })
}

export function getProjectDetail(id: number): Promise<ProjectDetail> {
  return request<ProjectDetail>({
    url: `/api/project/${id}`,
    method: 'get'
  })
}

export function getProjectProgress(
  id: number,
  params?: { startDate?: string; endDate?: string }
): Promise<ProgressRecord[]> {
  return request<ProgressRecord[]>({
    url: `/api/project/${id}/progress`,
    method: 'get',
    params
  })
}

export function submitProgress(data: ProgressSubmitParams): Promise<void> {
  return request<void>({
    url: `/api/project/${data.projectId}/progress`,
    method: 'post',
    data
  })
}
