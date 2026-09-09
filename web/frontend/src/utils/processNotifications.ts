export type ProcessNotificationStatus = 'running' | 'success' | 'error'

export type ProcessNotification = {
  id: string
  title: string
  message?: string
  status: ProcessNotificationStatus
  progress?: number
  createdAt: string
  updatedAt: string
}

export type ProcessNotificationInput = {
  id: string
  title: string
  message?: string
  status: ProcessNotificationStatus
  progress?: number
}

export const PROCESS_NOTIFICATION_EVENT = 'agrocontrol:process-notification'
export const PROCESS_NOTIFICATION_STORAGE_KEY = 'agrocontrol.processNotifications'

export function notifyProcess(input: ProcessNotificationInput) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent<ProcessNotificationInput>(PROCESS_NOTIFICATION_EVENT, { detail: input }))
}
