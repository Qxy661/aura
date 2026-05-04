/** Browser Push Notification utilities. */

export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function sendNotification(title: string, body: string, tag?: string): void {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/puppy.png",
      badge: "/puppy.png",
      tag: tag || "aura-notification",
    });
  } catch {
    // Service worker not available, fall back
  }
}

export function scheduleTodoReminder(todoTitle: string, deadline: string): void {
  if (!deadline) return;
  try {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diff = deadlineDate.getTime() - now.getTime();

    // Remind 1 hour before deadline
    const remindAt = diff - 3600000;
    if (remindAt > 0 && remindAt < 86400000) {
      // Only schedule if within 24 hours
      setTimeout(() => {
        sendNotification(
          "待办提醒",
          `「${todoTitle}」即将到期！`,
          `todo-${todoTitle}`
        );
      }, remindAt);
    }

    // Also remind at deadline
    if (diff > 0 && diff < 86400000) {
      setTimeout(() => {
        sendNotification(
          "待办到期",
          `「${todoTitle}」已到期！`,
          `todo-due-${todoTitle}`
        );
      }, diff);
    }
  } catch {
    // Invalid date
  }
}
