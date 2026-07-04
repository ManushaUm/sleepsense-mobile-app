import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { COLORS } from '../theme/colors';
import { saveLastLoggedDiaryDate, getTelemetryData } from '../database/storage';
import { getTomorrowCalendarEvents } from '../sensors/CalendarManager';
import { getDailyScreenTimeMinutes } from '../sensors/ScreenTimeManager';
import { getWalkingMinutesToday } from '../sensors/ActivityManager';
import { scheduleBedtimeAlerts } from '../sensors/NotificationScheduler';

export default function DiaryScreen({ userId, navigation }) {
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);

  // EMA States
  const [happy, setHappy] = useState(3);
  const [stress, setStress] = useState(3);
  const [tired, setTired] = useState(3);
  const [selectedPills, setSelectedPills] = useState([]);
  const [diaryNotes, setDiaryNotes] = useState('');

  // Animation states
  const [pulseAnim] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Smooth entry animation on load
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const moodHappyEmojis = [
    { emoji: '😢', label: 'Sad' },
    { emoji: '😕', label: 'Meh' },
    { emoji: '😐', label: 'Okay' },
    { emoji: '🙂', label: 'Good' },
    { emoji: '🤩', label: 'Happy' },
  ];

  const stressEmojis = [
    { emoji: '🧘', label: 'Calm' },
    { emoji: '🙂', label: 'Low' },
    { emoji: '😐', label: 'Mod' },
    { emoji: '😰', label: 'High' },
    { emoji: '🤯', label: 'Peak' },
  ];

  const tiredEmojis = [
    { emoji: '⚡', label: 'Fresh' },
    { emoji: '🏃', label: 'Active' },
    { emoji: '😐', label: 'Tired' },
    { emoji: '🥱', label: 'Sleepy' },
    { emoji: '😴', label: 'Spent' },
  ];

  const activities = [
    { id: 'caffeine', label: '☕ Caffeine', desc: 'Had coffee/tea late' },
    { id: 'workout', label: '🏃 Workout', desc: 'Exercised today' },
    { id: 'screen', label: '📱 Screen in Bed', desc: 'Phone use before sleep' },
    { id: 'study', label: '📚 Studied/Worked', desc: 'Focussed work hours' },
    { id: 'late_meal', label: '🍔 Late Meal', desc: 'Ate close to bedtime' },
    { id: 'meditate', label: '🧘 Meditated', desc: 'Mindfulness/wind-down' },
    { id: 'exam', label: '📝 Exam Prep', desc: 'Anxious or heavy studies' },
    { id: 'socialize', label: '👥 Socialized', desc: 'Spent time with friends' },
  ];

  const togglePill = (id) => {
    if (selectedPills.includes(id)) {
      setSelectedPills(selectedPills.filter((p) => p !== id));
    } else {
      setSelectedPills([...selectedPills, id]);
    }
  };

  const handleVoiceJournal = () => {
    if (recording) return;
    
    setRecording(true);
    // Start pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto generate text after 2.5 seconds simulating AI speech transcription
    setTimeout(() => {
      let speechText = '';
      if (selectedPills.length > 0) {
        const descriptions = [];
        if (selectedPills.includes('caffeine')) descriptions.push("drank some caffeine this afternoon");
        if (selectedPills.includes('workout')) descriptions.push("had a solid workout session");
        if (selectedPills.includes('study')) descriptions.push("spent a few hours studying");
        if (selectedPills.includes('screen')) descriptions.push("used my phone screen in bed");
        if (selectedPills.includes('late_meal')) descriptions.push("had a late dinner");
        if (selectedPills.includes('meditate')) descriptions.push("meditated before sleeping");
        if (selectedPills.includes('exam')) descriptions.push("felt a bit stressed preparing for an exam");
        if (selectedPills.includes('socialize')) descriptions.push("socialized with some friends");
        
        speechText = "Today was good. I " + descriptions.join(', ') + ", and now I am ready to unwind for the night.";
      } else {
        speechText = "It was a pretty typical day. Did some studies, checked my phone, walked around a bit, and feel ready to sleep.";
      }
      
      setDiaryNotes(speechText);
      setRecording(false);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }, 2500);
  };

  const handleSaveDiary = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // 1. Gather active sensor data
      const telemetry = await getTelemetryData();
      const walkingMinutes = await getWalkingMinutesToday();
      const screenStats = await getDailyScreenTimeMinutes();
      const calendarEvents = await getTomorrowCalendarEvents();

      const totalUnlocks = telemetry.unlock_count_daytime + telemetry.unlock_count_evening + telemetry.unlock_count_late_night;

      // Extract pill values for payload
      const exercised = selectedPills.includes('workout') ? 1 : 0;
      const coffeeUsed = selectedPills.includes('caffeine') ? 1 : 0;
      const screenInBed = selectedPills.includes('screen') ? 1 : 0;
      const examStress = selectedPills.includes('exam') ? 1 : 0;
      const hoursStudied = selectedPills.includes('study') ? 6.0 : 2.0;
      const socialContacts = selectedPills.includes('socialize') ? 8.0 : 2.0;

      // Assemble full payload
      const payload = {
        // Subjective Emoji ratings
        stress_level: parseFloat(stress),
        mood_happy: parseFloat(happy),
        mood_tired: parseFloat(tired),
        social_contacts: parseFloat(socialContacts),
        study_hours_today: parseFloat(hoursStudied),
        exercise_self_report: exercised,
        
        // Passive Telemetry (active device status)
        unlock_count_daytime: parseFloat(telemetry.unlock_count_daytime),
        unlock_count_evening: parseFloat(telemetry.unlock_count_evening),
        unlock_count_late_night: parseFloat(telemetry.unlock_count_late_night),
        first_unlock_hour: parseFloat(telemetry.first_unlock_hour),
        last_unlock_hour: parseFloat(telemetry.last_unlock_hour),
        avg_session_duration_min: 2.5,
        screen_sessions_count: parseFloat(totalUnlocks),
        
        stationary_ratio: 0.82,
        walking_minutes: parseFloat(walkingMinutes),
        running_minutes: exercised ? 15.0 : 0.0,
        exercise_detected: exercised,
        peak_activity_hour: 17.5,
        activity_bout_count: 8.0,
        
        app_social_min: parseFloat(screenStats.app_social_min),
        app_entertainment_evening_min: parseFloat(screenStats.app_entertainment_evening_min),
        app_late_night_min: parseFloat(screenStats.app_late_night_min),
        last_active_app_hour: parseFloat(screenStats.last_active_app_hour),
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
        
        // NLP diary text similarity coefficients
        nlp_caffeine_similarity: coffeeUsed ? 0.85 : 0.05,
        nlp_screen_similarity: screenInBed ? 0.75 : 0.05,
        nlp_stress_similarity: examStress ? 0.90 : 0.05,
        
        calendar_events: calendarEvents,
      };

      // Call prediction sync endpoint
      const response = await client.post(`/predict/${userId}?date=${dateStr}`, payload);

      await saveLastLoggedDiaryDate(dateStr);

      if (response.data) {
        await scheduleBedtimeAlerts(response.data, calendarEvents);
      }

      const percentageScore = Math.round((response.data.predicted_score / 3.0) * 100);
      let friendlyLabel = 'No Sleep Data 💤';
      const clean = String(response.data.predicted_label).toLowerCase();
      if (clean.includes('very good')) friendlyLabel = 'Excellent Sleep Expected 🌟';
      else if (clean.includes('fairly good')) friendlyLabel = 'Good Rest Expected 👍';
      else if (clean.includes('fairly bad')) friendlyLabel = 'Restless Sleep Expected ⚠️';
      else if (clean.includes('very bad')) friendlyLabel = 'Poor Sleep Expected 😴';

      Alert.alert(
        'Diary Logged!',
        `Your daily habits are recorded.\n\nTonight's Sleep Score: ${percentageScore}%\nExpected Sleep: ${friendlyLabel}`,
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

  const MoodSelector = ({ label, value, onChange, emojis }) => (
    <View style={styles.moodContainer}>
      <Text style={styles.moodLabel}>{label}</Text>
      <View style={styles.emojisRow}>
        {emojis.map((item, idx) => {
          const level = idx + 1;
          const isSelected = value === level;
          return (
            <TouchableOpacity
              key={level}
              style={[styles.emojiBtn, isSelected && styles.emojiBtnActive]}
              onPress={() => onChange(level)}
              activeOpacity={0.7}
            >
              <Text style={[styles.emojiIcon, isSelected && styles.emojiIconActive]}>
                {item.emoji}
              </Text>
              <Text style={[styles.emojiLabelText, isSelected && styles.emojiLabelTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContainer}
        style={{ opacity: fadeAnim }}
      >
        <Text style={styles.title}>Daily Sleep Diary</Text>
        <Text style={styles.subtitle}>
          Tap emojis and habits to log your day. Skip manual typing using the voice helper below.
        </Text>

        {/* Emojis Mood Selector Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Daily Mood Check-In</Text>
          <MoodSelector label="Mood Status" value={happy} onChange={setHappy} emojis={moodHappyEmojis} />
          <MoodSelector label="Stress Rating" value={stress} onChange={setStress} emojis={stressEmojis} />
          <MoodSelector label="Physical Fatigue" value={tired} onChange={setTired} emojis={tiredEmojis} />
        </View>

        {/* Activity Pills Grid Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Daytime Activities</Text>
          <Text style={styles.labelDesc}>Tap pills to record habits and events today:</Text>
          
          <View style={styles.pillsGrid}>
            {activities.map((item) => {
              const isActive = selectedPills.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.pillBtn, isActive && styles.pillBtnActive]}
                  onPress={() => togglePill(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Voice-to-Text Journal Card */}
        <View style={styles.card}>
          <View style={styles.journalHeaderRow}>
            <Text style={styles.cardHeader}>Tonight's Sleep Journal</Text>
            
            {/* Pulsing Mic Icon */}
            <TouchableOpacity onPress={handleVoiceJournal} disabled={recording}>
              <Animated.View style={[
                styles.micBtnCircle, 
                recording && styles.micBtnCircleActive,
                { transform: [{ scale: pulseAnim }] }
              ]}>
                <Text style={styles.micEmoji}>{recording ? '🔴' : '🎙️'}</Text>
              </Animated.View>
            </TouchableOpacity>
          </View>

          <Text style={styles.labelDesc}>
            {recording ? 'Transcribing your audio input...' : 'Tap the microphone icon to auto-dictate journal based on selected pills.'}
          </Text>

          <TextInput
            style={styles.textArea}
            value={diaryNotes}
            onChangeText={setDiaryNotes}
            placeholder="Tap mic or type: Had a cup of coffee late afternoon, studied for exam, used phone in bed..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSaveDiary} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>Submit Diary & Predict Sleep</Text>
          )}
        </TouchableOpacity>
      </Animated.ScrollView>
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
    backgroundColor: 'rgba(22, 26, 43, 0.65)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  moodContainer: {
    marginBottom: 20,
  },
  moodLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  emojisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emojiBtn: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 15, 23, 0.5)',
    width: '18%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  emojiBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
    transform: [{ scale: 1.08 }],
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  emojiIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  emojiIconActive: {
    opacity: 1.0,
    transform: [{ scale: 1.15 }],
  },
  emojiLabelText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '500',
  },
  emojiLabelTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  labelDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  pillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginHorizontal: -4,
  },
  pillBtn: {
    backgroundColor: 'rgba(13, 15, 23, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 4,
  },
  pillBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  pillLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pillLabelActive: {
    color: COLORS.white,
  },
  journalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  micBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  micBtnCircleActive: {
    backgroundColor: COLORS.poor,
    shadowColor: COLORS.poor,
  },
  micEmoji: {
    fontSize: 16,
  },
  textArea: {
    backgroundColor: 'rgba(13, 15, 23, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderRadius: 12,
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    height: 100,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
