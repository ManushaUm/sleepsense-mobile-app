import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { requestNotificationPermissions } from './NotificationsManager';

const HIGH_STRESS_KEYWORDS = ["exam", "test", "quiz", "deadline", "presentation", "interview", "submission", "viva", "defense", "review"];

/**
 * Parses calendar events and prediction score to dynamically schedule pre-sleep alerts tonight.
 * 
 * @param {Object} prediction - Prediction response from backend (contains predicted_score)
 * @param {Array} calendarEvents - Tomorrow's calendar events
 */
export async function scheduleBedtimeAlerts(prediction, calendarEvents = []) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('[NotificationScheduler] No notification permissions. Bypassing scheduler.');
      return;
    }

    // Cancel previously scheduled bedtime/stress notifications to avoid duplicates
    // Note: Daily diary reminder notification can be left intact if we only target specific triggers.
    // However, to keep it simple, we can cancel all and reschedule the daily reminder.
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of allNotifications) {
      const title = notif.content?.title || '';
      if (title.includes('Bedtime') || title.includes('Exam') || title.includes('Sleep Debt')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    const now = new Date();
    
    // -----------------------------------------------------------------
    // 1. Target Bedtime Wind-Down Alert
    // -----------------------------------------------------------------
    let earliestEvent = null;
    let earliestHour = null;

    for (const ev of calendarEvents) {
      const startStr = ev.start_time || '';
      const match = startStr.match(/T(\d{2}):(\d{2})/);
      if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const decimalH = h + m / 60.0;
        if (decimalH < 12.0) { // Morning events
          if (earliestHour === null || decimalH < earliestHour) {
            earliestHour = decimalH;
            earliestEvent = ev;
          }
        }
      }
    }

    let targetBedtimeDate = new Date();
    let label = '';
    
    if (earliestHour !== null) {
      // Formula: bedtime = earliest_event_time - 8 hours - 15 min buffer (8.25 hours)
      const targetDecimal = (earliestHour - 8.25 + 24) % 24;
      const targetH = Math.floor(targetDecimal);
      const targetM = Math.round((targetDecimal - targetH) * 60);

      targetBedtimeDate.setHours(targetH, targetM, 0, 0);
      label = earliestEvent.summary || 'early commitment';
    } else {
      // Default bedtime is 11:00 PM if free morning tomorrow
      targetBedtimeDate.setHours(23, 0, 0, 0);
      label = 'consistent rest';
    }

    // Schedule wind-down alert 30 minutes before target bedtime
    const windDownDate = new Date(targetBedtimeDate.getTime() - 30 * 60 * 1000);
    
    // Only schedule if the trigger time is in the future
    if (windDownDate > now) {
      const displayTime = targetBedtimeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 SleepSense Bedtime Wind-Down',
          body: `Your target bedtime is ${displayTime} for tomorrow's ${label}. Put screens away and start winding down!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: windDownDate,
        },
      });
      console.log(`[NotificationScheduler] Scheduled bedtime wind-down alert at ${windDownDate.toLocaleTimeString()}`);
    }

    // -----------------------------------------------------------------
    // 2. High-Stress Event Warning Alert
    // -----------------------------------------------------------------
    const hasHighStressEvent = calendarEvents.some(ev => {
      const summary = (ev.summary || '').toLowerCase();
      return HIGH_STRESS_KEYWORDS.some(k => summary.includes(k));
    });

    if (hasHighStressEvent) {
      // Schedule exam prep notification for 8:30 PM tonight
      const stressAlertTime = new Date();
      stressAlertTime.setHours(20, 30, 0, 0);

      if (stressAlertTime > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📝 SleepSense Exam Alert',
            body: 'You have a deadline or exam tomorrow. Avoid studying after 11 PM — sleep consolidates memory better than cramming!',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            date: stressAlertTime,
          },
        });
        console.log('[NotificationScheduler] Scheduled high-stress event alert for 8:30 PM.');
      }
    }

    // -----------------------------------------------------------------
    // 3. Sleep Debt Warning Alert
    // -----------------------------------------------------------------
    const score = prediction?.predicted_score || 3.0;
    if (score < 1.5) { // Very Bad or Fairly Bad expected
      // Schedule sleep debt alert for 9:30 PM tonight
      const debtAlertTime = new Date();
      debtAlertTime.setHours(21, 30, 0, 0);

      if (debtAlertTime > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ SleepSense Sleep Debt Flag',
            body: 'A lower sleep score is predicted tonight. Protect your sleep window and avoid screens to recover sleep debt.',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            date: debtAlertTime,
          },
        });
        console.log('[NotificationScheduler] Scheduled sleep debt warning alert for 9:30 PM.');
      }
    }
  } catch (error) {
    console.error('[NotificationScheduler] Error scheduling notifications:', error);
  }
}
