import { request } from '@/utils/request'
import type {
  Task,
  TaskDetail,
  TaskListParams,
  PageResult,
  FundDisbursement,
  TaskFormData,
  FundFormData,
  FundAbnormalResult,
  ImportResult
} from '@/types'

export function getTaskList(params: TaskListParams): Promise<PageResult<Task>> {
  return request<PageResult<Task>>({
    url: '/api/task/list',
    method: 'get',
    params
  })
}

export function getTaskDetail(id: number): Promise<TaskDetail> {
  return request<TaskDetail>({
    url: `/api/task/${id}`,
    method: 'get'
  })
}

export function createTask(data: TaskFormData): Promise<Task> {
  return request<Task>({
    url: '/api/task',
    method: 'post',
    data
  })
}

export function updateTask(id: number, data: TaskFormData): Promise<Task> {
  return request<Task>({
    url: `/api/task/${id}`,
    method: 'put',
    data
  })
}

export function deleteTask(id: number): Promise<void> {
  return request<void>({
    url: `/api/task/${id}`,
    method: 'delete'
  })
}

export function importTasks(file: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  return request<ImportResult>({
    url: '/api/task/import',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function getFundList(taskId: number): Promise<FundDisbursement[]> {
  return request<FundDisbursement[]>({
    url: `/api/task/${taskId}/fund`,
    method: 'get'
  })
}

export function createFund(taskId: number, data: FundFormData): Promise<FundDisbursement> {
  return request<FundDisbursement>({
    url: `/api/task/${taskId}/fund`,
    method: 'post',
    data
  })
}

export function checkFundAbnormal(taskId: number): Promise<FundAbnormalResult> {
  return request<FundAbnormalResult>({
    url: `/api/task/${taskId}/fund/check`,
    method: 'post'
  })
}
