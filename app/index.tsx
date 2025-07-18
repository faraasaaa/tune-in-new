import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import Colors from "../constants/Colors";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import {
  DownloadedSong,
  downloadSong,
  searchSongs,
  Track,
} from "../services/api";
import {
  clearRecentSearches,
  getDownloadedSongs,
  getRecentSearches,
  saveRecentSearch,
  saveSong,
} from "../services/storage";

export default function SearchScreen() {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [downloadedSongs, setDownloadedSongs] = useState<DownloadedSong[]>([]);
  const { playSong, setPlaylist } = useAudioPlayer();
  const searchInputRef = useRef<TextInput>(null);
  const router = useRouter();

  const fetchRecentSearches = async () => {
    const searches = await getRecentSearches();
    setRecentSearches(searches);
  };

  // Load recent searches when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchRecentSearches();
      loadDownloadedSongs();
    }, [])
  );

  const loadDownloadedSongs = async () => {
    const songs = await getDownloadedSongs();
    setDownloadedSongs(songs);
  };

  const handleSearch = async (query?: string) => {
    const searchTerm = (query || searchQuery || "").trim();
    if (!searchTerm) return;

    Keyboard.dismiss(); // Dismiss keyboard when search starts
    setIsLoading(true);
    setSearchResults([]); // Clear previous results immediately
    try {
      const results = await searchSongs(searchTerm);
      // Check against downloaded songs before setting search results
      const songs = await getDownloadedSongs(); // Re-fetch or use state
      setDownloadedSongs(songs);

      setSearchResults(results);
      if (results.length > 0) {
        await saveRecentSearch(searchTerm); // Save successful search term
        fetchRecentSearches(); // Refresh recent searches list
      }
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Error", "Failed to search songs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (track: Track) => {
    // Check if a download is already in progress
    if (downloading) {
      Toast.show({
        type: "info",
        text1: "Download in Progress",
        text2:
          "Please wait for the current download to complete before starting a new one.",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }
    setDownloading(track.uri);
    try {
      const downloadedSong = await downloadSong(track);
      if (downloadedSong) {
        await saveSong(downloadedSong);
        Toast.show({
          type: "success",
          text1: "Success",
          text2: `${track.name} has been downloaded`,
          position: "top",
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error("Download error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to download song",
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setDownloading(null);
    }
  };

  const handlePlayDownloadedSong = async (songToPlay: DownloadedSong) => {
    await playSong(songToPlay);
    router.push("/player");
  };

  const renderTrackItem = ({ item }: { item: Track }) => {
    const artistsText = item.artists.join(", ");
    const isDownloading = downloading === item.uri;

    // Check if this search result item is already downloaded
    const downloadedVersion = downloadedSongs.find(
      (ds) =>
        ds.title.toLowerCase() === item.name.toLowerCase() &&
        ds.album.toLowerCase() === item.album.toLowerCase() &&
        ds.artist.toLowerCase() === artistsText.toLowerCase()
    );

    return (
      <Animated.View style={styles.trackItemContainer}>
        <TouchableOpacity
          style={[
            styles.trackItem,
            downloadedVersion && styles.downloadedTrackItem,
          ]}
          onPress={() =>
            downloadedVersion
              ? handlePlayDownloadedSong(downloadedVersion)
              : handleDownload(item)
          }
        >
          <View style={styles.coverContainer}>
            <Image
              source={{ uri: item.cover_image }}
              style={styles.coverImage}
            />
            {downloadedVersion && (
              <LinearGradient
                colors={["rgba(29,185,84,0.8)", "rgba(29,185,84,0.4)"]}
                style={styles.downloadedOverlay}
              >
                <Ionicons name="checkmark-circle" size={24} color="white" />
              </LinearGradient>
            )}
          </View>
          <View style={styles.trackInfo}>
            <Text
              style={[
                styles.trackName,
                downloadedVersion && styles.downloadedTrackName,
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text
              style={[
                styles.artistName,
                downloadedVersion && styles.downloadedArtistName,
              ]}
              numberOfLines={1}
            >
              {artistsText}
            </Text>
            <Text style={styles.albumName} numberOfLines={1}>
              {item.album}
            </Text>
            {downloadedVersion && (
              <View style={styles.downloadedBadge}>
                <Ionicons
                  name="download-outline"
                  size={12}
                  color={Colors.dark.primary}
                />
                <Text style={styles.downloadedBadgeText}>Downloaded</Text>
              </View>
            )}
          </View>
          <View style={styles.actionButton}>
            {isDownloading ? (
              <ActivityIndicator color={Colors.dark.primary} size="small" />
            ) : downloadedVersion ? (
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => handlePlayDownloadedSong(downloadedVersion)}
              >
                <Ionicons
                  name="play"
                  size={20}
                  color={Colors.dark.background}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => handleDownload(item)}
              >
                <Ionicons
                  name="download-outline"
                  size={20}
                  color={Colors.dark.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRecentSearchItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.recentSearchChip}
      onPress={() => {
        setSearchQuery(item); // Update the input field
        handleSearch(item); // Perform the search with the selected term
      }}
    >
      <Text style={styles.recentSearchText}>{item}</Text>
    </TouchableOpacity>
  );

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
                name="search-outline"
                size={28}
                color={Colors.dark.primary}
              />
              <Text style={styles.headerTitle}>Search Music</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.inputContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={Colors.dark.subText}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for songs..."
              placeholderTextColor={Colors.dark.subText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  Keyboard.dismiss();
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={Colors.dark.subText}
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => handleSearch()}
          >
            <Ionicons name="search" size={24} color={Colors.dark.background} />
          </TouchableOpacity>
        </View>

        {/* Recent Searches Section */}
        {searchResults.length === 0 &&
          recentSearches.length > 0 &&
          !isLoading && (
            <View style={styles.recentSearchesContainer}>
              <View style={styles.recentSearchesHeader}>
                <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
                <TouchableOpacity
                  onPress={async () => {
                    await clearRecentSearches();
                    fetchRecentSearches();
                  }}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={recentSearches}
                renderItem={renderRecentSearchItem}
                keyExtractor={(item, index) => `${item}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentSearchesList}
              />
            </View>
          )}

        {isLoading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.loadingContainer}>
              <Ionicons
                name="musical-notes-outline"
                size={48}
                color={Colors.dark.primary}
              />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={renderTrackItem}
            keyExtractor={(item) => item.uri}
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
                  name={
                    searchQuery.trim()
                      ? "search-outline"
                      : "musical-notes-outline"
                  }
                  size={64}
                  color={Colors.dark.primary}
                />
              </LinearGradient>
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? "No results found" : "Discover new music"}
              </Text>
              <Text style={styles.emptySubText}>
                {searchQuery.trim()
                  ? "Try searching with different keywords"
                  : "Search for your favorite songs and artists"}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
      <Toast />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "30",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  recentSearchesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "30",
  },
  recentSearchesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recentSearchesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  clearButtonText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: "500",
  },
  recentSearchesList: {
    paddingRight: 16,
  },
  recentSearchChip: {
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border + "50",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recentSearchText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border + "30",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 52,
    color: Colors.dark.text,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
    marginLeft: 8,
  },
  searchButton: {
    width: 52,
    height: 52,
    backgroundColor: Colors.dark.primary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.dark.border + "20",
    marginHorizontal: 20,
  },
  listContent: {
    paddingBottom: 20,
    paddingTop: 8,
  },
  trackItemContainer: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: Colors.dark.border + "20",
  },
  downloadedTrackItem: {
    borderColor: Colors.dark.primary + "40",
    backgroundColor: Colors.dark.card + "F0",
  },
  coverContainer: {
    position: "relative",
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  downloadedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  trackInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  trackName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  downloadedTrackName: {
    color: Colors.dark.primary,
  },
  artistName: {
    fontSize: 14,
    color: Colors.dark.subText,
    marginBottom: 2,
  },
  downloadedArtistName: {
    color: Colors.dark.primary + "CC",
  },
  albumName: {
    fontSize: 12,
    color: Colors.dark.subText,
    marginBottom: 6,
  },
  downloadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.primary + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 4,
  },
  downloadedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.dark.primary,
  },
  actionButton: {
    marginLeft: 16,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.primary + "40",
  },
  loadingContainer: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.dark.subText,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateContainer: {
    alignItems: "center",
    maxWidth: 300,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.dark.subText,
    textAlign: "center",
    lineHeight: 20,
  },
});
