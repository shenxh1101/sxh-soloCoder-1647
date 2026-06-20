import { request } from '@/utils/request'
import type {
  SystemConfig,
  ConfigListParams,
  PageResult,
  ConfigUpdateParams,
  BatchUpdateParams,
  JobInfo,
  JobControlParams
} from '@/types'

export function getConfigList(params?: ConfigListParams): Promise<PageResult<SystemConfig>> {
  return request<PageResult<SystemConfig>>({
    url: '/api/config/list',
    method: 'get',
    params
  })
}

export function getConfigValue(key: string): Promise<string> {
  return request<string>({
    url: `/api/config/${key}`,
    method: 'get'
  })
}

export function updateConfig(key: string, data: ConfigUpdateParams): Promise<void> {
  return request<void>({
    url: `/api/config/${key}`,
    method: 'put',
    data
  })
}

export function batchUpdateConfig(data: BatchUpdateParams): Promise<void> {
  return request<void>({
    url: '/api/config/batch',
    method: 'put',
    data
  })
}

export function resetConfigToDefault(keys: string[]): Promise<void> {
  return request<void>({
    url: '/api/config/reset',
    method: 'post',
    data: { keys }
  })
}

export function getJobList(): Promise<JobInfo[]> {
  return request<JobInfo[]>({
    url: '/api/config/job/list',
    method: 'get'
  })
}

export function controlJob(data: JobControlParams): Promise<void> {
  return request<void>({
    url: '/api/config/job/control',
    method: 'post',
    data
  })
}

export function getJobLogs(jobId: string): Promise<{ time: string; content: string; success: boolean }[]> {
  return request<{ time: string; content: string; success: boolean }[]>({
    url: `/api/config/job/${jobId}/logs`,
    method: 'get'
  })
}
