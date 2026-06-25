import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { COLORS } from '../theme/colors';

export default function AdviceScreen({ userId }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adviceList, setAdviceList] = useState([]);
  const [shapDrivers, setShapDrivers] = useState([]);

  const fetchAdviceAndDrivers = async () => {
    if (refreshing) return;
    
    if (adviceList.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      // Get latest prediction history item to extract advice and SHAP drivers
      const response = await client.get(`/history/${userId}?limit=1`);
      if (response.data && response.data.length > 0) {
        const latest = response.data[0];
        setAdviceList(latest.advice || []);
        setShapDrivers(latest.top_features || []);
      } else {
        setAdviceList([]);
        setShapDrivers([]);
      }
    } catch (error) {
      console.error('Error fetching advice:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdviceAndDrivers();
  }, [userId]);

  // Translate technical feature name to readable label
  const formatFeatureName = (name) => {
    const dictionary = {
      unlock_count_late_night: 'Late-night screen pickups',
      unlock_count_evening: 'Evening screen use',
      unlock_count_daytime: 'Daytime screen use',
      first_unlock_hour: 'Time of first phone pickup',
      last_unlock_hour: 'Time of last phone use',
      avg_session_duration_min: 'Average screen session duration',
      screen_sessions_count: 'Total phone screen sessions',
      stationary_ratio: 'Inactivity / Sitting time',
      walking_minutes: 'Active walking time',
      running_minutes: 'Running time',
      exercise_detected: 'Exercise sessions',
      peak_activity_hour: 'Vigorous activity time',
      activity_bout_count: 'Active movement bouts',
      app_social_min: 'Social app usage',
      app_entertainment_evening_min: 'Evening entertainment screen use',
      app_late_night_min: 'Late-night app usage',
      last_active_app_hour: 'Time of last app activity',
      app_diversity_count: 'Different apps used',
      app_study_sessions: 'Focus app sessions',
      silence_ratio: 'Quiet environment ratio',
      conversation_ratio: 'Conversation time ratio',
      social_audio_evening: 'Evening voice call time',
      location_entropy: 'Movement location variety',
      mobility_radius: 'Travel distance/radius',
      unique_locations_count: 'Unique places visited',
      day_of_week: 'Day of the week',
      is_weekend: 'Weekend day',
      psqi_pre_score: 'Sleep profile baseline',
      nlp_caffeine_similarity: 'Caffeine mention in journal',
      nlp_screen_similarity: 'Screen mention in journal',
      nlp_stress_similarity: 'Stress mention in journal',
      stress_level: 'Stress level',
      mood_happy: 'Happy mood',
      mood_tired: 'Physical tiredness',
      social_contacts: 'Social interactions count',
      exercise_self_report: 'Self-reported exercise status',
      study_hours_today: 'Work/study time',
    };
    return dictionary[name] || name.replace(/_/g, ' ').replace('count', '').trim();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchAdviceAndDrivers}
            tintColor={COLORS.primaryLight}
            colors={[COLORS.primary]}
          />
        }
      >
        <Text style={styles.title}>Sleep Coach Insights</Text>
        <Text style={styles.subtitle}>
          Personalized habits analysis and recommendations to help you sleep better tonight.
        </Text>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* SHAP drivers visualization */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🌟 What Influenced Your Sleep Today</Text>
              <Text style={styles.sectionDesc}>
                See how your daytime habits are likely to help or hurt your sleep quality tonight.
              </Text>

              {shapDrivers.length === 0 ? (
                <Text style={styles.emptyText}>No driver logs available yet. Make a sleep prediction first!</Text>
              ) : (
                shapDrivers.map((driver, index) => {
                  const isPositive = driver.shap_value >= 0;
                  const absShap = Math.abs(driver.shap_value);
                  // Normalize width bar
                  const barWidth = `${Math.min(100, (absShap / 0.5) * 100)}%`;

                  let influenceText = 'Low Influence';
                  if (absShap >= 0.15) {
                    influenceText = 'High Influence';
                  } else if (absShap >= 0.05) {
                    influenceText = 'Medium Influence';
                  }

                  // Friendly value formatter (e.g. show "45 min" or "Yes" instead of "45.0" or "1.0")
                  const formatValue = (feature, value) => {
                    if (feature.includes('minutes') || feature.includes('min') || feature.includes('walk') || feature.includes('run')) {
                      return `${Math.round(value)}m`;
                    }
                    if (feature.includes('ratio')) {
                      return `${Math.round(value * 100)}%`;
                    }
                    if (feature.includes('detected') || feature.includes('exercise_self_report')) {
                      return value > 0.5 ? 'Yes' : 'No';
                    }
                    if (feature.includes('hour')) {
                      // Convert decimal hour (e.g., 22.8) to readable time format (e.g. 10:48 PM)
                      const hr = Math.floor(value);
                      const min = Math.round((value - hr) * 60);
                      const ampm = hr >= 12 ? 'PM' : 'AM';
                      const displayHr = hr % 12 === 0 ? 12 : hr % 12;
                      return `${displayHr}:${String(min).padStart(2, '0')} ${ampm}`;
                    }
                    return value.toFixed(0);
                  };

                  return (
                    <View key={index} style={styles.driverRow}>
                      <View style={styles.driverTextRow}>
                        <Text style={styles.driverName}>
                          {formatFeatureName(driver.feature)} ({formatValue(driver.feature, driver.feature_value)})
                        </Text>
                        <Text style={[styles.driverValue, { color: isPositive ? COLORS.good : COLORS.poor }]}>
                          {isPositive ? '👍 Helps Sleep' : '⚠️ Sleep Disruptor'}
                        </Text>
                      </View>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.bar,
                            {
                              width: barWidth,
                              backgroundColor: isPositive ? COLORS.good : COLORS.poor,
                              alignSelf: 'flex-start',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.influenceText}>{influenceText}</Text>
                    </View>
                  );
                })
              )}
            </View>

            {/* Advice recommendation cards */}
            <Text style={styles.sectionHeader}>Sleep Recommendations</Text>

            {adviceList.length === 0 ? (
              <View style={styles.adviceCard}>
                <Text style={styles.adviceText}>
                  "Maintain a consistent sleep schedule and limit screen use 1 hour before bed to build a baseline."
                </Text>
              </View>
            ) : (
              adviceList.map((advice, index) => (
                <View key={index} style={styles.adviceCard}>
                  <View style={styles.adviceIconCircle}>
                    <Text style={styles.adviceIconText}>💡</Text>
                  </View>
                  <View style={styles.adviceContent}>
                    <Text style={styles.adviceTitle}>Recommendation #{index + 1}</Text>
                    <Text style={styles.adviceText}>"{advice}"</Text>
                  </View>
                </View>
              ))
            )}

            {/* Recommendations are updated by dragging down to refresh */}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 24,
  },
  loader: {
    marginTop: 80,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 10,
    fontSize: 13,
  },
  driverRow: {
    marginBottom: 16,
  },
  driverTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  driverName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  driverValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  barContainer: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  adviceCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    alignItems: 'center',
  },
  adviceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  adviceIconText: {
    fontSize: 20,
  },
  adviceContent: {
    flex: 1,
  },
  adviceTitle: {
    color: COLORS.primaryLight,
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  adviceText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  refreshBtn: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  refreshBtnText: {
    color: COLORS.primaryLight,
    fontSize: 15,
    fontWeight: 'bold',
  },
  influenceText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
