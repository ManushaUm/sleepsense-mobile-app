import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import client from '../api/client';
import { getUserId, getTelemetryData } from '../database/storage';
import { getTomorrowCalendarEvents } from './CalendarManager';
import { getDailyScreenTimeMinutes } from './ScreenTimeManager';
import { getWalkingMinutesToday } from './ActivityManager';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SLEEPSENSE_SYNC_TASK';

// Define the background telemetry sync task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.log('[BackgroundETL] No authenticated user found for background sync.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    console.log(`[BackgroundETL] Executing background sync for user ${userId} on date ${dateStr}...`);

    const telemetry = await getTelemetryData();
    const walkingMinutes = await getWalkingMinutesToday();
    const screenStats = await getDailyScreenTimeMinutes();
    const calendarEvents = await getTomorrowCalendarEvents();

    const totalUnlocks = telemetry.unlock_count_daytime + telemetry.unlock_count_evening + telemetry.unlock_count_late_night;

    // Compile daily feature payload.
    // In a production app, these values would be queried from local device databases
    // (e.g. SQLite database caching step/unlock events aggregated throughout the day).
    const payload = {
      unlock_count_daytime: parseFloat(telemetry.unlock_count_daytime),
      unlock_count_evening: parseFloat(telemetry.unlock_count_evening),
      unlock_count_late_night: parseFloat(telemetry.unlock_count_late_night),
      first_unlock_hour: parseFloat(telemetry.first_unlock_hour),
      last_unlock_hour: parseFloat(telemetry.last_unlock_hour),
      avg_session_duration_min: 2.2,
      screen_sessions_count: parseFloat(totalUnlocks),
      
      stationary_ratio: 0.84,
      walking_minutes: parseFloat(walkingMinutes),
      running_minutes: 5.0,
      exercise_detected: 0,
      peak_activity_hour: 16.5,
      activity_bout_count: 7.0,
      
      app_social_min: parseFloat(screenStats.app_social_min),
      app_entertainment_evening_min: parseFloat(screenStats.app_entertainment_evening_min),
      app_late_night_min: parseFloat(screenStats.app_late_night_min),
      last_active_app_hour: parseFloat(screenStats.last_active_app_hour),
      app_diversity_count: 5.0,
      app_study_sessions: 2.0,
      
      silence_ratio: 0.81,
      conversation_ratio: 0.10,
      social_audio_evening: 0.05,
      
      location_entropy: 0.58,
      mobility_radius: 1.1,
      unique_locations_count: 2.0,
      
      day_of_week: today.getDay(),
      is_weekend: today.getDay() === 0 || today.getDay() === 6 ? 1 : 0,
      psqi_pre_score: 5.0,
      
      personality_extraversion: 3.0,
      personality_agreeableness: 3.0,
      personality_conscientiousness: 3.0,
      personality_neuroticism: 3.0,
      personality_openness: 3.0,
      
      // Default semantic diary offsets (overridden when logging via DiaryScreen)
      nlp_caffeine_similarity: 0.05,
      nlp_screen_similarity: 0.05,
      nlp_stress_similarity: 0.05,
      
      calendar_events: calendarEvents,
    };

    // Upload to database and trigger prediction sync
    const response = await client.post(`/predict/${userId}?date=${dateStr}`, payload);
    console.log('[BackgroundETL] Background sync succeeded. Predicted score:', response.data.predicted_score);
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[BackgroundETL] Background fetch failed:', error.message);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background fetch task
export async function registerBackgroundSync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (minimum background fetch frequency)
        stopOnTerminate: false,   // keep running after app terminates
        startOnBoot: true,        // start on device reboot
      });
      console.log('[BackgroundETL] Background sync task registered successfully.');
    }
    return true;
  } catch (err) {
    console.error('[BackgroundETL] Failed to register background sync task:', err);
    return false;
  }
}

// Unregister background fetch task
export async function unregisterBackgroundSync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('[BackgroundETL] Background sync task unregistered.');
    }
    return true;
  } catch (err) {
    console.error('[BackgroundETL] Failed to unregister background sync task:', err);
    return false;
  }
}
