import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/Colors';

interface UsernameInputModalProps {
  visible: boolean;
  onClose: () => void;
  onUserIdSet: (userId: string) => void;
}

const USER_ID_KEY = 'app_user_id';
const CONNECTION_CHECK_URL = 'https://httpbin.org/get'; // Reliable public API for connection testing
const REGISTRATION_URL = 'https://faras1334.pythonanywhere.com/registerid';
const FALLBACK_CONNECTION_URLS = [
  'https://www.google.com',
  'https://httpbin.org/status/200',
  'https://jsonplaceholder.typicode.com/posts/1'
];
const CONNECTION_TIMEOUT = 5000;
const REGISTRATION_TIMEOUT = 10000;

const UsernameInputModal: React.FC<UsernameInputModalProps> = ({ visible, onClose, onUserIdSet }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  // Check internet connectivity when modal becomes visible
  useEffect(() => {
    if (visible) {
      checkInternetConnection();
    }
  }, [visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setUsername('');
      setError(null);
      setIsConnected(null);
      setIsLoading(false);
      setIsCheckingConnection(false);
    }
  }, [visible]);

  const checkSingleUrl = useCallback(async (url: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }, []);

  const checkInternetConnection = useCallback(async () => {
    setIsCheckingConnection(true);
    setError(null);
    
    try {
      // Try multiple URLs to ensure we can detect internet connectivity
      const urls = [CONNECTION_CHECK_URL, ...FALLBACK_CONNECTION_URLS];
      
      for (const url of urls) {
        const isConnected = await checkSingleUrl(url);
        if (isConnected) {
          setIsConnected(true);
          return;
        }
      }
      
      // If none of the URLs work, we're offline
      setIsConnected(false);
      setError('No internet connection detected. Please connect to the internet to set up your username.');
      
    } catch (error) {
      console.error('Error checking internet connection:', error);
      setIsConnected(false);
      setError('Unable to check internet connection. Please ensure you are connected to the internet.');
    } finally {
      setIsCheckingConnection(false);
    }
  }, [checkSingleUrl]);

  const validateUsername = useCallback((input: string): string | null => {
    const trimmed = input.trim();
    
    if (trimmed.length < 3) {
      return 'Username must be at least 3 characters long.';
    }
    
    if (trimmed.length > 20) {
      return 'Username must be 20 characters or less.';
    }
    
    // Only allow alphanumeric characters and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return 'Username can only contain letters, numbers, and underscores.';
    }
    
    // Don't allow usernames that are only numbers
    if (/^\d+$/.test(trimmed)) {
      return 'Username cannot contain only numbers.';
    }
    
    // Don't allow usernames that start with underscore
    if (trimmed.startsWith('_')) {
      return 'Username cannot start with an underscore.';
    }
    
    return null;
  }, []);

  const generateUserId = useCallback((username: string): string => {
    const trimmedUsername = username.trim().toLowerCase();
    const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp for more uniqueness
    return `${trimmedUsername}${randomNumber}${timestamp}`;
  }, []);

  const verifyConnection = useCallback(async (): Promise<boolean> => {
    // Try the main connection check URL first
    let isConnected = await checkSingleUrl(CONNECTION_CHECK_URL);
    
    // If that fails, try fallback URLs
    if (!isConnected) {
      for (const url of FALLBACK_CONNECTION_URLS) {
        isConnected = await checkSingleUrl(url);
        if (isConnected) break;
      }
    }
    
    return isConnected;
  }, [checkSingleUrl]);

  const registerUserId = useCallback(async (userId: string): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REGISTRATION_TIMEOUT);

    try {
      const response = await fetch(`${REGISTRATION_URL}?id=${encodeURIComponent(userId)}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Failed to register user ID. Please try again.';
        
        try {
          const errorData = await response.json();
          if (response.status === 409) {
            errorMessage = 'Username conflict detected. Please try again with a different username.';
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }
      throw error;
    }
  }, []);

  const saveUserIdLocally = useCallback(async (userId: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    } catch (error) {
      console.error('Failed to save user ID locally:', error);
      throw new Error('Failed to save username locally. Please try again.');
    }
  }, []);

  const handleSetUsername = useCallback(async () => {
    // Validate username first
    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check internet connection before proceeding
    if (isConnected === false) {
      setError('No internet connection. Please connect to the internet and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verify connection before making the request
      const connectionOk = await verifyConnection();
      if (!connectionOk) {
        setError('Lost internet connection. Please check your connection and try again.');
        setIsConnected(false);
        return;
      }

      // Generate user ID
      const userId = generateUserId(username);

      // Register user ID
      await registerUserId(userId);

      // Save user ID locally
      await saveUserIdLocally(userId);

      // Success!
      onUserIdSet(userId);
      onClose();
      
      // Show success message
      Alert.alert('Success', 'Username set successfully!', [{ text: 'OK' }]);
      
    } catch (error) {
      console.error('Failed to set username or register ID:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [username, isConnected, validateUsername, verifyConnection, generateUserId, registerUserId, saveUserIdLocally, onUserIdSet, onClose]);

  const handleUsernameChange = useCallback((text: string) => {
    setUsername(text);
    if (error) {
      setError(null); // Clear error when user starts typing
    }
  }, [error]);

  const handleModalClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleModalClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Welcome!</Text>
          <Text style={styles.modalText}>Please enter a username to continue.</Text>
          
          {isCheckingConnection ? (
            <View style={styles.connectionCheckContainer}>
              <ActivityIndicator size="small" color={Colors.dark.primary} />
              <Text style={styles.connectionCheckText}>Checking internet connection...</Text>
            </View>
          ) : (
            <>
              <TextInput
                style={[
                  styles.input,
                  (!isConnected || isLoading) && styles.inputDisabled
                ]}
                placeholder="Enter username (e.g., alex123)"
                placeholderTextColor={Colors.dark.subText}
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                maxLength={20}
                editable={isConnected !== false && !isLoading}
                returnKeyType="done"
                onSubmitEditing={handleSetUsername}
              />
              
              <Text style={styles.helpText}>
                Username must be 3-20 characters long and contain only letters, numbers, and underscores.
              </Text>
              
              {error && <Text style={styles.errorText}>{error}</Text>}
              
              {isConnected === false && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={checkInternetConnection}
                  disabled={isCheckingConnection}
                >
                  <Text style={styles.retryButtonText}>
                    {isCheckingConnection ? 'Checking...' : 'Retry Connection'}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.button,
                  (isLoading || isConnected === false || !username.trim()) && styles.buttonDisabled
                ]}
                onPress={handleSetUsername}
                disabled={isLoading || isConnected === false || !username.trim()}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.dark.text} />
                ) : (
                  <Text style={styles.buttonText}>Set Username</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    margin: 20,
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 15,
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.dark.subText,
    fontSize: 16,
  },
  connectionCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  connectionCheckText: {
    color: Colors.dark.subText,
    fontSize: 16,
    marginLeft: 10,
  },
  input: {
    height: 50,
    borderColor: Colors.dark.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.background,
    width: '100%',
    fontSize: 16,
  },
  inputDisabled: {
    backgroundColor: Colors.dark.subText + '20',
    borderColor: Colors.dark.subText + '40',
    color: Colors.dark.subText,
  },
  helpText: {
    fontSize: 12,
    color: Colors.dark.subText,
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: Colors.dark.border,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 15,
    minHeight: 40,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 2,
    width: '100%',
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: Colors.dark.secondary,
  },
  buttonText: {
    color: Colors.dark.text,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  errorText: {
    color: Colors.dark.error,
    marginBottom: 10,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default UsernameInputModal;