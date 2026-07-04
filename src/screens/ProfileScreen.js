import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteToken, deleteUserId, getProfilePictureUrl, deleteProfilePictureUrl, deleteGoogleAccessToken } from '../database/storage';
import client, { getApiBaseUrl } from '../api/client';
import { COLORS } from '../theme/colors';

export default function ProfileScreen({ userId, onLogout }) {
  const [serverUrl, setServerUrl] = useState('');
  const [profile, setProfile] = useState(null);
  const [profilePic, setProfilePic] = useState(null);

  const fetchProfile = async () => {
    try {
      // Find this user in the /users backend listing endpoint
      const response = await client.get('/users');
      const userProfile = response.data.find((u) => u.user_id === userId);
      if (userProfile) {
        setProfile(userProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    async function loadServerUrl() {
      const url = await getApiBaseUrl();
      setServerUrl(url);
    }
    async function loadProfilePic() {
      const pic = await getProfilePictureUrl();
      setProfilePic(pic);
    }
    loadServerUrl();
    loadProfilePic();
    fetchProfile();
  }, [userId]);

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await deleteToken();
            await deleteUserId();
            await deleteProfilePictureUrl();
            await deleteGoogleAccessToken();
            onLogout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Settings & Profile</Text>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>
                {String(userId).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.usernameText}>{userId.split('@')[0]}</Text>
          <Text style={styles.emailText}>{userId}</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>User Account</Text>
          <View style={styles.row}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{userId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>PSQI Pre-Study:</Text>
            <Text style={styles.value}>
              {profile?.psqi_pre_score ? profile.psqi_pre_score.toFixed(1) : '5.0'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>PSQI Post-Study:</Text>
            <Text style={styles.value}>
              {profile?.psqi_post_score ? profile.psqi_post_score.toFixed(1) : 'Not Logged'}
            </Text>
          </View>
        </View>

        {/* Personality Card if available */}
        {profile?.personality && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Big Five Personality</Text>
            {Object.entries(profile.personality).map(([trait, score]) => (
              <View key={trait} style={styles.row}>
                <Text style={styles.traitLabel}>{trait}:</Text>
                <Text style={styles.value}>{score.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* App Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>About SleepSense</Text>
          <Text style={styles.infoText}>
            SleepSense is a prototype mobile application that uses passive daytime smartphone telemetry 
            (phone locks, activity bouts, social context, app usage diversity) 
            combined with subjective diary logs to predict nightly sleep quality.
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
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
    marginBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  avatarFallbackText: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: 'bold',
  },
  usernameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
  },
  emailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  traitLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  value: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  urlValue: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  logoutBtn: {
    backgroundColor: COLORS.poor,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
