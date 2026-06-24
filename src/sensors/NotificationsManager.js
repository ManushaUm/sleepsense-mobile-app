import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request system permissions for push notifications
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[NotificationsManager] Permission to send notifications was denied.');
      return false;
    }
    
    // Android specific channel setup for SDK 26+
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('sleepsense-reminders', {
        name: 'SleepSense Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }
    
    return true;
  } catch (error) {
    console.error('[NotificationsManager] Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule a daily local reminder notification to fill out the diary
 */
export async function scheduleDailyReminder(hour = 21, minute = 0) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('[NotificationsManager] Skipping scheduling: No permissions.');
      return false;
    }

    // List all scheduled notifications to prevent double scheduling
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const alreadyScheduled = scheduled.some(
      (notif) => notif.trigger && notif.trigger.hour === hour && notif.trigger.minute === minute
    );

    if (alreadyScheduled) {
      console.log(`[NotificationsManager] Daily reminder already registered for ${hour}:${String(minute).padStart(2, '0')}.`);
      return true;
    }

    // Clear existing notifications to avoid overlapping/ghost alarms
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'SleepSense Diary 🌙',
        body: 'How was your day? Tap to log your diary and get tonight\'s sleep prediction.',
        data: { targetTab: 'Diary' },
        sound: true,
      },
      trigger: {
        type: 'daily',
        hour,
        minute,
        channelId: 'sleepsense-reminders',
      },
    });

    console.log(`[NotificationsManager] Daily reminder scheduled for ${hour}:${String(minute).padStart(2, '0')} successfully.`);
    return true;
  } catch (error) {
    console.error('[NotificationsManager] Failed to schedule daily reminder:', error);
    return false;
  }
}
