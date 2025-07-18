import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

export default function PlayerScreen() {
  const {
    currentSong,
    isPlaying,
    duration,
    position,
    pauseSong,
    resumeSong,
    seekTo,
    playNextSong,
    playPreviousSong,
    stopPlayback,
    playlistSource,
  } = useAudioPlayer();
  const router = useRouter();
  const navigation = useNavigation();
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  
  // Get dynamic window dimensions for responsive calculations
  const { width, height } = useWindowDimensions();
  
  // Calculate responsive sizes based on screen dimensions
  const isPortrait = height > width;
  const imageSize = isPortrait ? width * 0.85 : height * 0.45;
  const controlsHeight = height * 0.09;
  const progressBarWidth = width * 0.85;

  const formatTime = useCallback((milliseconds) => {
    if (!milliseconds) return '0:00';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await pauseSong();
      } else {
        await resumeSong();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      // Provide user feedback for errors
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
    setSeekPosition(position);
  };

  const handleSeekChange = (value) => {
    setSeekPosition(value);
  };

  const handleSeekComplete = async () => {
    try {
      await seekTo(seekPosition);
    } catch (error) {
      console.error('Error seeking:', error);
    }
    setIsSeeking(false);
  };

  const handleCancelSong = async () => {
    if (stopPlayback) {
      await stopPlayback();
    }
    // Navigate back to the correct page based on playlist source
    if (playlistSource === 'playlist') {
      router.push('/playlist');
    } else if (playlistSource === 'playlist-detail') {
      // If we came from a specific playlist detail page, go back to that page
      router.back();
    } else {
      router.push('/library');
    }
  };

  const handleBackNavigation = () => {
    // Navigate back to the correct page based on playlist source
    if (playlistSource === 'playlist') {
      router.push('/playlist');
    } else if (playlistSource === 'playlist-detail') {
      // If we came from a specific playlist detail page, go back to that page
      // We need to use the back() function to return to the previous screen
      router.back();
    } else {
      router.push('/library');
    }
  };

  if (!currentSong) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes" size={Math.min(64, width * 0.15)} color={Colors.dark.secondary} />
          <Text style={styles.emptyText}>No song is currently playing</Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => router.push('/library')}
          >
            <Text style={styles.browseButtonText}>Browse Library</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleBackNavigation} style={styles.headerButton} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.albumName} numberOfLines={1}>{currentSong?.album || 'Album name'}</Text>
        <TouchableOpacity onPress={handleCancelSong} style={styles.headerButton} activeOpacity={0.7}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Album Cover */}
        <View style={[styles.imageContainer, { width: imageSize, height: imageSize }]}>
          <Image
            source={{ uri: currentSong.coverImage }}
            style={styles.coverArt}
            contentFit="cover"
            transition={300}
          />
        </View>

        {/* Song Info */}
        <View style={styles.songInfoContainer}>
          <Text style={styles.songTitle} numberOfLines={1}>{currentSong.title || 'Song name'}</Text>
          <Text style={styles.artistName} numberOfLines={1}>{currentSong.artist || 'Author name'}</Text>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { width: progressBarWidth }]}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(isSeeking ? seekPosition : position)}</Text>
            <Text style={styles.timeText}>-{formatTime(duration - (isSeeking ? seekPosition : position))}</Text>
          </View>
          <Slider
            style={styles.progressBar}
            minimumValue={0}
            maximumValue={duration}
            value={isSeeking ? seekPosition : position}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
            thumbTintColor="#FFFFFF"
            tapToSeek={true}
            onSlidingStart={handleSeekStart}
            onValueChange={handleSeekChange}
            onSlidingComplete={handleSeekComplete}
          />
        </View>

        {/* Controls */}
        <View style={[styles.controlsContainer, { height: controlsHeight }]}>
          <TouchableOpacity style={styles.controlButton} onPress={playPreviousSong} activeOpacity={0.7}>
            <Ionicons name="play-skip-back" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.playPauseButton} onPress={handlePlayPause} activeOpacity={0.8}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#000000" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={playNextSong} activeOpacity={0.7}>
            <Ionicons name="play-skip-forward" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    paddingBottom: 16,
  },
  headerButton: {
    padding: 8,
  },
  albumName: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 90,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    margin: 16,
  },
  coverArt: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  songInfoContainer: {
    width: '85%',
    alignItems: 'center',
    marginVertical: 16,
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  artistName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  progressBar: {
    width: '100%',
    height: 30,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 80,
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  controlButton: {
    padding: 15,
  },
  playPauseButton: {
    backgroundColor: '#FFFFFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
    fontSize: 18,
  },
  browseButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});