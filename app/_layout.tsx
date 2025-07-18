import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, useRouter, useSegments } from "expo-router"; // Added useSegments
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import {
    SafeAreaProvider,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import MiniPlayer from "../components/MiniPlayer";
import NoticeModal, { NoticeData } from "../components/NoticeModal";
import UsernameInputModal from "../components/UsernameInputModal";
import Colors from "../constants/Colors";
import {
    AudioPlayerProvider,
    useAudioPlayer,
} from "../contexts/AudioPlayerContext";

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

const USER_ID_KEY = "app_user_id";
const NOTICE_API_BASE_URL = "https://faras1334.pythonanywhere.com";

const CONNECTION_CHECK_URL = "https://httpbin.org/get"; // Reliable public API for connection testing
const FALLBACK_CONNECTION_URLS = [
  "https://www.google.com",
  "https://httpbin.org/status/200",
  "https://jsonplaceholder.typicode.com/posts/1",
];
const CONNECTION_TIMEOUT = 5000;

const MINI_PLAYER_HEIGHT = 67;
const TAB_BAR_BASE_HEIGHT = 70;

function TabsLayout() {
  const { currentSong } = useAudioPlayer();
  const router = useRouter();
  const segments = useSegments(); // Use segments for more reliable route detection
  const insets = useSafeAreaInsets();

  // Check if we're on the player screen using segments
  const isOnPlayerScreen = segments.includes("player");

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      <Tabs
        sceneContainerStyle={{
          paddingBottom:
            TAB_BAR_BASE_HEIGHT +
            insets.bottom +
            (currentSong && !isOnPlayerScreen ? MINI_PLAYER_HEIGHT : 0),
        }}
        screenOptions={{
          tabBarStyle: {
            backgroundColor: Colors.dark.background,
            borderTopColor: Colors.dark.border,
            borderTopWidth: 1,
            height: TAB_BAR_BASE_HEIGHT + insets.bottom,
            paddingBottom: Math.max(8, insets.bottom),
            paddingTop: 8,
            elevation: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.25,
            shadowRadius: 5,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          },
          tabBarActiveTintColor: Colors.dark.primary,
          tabBarInactiveTintColor: Colors.dark.textDim,
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: "600",
            marginBottom: 5,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
          headerStyle: {
            backgroundColor: Colors.dark.background,
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            height: 60,
          },
          headerTintColor: Colors.dark.text,
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 20,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Search",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Library",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="library" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="playlist"
          options={{
            title: "Playlists",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="player"
          options={{
            title: "Now Playing",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="musical-notes" size={size} color={color} />
            ),
            href: null,
          }}
        />
        <Tabs.Screen
          name="playlist-detail"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* MiniPlayer - Only render when NOT on player screen */}
      {currentSong && !isOnPlayerScreen && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: TAB_BAR_BASE_HEIGHT + insets.bottom,
            height: MINI_PLAYER_HEIGHT,
            zIndex: 1000,
          }}
        >
          <MiniPlayer />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUserId, setIsLoadingUserId] = useState(true);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [noticeData, setNoticeData] = useState<NoticeData | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  useEffect(() => {
    const checkUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem(USER_ID_KEY);
        if (storedUserId) {
          setUserId(storedUserId);
        } else {
          setShowUsernameModal(true);
        }
      } catch (e) {
        console.error("Failed to load user ID:", e);
        setShowUsernameModal(true);
      } finally {
        setIsLoadingUserId(false);
        SplashScreen.hideAsync();
      }
    };

    checkUserId();
  }, []);

  const checkSingleUrl = useCallback(async (url: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        CONNECTION_TIMEOUT
      );

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }, []);

  const checkInternetConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Try multiple URLs to ensure we can detect internet connectivity
      const urls = [CONNECTION_CHECK_URL, ...FALLBACK_CONNECTION_URLS];

      for (const url of urls) {
        const isConnected = await checkSingleUrl(url);
        if (isConnected) {
          return true;
        }
      }

      // If none of the URLs work, we're offline
      return false;
    } catch (error) {
      console.error("Error checking internet connection:", error);
      return false;
    }
  }, [checkSingleUrl]);

  useEffect(() => {
    const fetchNotice = async () => {
      if (!userId) return;

      const isConnected = await checkInternetConnection();
      console.log("Internet connection status:", isConnected);
      if (!isConnected) {
        console.log("No internet connection. Skipping notice check.");
        return;
      }

      try {
        const noticeResponse = await fetch(`${NOTICE_API_BASE_URL}/notice`);
        if (noticeResponse.status === 404) {
          console.log("No notice currently set.");
          return;
        }
        if (!noticeResponse.ok) {
          console.error("Failed to fetch notice:", noticeResponse.status);
          return;
        }
        const currentNotice: NoticeData & {
          target_user?: string;
          is_update?: boolean;
          timestamp?: string;
        } = await noticeResponse.json();
        console.log("Current Notice Data:", JSON.stringify(currentNotice));

        console.log("Fetching read status...");
        const showReadResponse = await fetch(`${NOTICE_API_BASE_URL}/showread`);
        if (!showReadResponse.ok) {
          console.error(
            "Failed to fetch read status:",
            showReadResponse.status
          );
          setNoticeData(currentNotice);
          setShowNoticeModal(true);
          return;
        }
        const readData = await showReadResponse.json();
        console.log("Read Status Data:", JSON.stringify(readData));
        const readUsers: string[] = readData.read_users || [];
        console.log(
          "Read Users:",
          JSON.stringify(readUsers),
          "Current UserID:",
          userId
        );

        if (!readUsers.includes(userId)) {
          console.log("User has not read the notice. Showing modal.");
          setNoticeData(currentNotice);
          setShowNoticeModal(true);
        } else {
          console.log("User has already read the notice.");
        }
      } catch (error) {
        console.error("Error fetching notice or read status:", error);
      }
    };

    if (userId) {
      fetchNotice();
    }
  }, [userId]);

  const handleUserIdSet = (newUserId: string) => {
    setUserId(newUserId);
    setShowUsernameModal(false);
  };

  const handleCloseNotice = async () => {
    setShowNoticeModal(false);
    if (userId) {
      const isConnected = await checkInternetConnection();
      if (!isConnected) {
        console.log("No internet connection, cannot mark notice as read.");
        return;
      }
      try {
        const response = await fetch(
          `${NOTICE_API_BASE_URL}/read?user=${encodeURIComponent(userId)}`,
          {
            method: "POST",
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "Failed to mark notice as read:",
            response.status,
            errorData
          );
        } else {
          const successData = await response.json();
          console.log("Notice marked as read:", successData.message);
        }
      } catch (error) {
        console.error("Error marking notice as read:", error);
      }
    }
  };

  if (isLoadingUserId) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {userId ? (
        <AudioPlayerProvider>
          <StatusBar
            style="light"
            backgroundColor={Colors.dark.background}
            translucent={false}
          />
          <TabsLayout />
          {noticeData && (
            <NoticeModal
              visible={showNoticeModal}
              notice={noticeData}
              onClose={handleCloseNotice}
            />
          )}
        </AudioPlayerProvider>
      ) : (
        <UsernameInputModal
          visible={showUsernameModal}
          onClose={() => {
            setShowUsernameModal(true);
          }}
          onUserIdSet={handleUserIdSet}
        />
      )}
    </SafeAreaProvider>
  );
}
