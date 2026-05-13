/** Keep notification arrays small so profiles stay fast and the UI shows recent activity only. */
export const MAX_STORED_NOTIFICATIONS = 40;
export const MAX_NOTIFICATIONS_RESPONSE = 30;

export function appendNotification(user, notification) {
    if (!user.notifications) user.notifications = [];
    user.notifications.push(notification);
    if (user.notifications.length > MAX_STORED_NOTIFICATIONS) {
        user.notifications.splice(0, user.notifications.length - MAX_STORED_NOTIFICATIONS);
    }
}

export function recentNotificationsSorted(user) {
    const list = user.notifications || [];
    return list
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, MAX_NOTIFICATIONS_RESPONSE);
}
