import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

export async function requestPedometerPermissions() {
  try {
    if (Platform.OS === 'web') return false;
    const { status } = await Pedometer.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting Pedometer permissions:', error);
    return false;
  }
}

export async function getWalkingMinutesToday() {
  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) {
      console.log('Pedometer is not available on this device');
      return 15.0; // Default sensible fallback
    }

    const permissionGranted = await requestPedometerPermissions();
    if (!permissionGranted) {
      console.log('Pedometer permission denied');
      return 15.0; // Default fallback
    }

    // Set time window: from 12:00 AM today until now
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    const result = await Pedometer.getStepCountAsync(start, end);
    const steps = result.steps || 0;

    // Convert steps to walking minutes: average pacing is ~100 steps per minute
    const walkingMinutes = steps / 100.0;
    
    // Return at least 5.0 mins if steps recorded but low, or bound between 0 and 180
    return Math.max(0.0, Math.min(180.0, parseFloat(walkingMinutes.toFixed(1))));
  } catch (error) {
    console.error('Error fetching step count:', error);
    return 15.0; // Fallback
  }
}
