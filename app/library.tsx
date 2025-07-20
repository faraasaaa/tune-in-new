import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { DownloadedSong } from "../services/api";
import { deleteSong, getDownloadedSongs } from "../services/storage";

export default function LibraryScreen() {
  const { width } = useWindowDimensions();
  const [songs, setSongs] = useState<DownloadedSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const {
    playSong,
    setPlaylist,
    currentSong,
    isPlaying,
    setPlaylistSource,
    playlistSource,
  } = useAudioPlayer();

  // Replace useEffect with useFocusEffect to refresh when navigating to this screen
  useFocusEffect(
    useCallback(() => {
      loadSongs();
    }, [])
  );

  const loadSongs = async () => {
    setIsLoading(true);
    try {
      const downloadedSongs = await getDownloadedSongs();
      setSongs(downloadedSongs);
      // Don't automatically set the entire library as playlist
      // Let playlists manage their own song lists
    } catch (error) {
      console.error("Error loading songs:", error);
      Alert.alert("Error", "Failed to load downloaded songs");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaySong = async (song: DownloadedSong) => {
    try {
      // Check if the song is already playing
      if (currentSong?.id === song.id && isPlaying) {
        // If the same song is already playing, just navigate to the player
        router.push("/player");
        return;
      }

      // Set source as library and create single-song playlist
      setPlaylistSource("library");
      setPlaylist([song]);
      await playSong(song);
      router.push("/player");
    } catch (error) {
      console.error("Error playing song:", error);
      // Show a toast instead of alert for better UX
      console.log("Failed to play song - showing user feedback");
    }
  };

  const handleDeleteSong = async (song: DownloadedSong) => {
    Alert.alert(
      "Delete Song",
      `Are you sure you want to delete "${song.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSong(song.id);
              // Refresh the list
              loadSongs();
            } catch (error) {
              console.error("Error deleting song:", error);
              Alert.alert("Error", "Failed to delete song");
            }
          },
        },
      ]
    );
  };

  const renderSongItem = ({
    item,
    index,
  }: {
    item: DownloadedSong;
    index: number;
  }) => {
    const isCurrentSong = currentSong?.id === item.id;
    const showNowPlaying = isCurrentSong && playlistSource === "library";

    return (
      <View style={styles.songItemWrapper}>
        <TouchableOpacity
          style={[styles.songItem, showNowPlaying && styles.currentSongItem]}
          onPress={() => handlePlaySong(item)}
          activeOpacity={0.7}
        >
          <View style={styles.coverContainer}>
            <Image
              source={{ uri: item.coverImage }}
              style={styles.coverImage}
              transition={200}
            />
            {showNowPlaying && (
              <LinearGradient
                colors={["rgba(29, 185, 84, 0.8)", "rgba(29, 185, 84, 0.3)"]}
                style={styles.currentSongOverlay}
              />
            )}
            <View
              style={[
                styles.playIconOverlay,
                showNowPlaying && styles.currentPlayIcon,
              ]}
            >
              <Ionicons
                name={
                  isPlaying && showNowPlaying ? "pause-circle" : "play-circle"
                }
                size={36}
                color={
                  showNowPlaying ? Colors.dark.primary : "rgba(255,255,255,0.9)"
                }
              />
            </View>
          </View>
          <View style={styles.songInfo}>
            <Text
              style={[
                styles.songTitle,
                showNowPlaying && styles.currentSongTitle,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.artistName,
                showNowPlaying && styles.currentArtistName,
              ]}
              numberOfLines={1}
            >
              {item.artist}
            </Text>
            <Text style={styles.albumName} numberOfLines={1}>
              {item.album}
            </Text>
            <View style={styles.metadataRow}>
              <View style={styles.downloadedIndicator}>
                <Ionicons
                  name="cloud-done-outline"
                  size={14}
                  color={Colors.dark.primary}
                />
                <Text style={styles.downloadedText}>Downloaded</Text>
              </View>
              {showNowPlaying && (
                <View style={styles.nowPlayingIndicator}>
                  <View style={styles.soundWave}>
                    <View style={[styles.bar, styles.bar1]} />
                    <View style={[styles.bar, styles.bar2]} />
                    <View style={[styles.bar, styles.bar3]} />
                  </View>
                  <Text style={styles.nowPlayingText}>Now Playing</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSong(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="trash-outline"
              size={24}
              color={Colors.dark.error}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <LinearGradient
        colors={[Colors.dark.background, "#0A0A0A"]}
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleContainer}>
              <Ionicons
                name="library-outline"
                size={28}
                color={Colors.dark.primary}
              />
              <Text style={styles.headerTitle}>My Library</Text>
            </View>
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>{songs.length} songs</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.loadingContainer}>
              <Ionicons
                name="musical-notes-outline"
                size={48}
                color={Colors.dark.primary}
              />
              <Text style={styles.loadingText}>Loading your music...</Text>
            </View>
          </View>
        ) : songs.length > 0 ? (
          <FlatList
            data={songs}
            renderItem={renderSongItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyStateContainer}>
              <LinearGradient
                colors={[
                  Colors.dark.primary + "20",
                  Colors.dark.primary + "05",
                ]}
                style={styles.emptyIconContainer}
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={64}
                  color={Colors.dark.primary}
                />
              </LinearGradient>
              <Text style={styles.emptyText}>Your library is empty</Text>
              <Text style={styles.emptySubText}>
                Search and download songs to build your offline collection
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginLeft: 8,
  },
  statsContainer: {
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statsText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Extra padding for mini player
  },
  songItemWrapper: {
    marginBottom: 12,
  },
  songItem: {
    flexDirection: "row",
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  currentSongItem: {
    backgroundColor: Colors.dark.card + "CC",
    borderWidth: 1,
    borderColor: Colors.dark.primary + "50",
  },
  coverContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  currentSongOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  currentPlayIcon: {
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark.text,
    marginBottom: 2,
  },
  currentSongTitle: {
    color: Colors.dark.primary,
  },
  artistName: {
    fontSize: 14,
    color: Colors.dark.textDim,
    marginBottom: 2,
  },
  currentArtistName: {
    color: Colors.dark.primary + "CC",
  },
  albumName: {
    fontSize: 12,
    color: Colors.dark.textDim + "99",
    marginBottom: 4,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  downloadedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.primary + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  downloadedText: {
    fontSize: 10,
    color: Colors.dark.primary,
    marginLeft: 2,
  },
  nowPlayingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  soundWave: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 12,
    marginRight: 4,
  },
  bar: {
    width: 2,
    backgroundColor: Colors.dark.primary,
    marginHorizontal: 1,
  },
  bar1: {
    height: 4,
  },
  bar2: {
    height: 8,
  },
  bar3: {
    height: 6,
  },
  nowPlayingText: {
    fontSize: 10,
    color: Colors.dark.primary,
  },
  deleteButton: {
    padding: 8,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.dark.border + "30",
    marginVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateContainer: {
    alignItems: "center",
    maxWidth: 300,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 16,
    color: Colors.dark.textDim,
    textAlign: "center",
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: Colors.dark.textDim,
    marginTop: 16,
  },
});
