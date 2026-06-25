import axios from 'axios';
import { getToken } from '../database/storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL_KEY = 'sleepsense_api_base_url';
// Default to standard localhost, but mobile devs should configure to machine's local network IP
export const DEFAULT_BASE_URL = 'https://sleepsense-api-656306996421.us-central1.run.app'; 

const client = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

client.interceptors.request.use(
  async (config) => {
    // Dynamic Base URL check for easy testing on real devices
    let baseUrl = await SecureStore.getItemAsync(API_BASE_URL_KEY);
    // Fall back to production Cloud Run URL if no base URL is stored,
    // or if the stored URL contains 'localhost' or '127.0.0.1' on a native device (where it will never connect).
    if (!baseUrl || (Platform.OS !== 'web' && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')))) {
      baseUrl = DEFAULT_BASE_URL;
    }
    config.baseURL = baseUrl;

    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export async function setApiBaseUrl(url) {
  try {
    // Basic sanitization
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'http://' + formattedUrl;
    }
    // Remove trailing slash if present
    if (formattedUrl.endsWith('/')) {
      formattedUrl = formattedUrl.slice(0, -1);
    }
    await SecureStore.setItemAsync(API_BASE_URL_KEY, formattedUrl);
    return formattedUrl;
  } catch (e) {
    return null;
  }
}

export async function getApiBaseUrl() {
  try {
    const url = await SecureStore.getItemAsync(API_BASE_URL_KEY);
    return url || DEFAULT_BASE_URL;
  } catch (e) {
    return DEFAULT_BASE_URL;
  }
}

export default client;
