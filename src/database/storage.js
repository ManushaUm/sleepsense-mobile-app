import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'sleepsense_jwt_token';
const USER_ID_KEY = 'sleepsense_user_id';

export async function saveToken(token) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.error('Error saving JWT token:', error);
    return false;
  }
}

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving JWT token:', error);
    return null;
  }
}

export async function deleteToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting JWT token:', error);
    return false;
  }
}

export async function saveUserId(userId) {
  try {
    await SecureStore.setItemAsync(USER_ID_KEY, userId);
    return true;
  } catch (error) {
    console.error('Error saving user ID:', error);
    return false;
  }
}

export async function getUserId() {
  try {
    return await SecureStore.getItemAsync(USER_ID_KEY);
  } catch (error) {
    console.error('Error retrieving user ID:', error);
    return null;
  }
}

export async function deleteUserId() {
  try {
    await SecureStore.deleteItemAsync(USER_ID_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting user ID:', error);
    return false;
  }
}

const LAST_DIARY_DATE_KEY = 'sleepsense_last_diary_date';

export async function saveLastLoggedDiaryDate(dateStr) {
  try {
    await SecureStore.setItemAsync(LAST_DIARY_DATE_KEY, dateStr);
    return true;
  } catch (error) {
    console.error('Error saving last logged diary date:', error);
    return false;
  }
}

export async function getLastLoggedDiaryDate() {
  try {
    return await SecureStore.getItemAsync(LAST_DIARY_DATE_KEY);
  } catch (error) {
    console.error('Error retrieving last logged diary date:', error);
    return null;
  }
}

const PROFILE_PIC_KEY = 'sleepsense_profile_picture_url';

export async function saveProfilePictureUrl(url) {
  try {
    if (url) {
      await SecureStore.setItemAsync(PROFILE_PIC_KEY, url);
    } else {
      await SecureStore.deleteItemAsync(PROFILE_PIC_KEY);
    }
    return true;
  } catch (error) {
    console.error('Error saving profile picture url:', error);
    return false;
  }
}

export async function getProfilePictureUrl() {
  try {
    return await SecureStore.getItemAsync(PROFILE_PIC_KEY);
  } catch (error) {
    console.error('Error retrieving profile picture url:', error);
    return null;
  }
}

export async function deleteProfilePictureUrl() {
  try {
    await SecureStore.deleteItemAsync(PROFILE_PIC_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting profile picture url:', error);
    return false;
  }
}

export async function recordUnlockEvent() {
  try {
    const today = new Date();
    const currentHour = today.getHours() + today.getMinutes() / 60.0;
    
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    const lastDate = await SecureStore.getItemAsync('sleepsense_sensor_date');
    
    if (lastDate !== dateStr) {
      // It's a new day! Reset all counters.
      await SecureStore.setItemAsync('sleepsense_sensor_date', dateStr);
      await SecureStore.setItemAsync('sleepsense_unlock_daytime', '0');
      await SecureStore.setItemAsync('sleepsense_unlock_evening', '0');
      await SecureStore.setItemAsync('sleepsense_unlock_late_night', '0');
      await SecureStore.setItemAsync('sleepsense_first_unlock_hour', String(currentHour));
    }
    
    // Update last unlock hour
    await SecureStore.setItemAsync('sleepsense_last_unlock_hour', String(currentHour));
    
    // Determine which category to increment
    if (currentHour >= 8.0 && currentHour < 18.0) {
      const val = parseInt(await SecureStore.getItemAsync('sleepsense_unlock_daytime') || '0', 10) + 1;
      await SecureStore.setItemAsync('sleepsense_unlock_daytime', String(val));
    } else if (currentHour >= 18.0 && currentHour < 22.0) {
      const val = parseInt(await SecureStore.getItemAsync('sleepsense_unlock_evening') || '0', 10) + 1;
      await SecureStore.setItemAsync('sleepsense_unlock_evening', String(val));
    } else {
      const val = parseInt(await SecureStore.getItemAsync('sleepsense_unlock_late_night') || '0', 10) + 1;
      await SecureStore.setItemAsync('sleepsense_unlock_late_night', String(val));
    }
  } catch (e) {
    console.error('Error recording unlock event:', e);
  }
}

export async function getTelemetryData() {
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    const lastDate = await SecureStore.getItemAsync('sleepsense_sensor_date');
    
    if (lastDate !== dateStr) {
      return {
        unlock_count_daytime: 0,
        unlock_count_evening: 0,
        unlock_count_late_night: 0,
        first_unlock_hour: 8.0,
        last_unlock_hour: 22.0
      };
    }
    
    const daytime = parseInt(await SecureStore.getItemAsync('sleepsense_unlock_daytime') || '0', 10);
    const evening = parseInt(await SecureStore.getItemAsync('sleepsense_unlock_evening') || '0', 10);
    const lateNight = parseInt(await SecureStore.getItemAsync('sleepsense_unlock_late_night') || '0', 10);
    const first = parseFloat(await SecureStore.getItemAsync('sleepsense_first_unlock_hour') || '8.0');
    const last = parseFloat(await SecureStore.getItemAsync('sleepsense_last_unlock_hour') || '22.0');
    
    return {
      unlock_count_daytime: daytime,
      unlock_count_evening: evening,
      unlock_count_late_night: lateNight,
      first_unlock_hour: first,
      last_unlock_hour: last
    };
  } catch (e) {
    return {
      unlock_count_daytime: 0,
      unlock_count_evening: 0,
      unlock_count_late_night: 0,
      first_unlock_hour: 8.0,
      last_unlock_hour: 22.0
    };
  }
}

const GOOGLE_ACCESS_TOKEN_KEY = 'sleepsense_google_access_token';

export async function saveGoogleAccessToken(token) {
  try {
    if (token) {
      await SecureStore.setItemAsync(GOOGLE_ACCESS_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(GOOGLE_ACCESS_TOKEN_KEY);
    }
    return true;
  } catch (error) {
    console.error('Error saving Google access token:', error);
    return false;
  }
}

export async function getGoogleAccessToken() {
  try {
    return await SecureStore.getItemAsync(GOOGLE_ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving Google access token:', error);
    return null;
  }
}

export async function deleteGoogleAccessToken() {
  try {
    await SecureStore.deleteItemAsync(GOOGLE_ACCESS_TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting Google access token:', error);
    return false;
  }
}




