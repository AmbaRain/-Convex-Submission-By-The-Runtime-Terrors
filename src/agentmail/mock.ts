import type {
  NotificationRequest,
  NotificationResult,
} from "../types"

export class MockAgentMailProvider {
  private sent: Map<string, NotificationResult> = new Map()

  async sendNotification(
    request: NotificationRequest,
  ): Promise<NotificationResult> {
    const key = `notification-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`

    const result: NotificationResult = {
      key,
      sent: true,
      delivered_at: new Date().toISOString(),
    }

    this.sent.set(key, result)

    return result
  }

  async sendBatchNotifications(
    requests: NotificationRequest[],
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = []

    for (const request of requests) {
      const result = await this.sendNotification(request)
      results.push(result)
    }

    return results
  }

  async markAsRead(key: string): Promise<void> {
    // No-op in mock
  }

  getSentMessages(): ReadonlyMap<string, NotificationResult> {
    return this.sent
  }

  getMessageCount(): number {
    return this.sent.size
  }

  clear(): void {
    this.sent.clear()
  }
}