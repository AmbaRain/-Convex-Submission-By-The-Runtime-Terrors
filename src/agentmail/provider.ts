export interface AgentMailProvider {
  sendNotification(
    request: NotificationRequest,
  ): Promise<NotificationResult>

  sendBatchNotifications(
    requests: NotificationRequest[],
  ): Promise<NotificationResult[]>

  markAsRead(key: string): Promise<void>
}