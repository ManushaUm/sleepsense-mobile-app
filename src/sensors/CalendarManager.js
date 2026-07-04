import axios from 'axios';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-in config dynamically
GoogleSignin.configure({
  webClientId: '656306996421-8q1shbdao820ekjnhuodjuesmesl4fce.apps.googleusercontent.com',
  offlineAccess: true,
  scopes: ['https://www.googleapis.com/auth/calendar.events.readonly'],
});

/**
 * Queries tomorrow's events from the user's primary Google Calendar.
 * Returns a list of simplified event objects.
 */
export async function getTomorrowCalendarEvents() {
  try {
    if (!GoogleSignin || typeof GoogleSignin.isSignedIn !== 'function') {
      console.log('[CalendarManager] GoogleSignin native module is not available (running in Expo Go?). Bypassing calendar fetch.');
      return [];
    }

    const isSignedIn = await GoogleSignin.isSignedIn();
    if (!isSignedIn) {
      console.log('User is not signed in to Google. Bypassing calendar fetch.');
      return [];
    }

    const tokens = await GoogleSignin.getTokens();
    const token = tokens.accessToken;
    if (!token) {
      console.log('No Google OAuth access token found. Bypassing calendar fetch.');
      return [];
    }

    // Define time window for tomorrow
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date();
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const timeMin = tomorrowStart.toISOString();
    const timeMax = tomorrowEnd.toISOString();

    const response = await axios.get(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          timeMin: timeMin,
          timeMax: timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        },
        timeout: 8000,
      }
    );

    if (response.data && response.data.items) {
      return response.data.items.map((item) => ({
        summary: item.summary || 'Meeting',
        start_time: item.start?.dateTime || item.start?.date || timeMin,
        end_time: item.end?.dateTime || item.end?.date || timeMax,
      }));
    }
  } catch (error) {
    console.log('Error fetching Google Calendar events:', error.response?.data || error.message);
  }
  return [];
}
