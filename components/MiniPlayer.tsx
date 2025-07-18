import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../constants/Colors";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";

const { width } = Dimensions.get("window");

export default function MiniPlayer() {
  const {
    currentSong,
    isPlaying,
    pauseSong,
    resumeSong,
    position,
    duration,
    playlistSource,
  } = useAudioPlayer();
  const router = useRouter();
  const currentRoute = usePathname(); // Use usePathname for a more reliable route string

  // Get the current route to hide MiniPlayer on player screen

  // Don't show MiniPlayer on the player screen
  // Double check to ensure it's not shown on the player page
  if (!currentSong) {
    return null;
  }

  // Check if currentRoute is a string and indicates the player page
  if (
    typeof currentRoute === "string" &&
    (currentRoute === "/player" || currentRoute.includes("player"))
  ) {
    return null;
  }

  // Don't show MiniPlayer on the library page when playing from a playlist
  if (
    typeof currentRoute === "string" &&
    currentRoute === "/library" &&
    (playlistSource === "playlist" || playlistSource === "playlist-detail")
  ) {
    return null;
  }

  // Don't show MiniPlayer on playlist-detail page when playing from that playlist
  if (
    typeof currentRoute === "string" &&
    currentRoute === "/playlist-detail" &&
    playlistSource === "playlist-detail"
  ) {
    return null;
  }

  // If currentRoute is not a string (e.g., null or undefined during init),
  // the above condition will be false, and the MiniPlayer will render (if currentSong exists).
  // This might be acceptable if the route quickly resolves.

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await pauseSong();
      } else {
        await resumeSong();
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
      // Silently handle errors in mini player
    }
  };

  const navigateToPlayer = () => {
    router.push("/player");
  };

  // Calculate progress percentage for the progress bar
  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={styles.outerContainer}>
      {/* Progress bar at the top of mini player */}
      <View style={styles.progressBarContainer}>
        <View
          style={[styles.progressBar, { width: `${progressPercentage}%` }]}
        />
      </View>

      <TouchableOpacity style={styles.container} onPress={navigateToPlayer} activeOpacity={0.8}>
        <Image
          source={{ uri: currentSong.coverImage }}
          style={styles.coverImage}
          transition={200}
        />
        <View style={styles.infoContainer}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause} activeOpacity={0.7}>
          <Ionicons
            name={isPlaying ? "pause-circle" : "play-circle"}
            size={36}
            color={Colors.dark.primary}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark.card,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    zIndex: 999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressBarContainer: {
    width: "100%",
    height: 2,
    backgroundColor: Colors.dark.secondary,
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.dark.primary,
  },
  container: {
    height: 65,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  coverImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: 2,
  },
  artistName: {
    fontSize: 13,
    color: Colors.dark.textDim,
  },
  playButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
});
