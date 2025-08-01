import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import Colors from "../constants/Colors";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { DownloadedSong } from "../services/api";
import {
  Playlist,
  addSongToPlaylist,
  getPlaylist,
  removeSongFromPlaylist,
  reorderSongsInPlaylist,
} from "../services/playlist";
import { getDownloadedSongs } from "../services/storage";

export default function PlaylistDetailScreen() {
  const { playlistId } = useLocalSearchParams<{ playlistId: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [availableSongs, setAvailableSongs] = useState<DownloadedSong[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const {
    playSong,
    setPlaylist: setAudioPlaylist,
    currentSong,
    isPlaying,
    setPlaylistSource,
    playlistSource,
  } = useAudioPlayer();

  // Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (playlistId) {
        loadPlaylistData();

        // Show toast notification about reordering functionality
        if (playlist?.songs.length > 1) {
          setTimeout(() => {
            Toast.show({
              type: "info",
              text1: "Reorder Songs",
              text2: "Long press or use the drag handle to reorder songs",
              position: "bottom",
              visibilityTime: 4000,
            });
          }, 1000);
        }
      }
    }, [playlistId])
  );

  // Keep the original useEffect for initial load
  useEffect(() => {
    if (playlistId && !playlist) {
      loadPlaylistData();
    }
  }, [playlistId]);

  const loadPlaylistData = async () => {
    setIsLoading(true);
    try {
      const [playlistData, allSongs] = await Promise.all([
        getPlaylist(playlistId),
        getDownloadedSongs(),
      ]);

      if (!playlistData) {
        Alert.alert("Error", "Playlist not found");
        router.replace("/playlist");
        return;
      }

      setPlaylist(playlistData);

      // Filter out songs that are already in the playlist
      const songsNotInPlaylist = allSongs.filter(
        (song) =>
          !playlistData.songs.some(
            (playlistSong) => playlistSong.id === song.id
          )
      );
      setAvailableSongs(songsNotInPlaylist);
    } catch (error) {
      console.error("Error loading playlist:", error);
      Alert.alert("Error", "Failed to load playlist");
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlaylistData();
    setRefreshing(false);
  };

  const handlePlayPlaylist = async () => {
    if (!playlist || playlist.songs.length === 0) {
      Toast.show({
        type: "info",
        text1: "Empty Playlist",
        text2: "This playlist has no songs to play",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    try {
      // Check if the first song in the playlist is already playing
      if (
        currentSong?.id === playlist.songs[0].id &&
        isPlaying &&
        playlistSource === "playlist-detail"
      ) {
        // If the same song is already playing, just navigate to the player
        router.navigate("/player");
        return;
      }

      setAudioPlaylist(playlist.songs);
      setPlaylistSource("playlist-detail"); // Set source as playlist-detail
      await playSong(playlist.songs[0]);
      router.navigate("/player");
    } catch (error) {
      console.error("Error playing playlist:", error);
      Toast.show({
        type: "error",
        text1: "Playback Error",
        text2: "Failed to play playlist",
        position: "top",
        visibilityTime: 3000,
      });
    }
  };

  const handleShufflePlay = async () => {
    if (!playlist || playlist.songs.length === 0) {
      Toast.show({
        type: "info",
        text1: "Empty Playlist",
        text2: "This playlist has no songs to play",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    try {
      // Shuffle the playlist
      const shuffledSongs = [...playlist.songs].sort(() => Math.random() - 0.5);

      setAudioPlaylist(shuffledSongs);
      setPlaylistSource("playlist-detail");
      await playSong(shuffledSongs[0]);
      router.navigate("/player");
    } catch (error) {
      console.error("Error shuffling playlist:", error);
      Toast.show({
        type: "error",
        text1: "Playback Error",
        text2: "Failed to shuffle playlist",
        position: "top",
        visibilityTime: 3000,
      });
    }
  };

  const handlePlaySong = async (song: DownloadedSong) => {
    if (!playlist) return;

    try {
      // Check if the song is already playing
      if (currentSong?.id === song.id && isPlaying) {
        // If the same song is already playing, just navigate to the player
        router.navigate("/player");
        return;
      }

      setAudioPlaylist(playlist.songs);
      setPlaylistSource("playlist-detail"); // Set source as playlist-detail
      await playSong(song);
      router.navigate("/player");
    } catch (error) {
      console.error("Error playing song:", error);
      Alert.alert("Error", "Failed to play song");
    }
  };

  const handleRemoveSong = (song: DownloadedSong) => {
    Alert.alert("Remove Song", `Remove "${song.title}" from this playlist?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeSongFromPlaylist(playlistId, song.id);
            loadPlaylistData();
          } catch (error) {
            console.error("Error removing song:", error);
            Alert.alert("Error", "Failed to remove song");
          }
        },
      },
    ]);
  };

  const handleAddSong = async (song: DownloadedSong) => {
    try {
      await addSongToPlaylist(playlistId, song);
      setShowAddSongsModal(false);
      loadPlaylistData();
      Toast.show({
        type: "success",
        text1: "Song Added",
        text2: `"${song.title}" added to playlist`,
        position: "top",
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error("Error adding song:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to add song to playlist",
        position: "top",
        visibilityTime: 3000,
      });
    }
  };

  const renderSongItem = ({
    item,
    getIndex,
    drag,
    isActive,
  }: RenderItemParams<DownloadedSong>) => {
    const index = getIndex() ?? 0;
    const isCurrentSong = currentSong?.id === item.id;
    const showNowPlaying =
      isCurrentSong && playlistSource === "playlist-detail";

    return (
      <ScaleDecorator
        activeScale={0.98}
        inactiveScale={1}
        dragItemOverflow={false}
      >
        <TouchableOpacity
          style={[
          onPress={() => router.back()}
            showNowPlaying && styles.currentSongItem,
            isActive && styles.draggingSongItem,
          ]}
          onPress={() => handlePlaySong(item)}
          onLongPress={drag}
          activeOpacity={0.7}
          delayLongPress={100}
        >
          <View style={styles.songIndex}>
            <Text
              style={[
                styles.indexText,
                showNowPlaying && styles.currentIndexText,
              ]}
            >
              {index + 1}
            </Text>
          </View>

          <View style={styles.coverContainer}>
            <Image
              source={{ uri: item.coverImage }}
              style={styles.coverImage}
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
                size={28}
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

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.dragHandle}
              onPressIn={drag}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="reorder-three-outline"
                size={24}
                color={Colors.dark.subText}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveSong(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="remove-circle-outline"
                size={24}
                color={Colors.dark.error}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  const renderAvailableSongItem = ({ item }: { item: DownloadedSong }) => (
    <TouchableOpacity
      style={styles.availableSongItem}
      onPress={() => handleAddSong(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.coverImage }} style={styles.smallCoverImage} />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <Ionicons
        name="add-circle-outline"
        size={24}
        color={Colors.dark.primary}
      />
    </TouchableOpacity>
  );

  // Instead of showing a full-screen loading state, we'll maintain the UI structure
  // and show loading indicators within the existing layout
  if (!playlist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Playlist not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <LinearGradient
        colors={[Colors.dark.background, "#0A0A0A"]}
        style={styles.gradientBackground}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/playlist")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {playlist.name}
            </Text>
            <Text style={styles.headerSubtitle}>
              {playlist.songs.length} song
              {playlist.songs.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddSongsModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color={Colors.dark.primary} />
          </TouchableOpacity>
        </View>

        {/* Songs List */}
        {isLoading && !refreshing ? (
          <View style={styles.inlineLoadingContainer}>
            <Ionicons
              name="list-outline"
              size={48}
              color={Colors.dark.primary}
            />
            <Text style={styles.loadingText}>Loading playlist...</Text>
          </View>
        ) : playlist.songs.length > 0 ? (
          <DraggableFlatList
            data={playlist.songs}
            renderItem={renderSongItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.dark.primary}
                colors={[Colors.dark.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            activationDistance={10}
            animationConfig={{ 
              damping: 25, 
              stiffness: 300,
              mass: 0.8,
              restDisplacementThreshold: 0.01,
              restSpeedThreshold: 0.01
            }}
            dragHitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            ListHeaderComponent={
              <View>
                {/* Playlist Info */}
                <View style={styles.playlistHeader}>
                  <View style={styles.playlistCoverContainer}>
                    {playlist.coverImage ? (
                      <Image
                        source={{ uri: playlist.coverImage }}
                        style={styles.playlistCover}
                      />
                    ) : (
                      <LinearGradient
                        colors={[
                          Colors.dark.primary + "40",
                          Colors.dark.primary + "20",
                        ]}
                        style={styles.defaultPlaylistCover}
                      >
                        <Ionicons
                          name="musical-notes"
                          size={32}
                          color={Colors.dark.primary}
                        />
                      </LinearGradient>
                    )}
                  </View>

                  <View style={styles.playlistMeta}>
                    <Text style={styles.playlistName}>{playlist.name}</Text>
                    <Text style={styles.playlistStats}>
                      {playlist.songs.length} song
                      {playlist.songs.length !== 1 ? "s" : ""}
                    </Text>

                    <View style={styles.playlistActions}>
                      {playlist.songs.length > 0 && (
                        <TouchableOpacity
                          style={styles.playAllButton}
                          onPress={handlePlayPlaylist}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="play"
                            size={16}
                            color={Colors.dark.background}
                          />
                          <Text style={styles.playAllText}>Play All</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.addSongsButton}
                        onPress={() => setShowAddSongsModal(true)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="add"
                          size={16}
                          color={Colors.dark.text}
                        />
                        <Text style={styles.addSongsText}>Add Songs</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            }
            onDragEnd={({ from, to }) => {
              if (from !== to) {
                // Optimistically update the UI immediately for smooth experience
                const newSongs = [...playlist.songs];
                const [movedSong] = newSongs.splice(from, 1);
                newSongs.splice(to, 0, movedSong);
                
                // Update local state immediately without any delays
                setPlaylist(prev => ({
                  ...prev,
                  songs: newSongs,
                }));

                // Persist changes in background without blocking UI
                reorderSongsInPlaylist(playlistId, from, to).catch((error) => {
                  console.error("Error reordering songs:", error);
                  // Revert to original order if there's an error
                  loadPlaylistData();
                  Alert.alert("Error", "Failed to reorder songs");
                });
              }
            }}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyStateContainer}>
              <Ionicons
                name="musical-note-outline"
                size={64}
                color={Colors.dark.subText}
              />
              <Text style={styles.emptyText}>No songs in this playlist</Text>
              <Text style={styles.emptySubText}>
                Add songs from your library to get started
              </Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => setShowAddSongsModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color={Colors.dark.background} />
                <Text style={styles.addFirstButtonText}>Add Songs</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Add Songs Modal */}
        <Modal
          visible={showAddSongsModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowAddSongsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Songs to Playlist</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowAddSongsModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>

              {availableSongs.length > 0 ? (
                <FlatList
                  data={availableSongs}
                  renderItem={renderAvailableSongItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.modalListContent}
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => (
                    <View style={styles.separator} />
                  )}
                />
              ) : (
                <View style={styles.noSongsContainer}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={64}
                    color={Colors.dark.primary}
                  />
                  <Text style={styles.noSongsText}>All songs added!</Text>
                  <Text style={styles.noSongsSubText}>
                    You've added all your downloaded songs to this playlist
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
        <Toast />
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "30",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textDim,
    fontWeight: "500",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  playlistHeader: {
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
  },
  playlistCoverContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    position: "relative",
    marginRight: 16,
  },
  playlistCover: {
    width: "100%",
    height: "100%",
  },
  defaultPlaylistCover: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  playlistMeta: {
    flex: 1,
    alignItems: "flex-start",
  },
  playlistName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 4,
    textAlign: "left",
  },
  playlistStats: {
    fontSize: 14,
    color: Colors.dark.subText,
    marginBottom: 12,
    textAlign: "left",
    fontWeight: "500",
  },
  playlistActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  },
  playAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  playAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.background,
    marginLeft: 6,
  },

  addSongsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border + "60",
  },
  addSongsText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.text,
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  separator: {
    height: 8,
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border + "40",
  },
  currentSongItem: {
    borderColor: Colors.dark.primary + "60",
    borderWidth: 2,
    backgroundColor: Colors.dark.card + "F0",
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  draggingSongItem: {
    backgroundColor: Colors.dark.primary + "30",
    borderColor: Colors.dark.primary,
    borderWidth: 2,
    elevation: 8,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    transform: [{ scale: 1.02 }],
  },
  songIndex: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  indexText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.subText,
  },
  currentIndexText: {
    color: Colors.dark.primary,
    fontWeight: "700",
  },
  coverContainer: {
    position: "relative",
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  currentSongOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  playIconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  currentPlayIcon: {
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
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
    color: Colors.dark.subText,
  },
  currentArtistName: {
    color: Colors.dark.primary + "CC",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  dragHandle: {
    padding: 4,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyStateContainer: {
    alignItems: "center",
    maxWidth: 280,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 16,
    color: Colors.dark.subText,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  addFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addFirstButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.dark.background,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.dark.subText,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: Colors.dark.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.dark.background,
    borderRadius: 20,
    width: "100%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "30",
    backgroundColor: Colors.dark.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.background,
    justifyContent: "center",
    alignItems: "center",
  },
  modalListContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  availableSongItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border + "40",
  },
  smallCoverImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  noSongsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  noSongsText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  noSongsSubText: {
    fontSize: 16,
    color: Colors.dark.subText,
    textAlign: "center",
    lineHeight: 22,
  },
  nowPlayingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  soundWave: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 6,
  },
  bar: {
    width: 2,
    backgroundColor: Colors.dark.primary,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  bar1: {
    height: 8,
  },
  bar2: {
    height: 12,
  },
  bar3: {
    height: 6,
  },
  nowPlayingText: {
    fontSize: 10,
    color: Colors.dark.primary,
    fontWeight: "600",
  },
});
