import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import client, { getApiBaseUrl, setApiBaseUrl } from '../api/client';
import { saveToken, saveUserId, saveProfilePictureUrl, saveGoogleAccessToken } from '../database/storage';
import { COLORS } from '../theme/colors';

// Configure Native Google Sign-In
GoogleSignin.configure({
  webClientId: '656306996421-8q1shbdao820ekjnhuodjuesmesl4fce.apps.googleusercontent.com',
  offlineAccess: true,
  scopes: ['https://www.googleapis.com/auth/calendar.events.readonly'],
});

export default function LoginScreen({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [psqiPre, setPsqiPre] = useState('5');
  const [loading, setLoading] = useState(false);
  
  const handleNativeGoogleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken || response.idToken;
      
      const tokens = await GoogleSignin.getTokens();
      const accessToken = tokens.accessToken;
      
      if (!idToken) {
        throw new Error('Google Sign-In did not return an ID token.');
      }
      
      await handleGoogleLogin(idToken, accessToken);
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Sign-In Cancelled', 'Google sign-in was cancelled.');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Sign-In in Progress', 'Google sign-in is already in progress.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Play Services Error', 'Google Play Services are not available or outdated.');
      } else {
        console.error('Native Google Sign-In Error:', error);
        Alert.alert('Google Sign-In Error', error.message || 'An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (idToken, googleAccessToken) => {
    setLoading(true);
    try {
      const res = await client.post('/auth/google-login', {
        id_token: idToken,
      });

      const { access_token, user_id, profile_picture_url } = res.data;
      await saveToken(access_token);
      await saveUserId(user_id);
      await saveProfilePictureUrl(profile_picture_url);
      if (googleAccessToken) {
        await saveGoogleAccessToken(googleAccessToken);
      }

      onLoginSuccess(user_id);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      const detail = error.response?.data?.detail || 'Failed to authenticate using Google.';
      Alert.alert('Google Sign-In Error', detail);
    } finally {
      setLoading(false);
    }
  };
  // Settings configuration disabled for user access

  const handleAuth = async () => {
    if (!userId.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both User ID and Password.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        // Register API request
        const response = await client.post('/auth/register', {
          user_id: userId.trim(),
          password: password,
          psqi_pre_score: parseFloat(psqiPre) || 5.0,
          personality: {
            extraversion: 3.0,
            agreeableness: 3.0,
            conscientiousness: 3.0,
            neuroticism: 3.0,
            openness: 3.0,
          },
        });
        
        Alert.alert(
          'Registration Successful',
          'Your account has been created. Please log in.',
          [{ text: 'OK', onPress: () => setIsRegister(false) }]
        );
      } else {
        // Login API request
        const response = await client.post('/auth/token', {
          user_id: userId.trim(),
          password: password,
        });

        const { access_token, user_id } = response.data;
        await saveToken(access_token);
        await saveUserId(user_id);
        
        onLoginSuccess(user_id);
      }
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail || 'Failed to connect to the backend server.';
      Alert.alert('Authentication Error', detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

        {/* Brand Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>SleepSense</Text>
          <Text style={styles.tagline}>Passive Behavioral Sleep Predictor</Text>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isRegister ? 'Create Account' : 'Welcome Back'}</Text>
          
          <Text style={styles.label}>User ID (e.g. u00)</Text>
          <TextInput
            style={styles.input}
            value={userId}
            onChangeText={setUserId}
            placeholder="Enter your user ID"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          {isRegister && (
            <>
              <Text style={styles.label}>Pre-Study PSQI Score (0 - 21)</Text>
              <TextInput
                style={styles.input}
                value={psqiPre}
                onChangeText={setPsqiPre}
                placeholder="Default is 5"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
            </>
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={handleAuth} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>{isRegister ? 'Register' : 'Log In'}</Text>
            )}
          </TouchableOpacity>

          {!isRegister && (
            <>
              {/* Custom Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google OAuth Login Action */}
              <TouchableOpacity
                style={[styles.googleBtn, loading && styles.disabledBtn]}
                onPress={handleNativeGoogleSignIn}
                disabled={loading}
              >
                <Text style={styles.googleBtnText}>🔑 Sign in with Google</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => setIsRegister(!isRegister)}
            disabled={loading}
          >
            <Text style={styles.switchBtnText}>
              {isRegister ? 'Already have an account? Log In' : "Don't have an account? Register"}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  settingsBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  settingsBtnText: {
    color: COLORS.primaryLight,
    fontWeight: '600',
    fontSize: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
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
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchBtnText: {
    color: COLORS.primaryLight,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 10,
  },
  modalInfo: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  modalBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textSecondary,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  googleBtnText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
