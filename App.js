import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getToken, getUserId, recordUnlockEvent } from './src/database/storage';
import { COLORS } from './src/theme/colors';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiaryScreen from './src/screens/DiaryScreen';
import AdviceScreen from './src/screens/AdviceScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Import background ETL sync
import { registerBackgroundSync } from './src/sensors/BackgroundETL';
import * as Notifications from 'expo-notifications';
import { scheduleDailyReminder } from './src/sensors/NotificationsManager';

export default function App() {
  const [initLoading, setInitLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('Home');

  // Check auth state on startup
  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getToken();
        const storedUserId = await getUserId();
        if (token && storedUserId) {
          setUserId(storedUserId);
        }
      } catch (e) {
        console.error('Error checking auth state:', e);
      } finally {
        setInitLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Register background fetch task once user is logged in
  useEffect(() => {
    if (userId) {
      registerBackgroundSync();
      scheduleDailyReminder(21, 0); // Trigger daily reminder at 9:00 PM local time
    }
  }, [userId]);

  // Listen to AppState transitions to count phone usage sessions (pickups / unlocks)
  useEffect(() => {
    let lastState = AppState.currentState;
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        (lastState === 'background' || lastState === 'inactive') &&
        nextAppState === 'active'
      ) {
        console.log('[App] Phone unlocked/resumed - recording usage event.');
        await recordUnlockEvent();
      }
      lastState = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Route the user to the correct tab when they tap a notification
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const targetTab = response.notification.request.content.data?.targetTab;
      if (targetTab) {
        setActiveTab(targetTab);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleLoginSuccess = (uid) => {
    setUserId(uid);
    setActiveTab('Home');
  };

  const handleLogout = () => {
    setUserId(null);
  };

  if (initLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Initializing SleepSense...</Text>
      </View>
    );
  }

  // Auth Guard
  if (!userId) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  // Navigation tabs routing helper
  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen userId={userId} navigation={{ navigate: setActiveTab }} />;
      case 'Diary':
        return <DiaryScreen userId={userId} navigation={{ navigate: setActiveTab }} />;
      case 'Advice':
        return <AdviceScreen userId={userId} />;
      case 'Profile':
        return <ProfileScreen userId={userId} onLogout={handleLogout} />;
      default:
        return <HomeScreen userId={userId} navigation={{ navigate: setActiveTab }} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SleepSense</Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {renderActiveScreen()}
      </View>

      {/* Bespoke Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'Home' && styles.tabItemActive]}
          onPress={() => setActiveTab('Home')}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'Diary' && styles.tabItemActive]}
          onPress={() => setActiveTab('Diary')}
        >
          <Text style={styles.tabIcon}>📝</Text>
          <Text style={[styles.tabLabel, activeTab === 'Diary' && styles.tabLabelActive]}>Diary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'Advice' && styles.tabItemActive]}
          onPress={() => setActiveTab('Advice')}
        >
          <Text style={styles.tabIcon}>💡</Text>
          <Text style={[styles.tabLabel, activeTab === 'Advice' && styles.tabLabelActive]}>Advice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'Profile' && styles.tabItemActive]}
          onPress={() => setActiveTab('Profile')}
        >
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'Profile' && styles.tabLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: 15,
  },
  header: {
    height: 56,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
    letterSpacing: 1.0,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: COLORS.primaryLight,
    fontWeight: 'bold',
  },
});
