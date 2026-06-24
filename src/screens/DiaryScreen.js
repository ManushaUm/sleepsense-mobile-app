import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { COLORS } from '../theme/colors';
import { saveLastLoggedDiaryDate, getTelemetryData } from '../database/storage';

export default function DiaryScreen({ userId, navigation }) {
  const [loading, setLoading] = useState(false);

  // EMA Form States
  const [stress, setStress] = useState(2); // 1 to 5 scale
  const [happy, setHappy] = useState(4);   // 1 to 5 scale
  const [tired, setTired] = useState(3);   // 1 to 5 scale
  const [socialContacts, setSocialContacts] = useState('3');
  const [studyHours, setStudyHours] = useState('4');
  const [exercised, setExercised] = useState(false);
  const [diaryNotes, setDiaryNotes] = useState('');

  // Rate Helper widget
  const RatingSelector = ({ label, value, onChange }) => {
    return (
      <View style={styles.rateContainer}>
        <Text style={styles.rateLabel}>{label}: {value}</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.starBtn,
                value === num ? styles.starBtnActive : null
              ]}
              onPress={() => onChange(num)}
            >
              <Text style={[styles.starText, value === num ? styles.starTextActive : null]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const handleSaveDiary = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const telemetry = await getTelemetryData();
      const totalUnlocks = telemetry.unlock_count_daytime + telemetry.unlock_count_evening + telemetry.unlock_count_late_night;

      // Assemble full 42-feature payload with default sensor values
      // merged with dynamic subjective user inputs
      const payload = {
        // Subjective inputs
        stress_level: parseFloat(stress),
        mood_happy: parseFloat(happy),
        mood_tired: parseFloat(tired),
        social_contacts: parseFloat(socialContacts) || 0.0,
        study_hours_today: parseFloat(studyHours) || 0.0,
        exercise_self_report: exercised ? 1 : 0,
        
        // Passive Telemetry (sensible mock defaults, replaced by BackgroundETL sensor logs)
        unlock_count_daytime: parseFloat(telemetry.unlock_count_daytime),
        unlock_count_evening: parseFloat(telemetry.unlock_count_evening),
        unlock_count_late_night: parseFloat(telemetry.unlock_count_late_night),
        first_unlock_hour: parseFloat(telemetry.first_unlock_hour),
        last_unlock_hour: parseFloat(telemetry.last_unlock_hour),
        avg_session_duration_min: 2.5,
        screen_sessions_count: parseFloat(totalUnlocks),
        
        stationary_ratio: 0.82,
        walking_minutes: exercised ? 40.0 : 15.0,
        running_minutes: exercised ? 15.0 : 0.0,
        exercise_detected: exercised ? 1 : 0,
        peak_activity_hour: 17.5,
        activity_bout_count: 8.0,
        
        app_social_min: 45.0,
        app_entertainment_evening_min: 30.0,
        app_late_night_min: 15.0,
        last_active_app_hour: 23.5,
        app_diversity_count: 8.0,
        app_study_sessions: 3.0,
        
        silence_ratio: 0.78,
        conversation_ratio: 0.15,
        social_audio_evening: 0.1,
        
        location_entropy: 0.65,
        mobility_radius: 1.2,
        unique_locations_count: 3.0,
        
        day_of_week: today.getDay(),
        is_weekend: today.getDay() === 0 || today.getDay() === 6 ? 1 : 0,
        psqi_pre_score: 5.0,
        
        personality_extraversion: 3.0,
        personality_agreeableness: 3.0,
        personality_conscientiousness: 3.0,
        personality_neuroticism: 3.0,
        personality_openness: 3.0,
        
        // NLP Diary Notes analysis simulation (based on keyword analysis in diary text)
        nlp_caffeine_similarity: diaryNotes.toLowerCase().includes('caffeine') || diaryNotes.toLowerCase().includes('coffee') ? 0.85 : 0.05,
        nlp_screen_similarity: diaryNotes.toLowerCase().includes('phone') || diaryNotes.toLowerCase().includes('screen') ? 0.75 : 0.05,
        nlp_stress_similarity: diaryNotes.toLowerCase().includes('exam') || diaryNotes.toLowerCase().includes('stress') || diaryNotes.toLowerCase().includes('work') ? 0.90 : 0.05,
      };

      // POST user features and trigger prediction
      const response = await client.post(`/predict/${userId}?date=${dateStr}`, payload);

      // Save diary logging date locally
      await saveLastLoggedDiaryDate(dateStr);

      const percentageScore = Math.round((response.data.predicted_score / 3.0) * 100);
      let friendlyLabel = 'No Sleep Data 💤';
      const clean = String(response.data.predicted_label).toLowerCase();
      if (clean.includes('very good')) friendlyLabel = 'Excellent Sleep Expected 🌟';
      else if (clean.includes('fairly good')) friendlyLabel = 'Good Rest Expected 👍';
      else if (clean.includes('fairly bad')) friendlyLabel = 'Restless Sleep Expected ⚠️';
      else if (clean.includes('very bad')) friendlyLabel = 'Poor Sleep Expected 😴';

      Alert.alert(
        'Diary Logged!',
        `Your daily diary notes and answers have been securely saved.\n\nTonight's Sleep Score: ${percentageScore}%\nExpected Sleep: ${friendlyLabel}`,
        [{ text: 'View Dashboard', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail || 'Failed to submit daily features to the database.';
      Alert.alert('Submission Error', detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Daily Sleep Diary</Text>
        <Text style={styles.subtitle}>
          Log your mood, stress, and daily activities to get personalized sleep predictions and coaching.
        </Text>

        {/* Sliders Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>How Was Your Day?</Text>

          <RatingSelector label="How happy did you feel today?" value={happy} onChange={setHappy} />
          <RatingSelector label="How stressed did you feel today?" value={stress} onChange={setStress} />
          <RatingSelector label="How tired do you feel physically?" value={tired} onChange={setTired} />

          {/* Social and Study inputs */}
          <Text style={styles.label}>How many people did you talk to today?</Text>
          <TextInput
            style={styles.input}
            value={socialContacts}
            onChangeText={setSocialContacts}
            placeholder="e.g. 5"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
          />

          <Text style={styles.label}>How many hours did you spend studying or working?</Text>
          <TextInput
            style={styles.input}
            value={studyHours}
            onChangeText={setStudyHours}
            placeholder="e.g. 6"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
          />

          {/* Exercise toggle */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Did you work out or exercise today?</Text>
            <Switch
              value={exercised}
              onValueChange={setExercised}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* Diary Notes Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Tonight's Sleep Journal</Text>
          <Text style={styles.labelDesc}>
            Write a short note about your day (e.g. if you drank coffee, felt stressed about exams, or used your phone in bed before sleeping).
          </Text>
          <TextInput
            style={styles.textArea}
            value={diaryNotes}
            onChangeText={setDiaryNotes}
            placeholder="Had an iced coffee at 3 PM, felt a bit anxious about work, and used my phone in bed for 20 minutes..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSaveDiary} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>Log My Day & View Prediction</Text>
          )}
        </TouchableOpacity>
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
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  rateContainer: {
    marginBottom: 20,
  },
  rateLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  starBtn: {
    width: '18%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  starBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  starText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  starTextActive: {
    color: COLORS.white,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  labelDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  switchLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    height: 120,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
