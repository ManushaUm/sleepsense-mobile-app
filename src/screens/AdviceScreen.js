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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { COLORS } from '../theme/colors';

export default function AdviceScreen({ userId }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adviceList, setAdviceList] = useState([]);
  const [shapDrivers, setShapDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);

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

  const getFeatureExplanation = (feature, isPositive) => {
    const explanations = {
      unlock_count_late_night: "Interrupted sleep readiness: Picking up your phone late at night exposes your eyes to blue light, suppressing melatonin secretion and delaying REM sleep entry.",
      unlock_count_evening: "Evening stimulation: High phone screen use in the evening keeps the brain active and reduces the transition speed into slow-wave deep sleep.",
      unlock_count_daytime: "Daily digital distraction: High screen usage throughout the day is often correlated with increased stress levels and mental fatigue.",
      first_unlock_hour: "First light: The time you first unlock your phone sets your circadian rhythm clock for the day.",
      last_unlock_hour: "Bedtime screen boundary: Keeping screens active close to bedtime delays your natural sleep drive.",
      walking_minutes: isPositive 
        ? "Physical exhaustion boost: An active day with walking creates sleep pressure, making it easier to fall asleep and stay asleep."
        : "Low physical movement: Insufficient physical activity reduces overall physical fatigue, making it harder to initiate deep sleep.",
      stationary_ratio: "Sedentary habit: Sitting or remaining inactive for long stretches slows down blood circulation and lowers deep sleep readiness.",
      app_social_min: "Social comparison/alertness: High social media usage increases cognitive arousal and nighttime emotional stress.",
      app_entertainment_evening_min: "Evening entertainment screen use: Streaming videos or playing games in the evening keeps the nervous system in high-alert state.",
      app_late_night_min: "Blue-light toxicity: Spending time on active apps past midnight disrupts melatonin pathways completely.",
      last_active_app_hour: "Late app engagement: Interactive apps close to sleep time keep the brain's default mode network overly active.",
      stress_level: "Cortisol spike: Higher subjective stress keeps your heart rate elevated and prevents entering restorative sleep cycles.",
      mood_happy: "Mental balance: Feeling happy and content during the day reduces anxiety and sleep onset latency.",
      mood_tired: "Physical readiness: Physical tiredness acts as a positive signal for sleep onset, helping you drift off naturally.",
    };
    return explanations[feature] || "Habit influence: This daily metric significantly affects your overall sleep score prediction. Maintain healthy limits for a consistent rest.";
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
                    <TouchableOpacity
                      key={index}
                      style={styles.driverRowInteractive}
                      onPress={() => setSelectedDriver({
                        ...driver,
                        name: formatFeatureName(driver.feature),
                        formattedVal: formatValue(driver.feature, driver.feature_value),
                        isPositive,
                        influenceText,
                        explanation: getFeatureExplanation(driver.feature, isPositive)
                      })}
                      activeOpacity={0.7}
                    >
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
                      <View style={styles.driverFooterRow}>
                        <Text style={styles.influenceText}>{influenceText}</Text>
                        <Text style={styles.tapInfoText}>Tap to learn more 🔎</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Premium Details Modal */}
            <Modal
              animationType="fade"
              transparent={true}
              visible={selectedDriver !== null}
              onRequestClose={() => setSelectedDriver(null)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalHeader}>Habit Analytics 📊</Text>
                  
                  {selectedDriver && (
                    <>
                      <Text style={styles.modalLabel}>{selectedDriver.name}</Text>
                      <View style={styles.modalStatRow}>
                        <Text style={styles.modalStatText}>Today's Value: <Text style={styles.modalStatBold}>{selectedDriver.formattedVal}</Text></Text>
                        <Text style={[styles.modalStatusText, { color: selectedDriver.isPositive ? COLORS.good : COLORS.poor }]}>
                          {selectedDriver.isPositive ? '👍 Supports Sleep' : '⚠️ Disrupts Sleep'}
                        </Text>
                      </View>

                      <View style={styles.explanationCard}>
                        <Text style={styles.explanationText}>
                          {selectedDriver.explanation}
                        </Text>
                      </View>
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedDriver(null)}
                  >
                    <Text style={styles.modalCloseBtnText}>Close Analytics</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

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
    fontStyle: 'italic',
  },
  driverRowInteractive: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  driverFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  tapInfoText: {
    fontSize: 10,
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'capitalize',
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalStatText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  modalStatBold: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  modalStatusText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  explanationCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    width: '100%',
  },
  explanationText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalCloseBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
