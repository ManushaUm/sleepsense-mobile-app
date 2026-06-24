import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import Gauge from '../components/Gauge';
import { COLORS } from '../theme/colors';
import { getLastLoggedDiaryDate, getProfilePictureUrl, getTelemetryData } from '../database/storage';

export default function HomeScreen({ userId, navigation }) {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [diaryLogged, setDiaryLogged] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [localUnlocks, setLocalUnlocks] = useState(0);
  
  // Format today's date as YYYY-MM-DD
  const [dateStr, setDateStr] = useState(() => {
    const today = new Date();
    // Default to a date in the raw dataset if testing simulated data, 
    // or standard YYYY-MM-DD
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const fetchLatestPrediction = async () => {
    setLoading(true);
    try {
      // Fetch user's latest prediction history item
      const response = await client.get(`/history/${userId}?limit=1`);
      if (response.data && response.data.length > 0) {
        setPrediction(response.data[0]);
      } else {
        setPrediction(null);
      }
    } catch (error) {
      console.error('Error fetching prediction history:', error);
      // Don't show alert here so it fails silently at mount if server is offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestPrediction();

    // Check if user has logged their diary today
    async function checkDiaryStatus() {
      const lastLoggedDate = await getLastLoggedDiaryDate();
      setDiaryLogged(lastLoggedDate === dateStr);
    }
    
    // Check if user has a profile picture
    async function checkProfilePic() {
      const picUrl = await getProfilePictureUrl();
      setProfilePic(picUrl);
    }

    async function loadTelemetry() {
      const telemetry = await getTelemetryData();
      setLocalUnlocks(telemetry.unlock_count_daytime + telemetry.unlock_count_evening + telemetry.unlock_count_late_night);
    }

    checkDiaryStatus();
    checkProfilePic();
    loadTelemetry();
  }, [userId, dateStr]);

  const handlePredict = async () => {
    setLoading(true);
    try {
      // Trigger user prediction endpoint for this date
      const response = await client.post(`/predict/${userId}?date=${dateStr}`);
      setPrediction(response.data);

      const percentageScore = Math.round((response.data.predicted_score / 3.0) * 100);
      let friendlyLabel = 'No Sleep Data 💤';
      const clean = String(response.data.predicted_label).toLowerCase();
      if (clean.includes('very good')) friendlyLabel = 'Excellent Sleep Expected 🌟';
      else if (clean.includes('fairly good')) friendlyLabel = 'Good Rest Expected 👍';
      else if (clean.includes('fairly bad')) friendlyLabel = 'Restless Sleep Expected ⚠️';
      else if (clean.includes('very bad')) friendlyLabel = 'Poor Sleep Expected 😴';

      Alert.alert(
        'Sleep Prediction Complete',
        `Based on today's lifestyle habits, your sleep quality score is estimated at ${percentageScore}%.\n\nExpected tonight: ${friendlyLabel}`
      );
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail || 'Failed to predict sleep quality. Ensure backend is running and features are ingested.';
      Alert.alert('Prediction Error', detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.welcomeRow}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {String(userId).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.welcomeText}>Hello, {userId.split('@')[0]}</Text>
              <Text style={styles.dateText}>Date: {dateStr}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.syncBtn} onPress={fetchLatestPrediction} disabled={loading}>
            <Text style={styles.syncBtnText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading && !prediction ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading SleepSense Insights...</Text>
          </View>
        ) : (
          <>
            {/* Quick-Log Reminder Banner Widget */}
            <TouchableOpacity 
              style={[
                styles.reminderWidget, 
                diaryLogged ? styles.reminderLogged : styles.reminderIncomplete
              ]}
              onPress={() => !diaryLogged && navigation.navigate('Diary')}
              disabled={diaryLogged}
            >
              <Text style={styles.reminderEmoji}>{diaryLogged ? '✅' : '📝'}</Text>
              <View style={styles.reminderTextWrapper}>
                <Text style={styles.reminderTitle}>
                  {diaryLogged ? "Today's diary is logged!" : "Log Today's Sleep Diary"}
                </Text>
                <Text style={styles.reminderSub}>
                  {diaryLogged 
                    ? "Habits logged successfully. Check your customized coaching tips below!" 
                    : "Tap here to record today's mood, stress, and journal notes."}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Anomaly warning alert banner */}
            {prediction?.anomaly_flag === 1 && (
              <View style={styles.anomalyBanner}>
                <Text style={styles.anomalyBannerText}>
                  ⚠️ Unusual Daily Routine! Today's habits differed significantly from your usual schedule. Your sleep quality predictions have been adjusted.
                </Text>
              </View>
            )}

            {/* Sleep Gauge Card */}
            <View style={styles.gaugeCard}>
              <Text style={styles.cardHeader}>Sleep Quality Prediction</Text>
              <View style={styles.gaugeWrapper}>
                <Gauge
                  score={prediction?.predicted_score || 0}
                  label={prediction?.predicted_label || 'No Data'}
                />
              </View>
              <Text style={styles.predictionMeta}>
                Your sleep quality estimate is based on your daily activity levels and phone usage habits.
              </Text>
            </View>

            {/* Habits / Telemetry Cards Grid */}
            <Text style={styles.sectionTitle}>Daytime Activity Summary</Text>
            <View style={styles.grid}>
              <View style={styles.gridCard}>
                <Text style={styles.gridEmoji}>📱</Text>
                <Text style={styles.gridVal}>
                  {prediction?.top_features?.find(f => f.feature.includes('unlock'))?.feature_value?.toFixed(0) || localUnlocks}
                </Text>
                <Text style={styles.gridLabel}>Phone Unlocks</Text>
              </View>

              <View style={styles.gridCard}>
                <Text style={styles.gridEmoji}>🚶</Text>
                <Text style={styles.gridVal}>
                  {prediction?.top_features?.find(f => f.feature.includes('walk') || f.feature.includes('activity'))?.feature_value?.toFixed(0) || '45'}m
                </Text>
                <Text style={styles.gridLabel}>Walking Time</Text>
              </View>

              <View style={styles.gridCard}>
                <Text style={styles.gridEmoji}>🔇</Text>
                <Text style={styles.gridVal}>
                  {((prediction?.top_features?.find(f => f.feature.includes('silence'))?.feature_value || 0.85) * 100).toFixed(0)}%
                </Text>
                <Text style={styles.gridLabel}>Quiet Environment</Text>
              </View>

              <View style={styles.gridCard}>
                <Text style={styles.gridEmoji}>📊</Text>
                <Text style={[styles.gridVal, { color: prediction?.anomaly_flag === 1 ? COLORS.anomaly : COLORS.good }]}>
                  {prediction?.anomaly_flag === 1 ? 'Unusual' : 'Normal'}
                </Text>
                <Text style={styles.gridLabel}>Daily Routine</Text>
              </View>
            </View>

            {/* Quick action button */}
            <TouchableOpacity style={styles.predictBtn} onPress={handlePredict} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.predictBtnText}>Predict Sleep Score</Text>
              )}
            </TouchableOpacity>

            {/* Advice summary preview */}
            {prediction?.advice && prediction.advice.length > 0 && (
              <TouchableOpacity 
                style={styles.advicePreviewCard} 
                onPress={() => navigation.navigate('Advice')}
              >
                <Text style={styles.adviceHeader}>💡 Coach Sleep Advice</Text>
                <Text style={styles.adviceText} numberOfLines={2}>
                  "{prediction.advice[0]}"
                </Text>
                <Text style={styles.adviceLink}>View all coach recommendations →</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  syncBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  syncBtnText: {
    color: COLORS.primaryLight,
    fontWeight: '600',
    fontSize: 12,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  loaderText: {
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: 14,
  },
  anomalyBanner: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.anomaly,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  anomalyBannerText: {
    color: COLORS.anomaly,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
  gaugeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 24,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  gaugeWrapper: {
    marginVertical: 10,
  },
  predictionMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 16,
  },
  gridEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  gridVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  gridLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  predictBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  predictBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  advicePreviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adviceHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
    marginBottom: 8,
  },
  adviceText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  adviceLink: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  reminderWidget: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  reminderLogged: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  reminderIncomplete: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  reminderEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  reminderTextWrapper: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  reminderSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  avatarFallbackText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
});
