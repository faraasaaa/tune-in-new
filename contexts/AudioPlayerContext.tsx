import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DownloadedSong } from '../services/api';

interface AudioPlayerContextType {
  currentSong: DownloadedSong | null;
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  playbackInstance: Audio.Sound | null;
  playSong: (song: DownloadedSong) => Promise<void>;
  pauseSong: () => Promise<void>;
  resumeSong: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  playNextSong: () => Promise<void>;
  playPreviousSong: () => Promise<void>;
  playlist: DownloadedSong[];
  setPlaylist: (songs: DownloadedSong[]) => void;
  stopSong: () => Promise<void>;
  stopPlayback: () => Promise<void>; // Function to stop playback and clear current song without clearing playlist
  error: string | null;
  playlistSource: string;
  setPlaylistSource: (source: string) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<DownloadedSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackInstance, setPlaybackInstance] = useState<Audio.Sound | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playlist, setPlaylist] = useState<DownloadedSong[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playlistSource, setPlaylistSource] = useState<string>('library'); // Default source is library

  // Initialize audio
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        });
      } catch (error) {
        console.error('Error initializing audio:', error);
        setError('Failed to initialize audio');
      }
    };

    initAudio();
  }, []);
  
  // Handle playbackInstance cleanup
  useEffect(() => {
    // This effect is responsible for cleaning up the playbackInstance when it changes or on unmount
    return () => {
      if (playbackInstance) {
        playbackInstance.unloadAsync();
      }
    };
  }, [playbackInstance]);

  // Removed redundant position update interval - now relying solely on updatePlaybackStatus

  const updatePlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    
    setIsPlaying(status.isPlaying);
    setDuration(status.durationMillis || 0);
    setPosition(status.positionMillis);
    setIsLoading(false); // Set loading to false once playback status is loaded

    // Auto-play next song when current one ends
    if (status.didJustFinish) {
      playNextSong();
    }
  };

  // Listen for playback status changes to ensure auto-play works
  useEffect(() => {
    if (playbackInstance) {
      playbackInstance.setOnPlaybackStatusUpdate(updatePlaybackStatus);
      return () => {
        playbackInstance.setOnPlaybackStatusUpdate(null);
      };
    }
  }, [playbackInstance]);

  // Removed masterPlaylist management - simplifying playlist logic

  const playSong = async (song: DownloadedSong) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Unload previous song if exists
      if (playbackInstance) {
        await playbackInstance.unloadAsync();
      }

      // Load and play new song
      const { sound } = await Audio.Sound.createAsync(
        { uri: song.filePath },
        { shouldPlay: true },
        updatePlaybackStatus
      );

      setPlaybackInstance(sound);
      setCurrentSong(song);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing song:', error);
      setError('Failed to play song');
      setIsLoading(false);
    }
  };

  const pauseSong = async () => {
    if (playbackInstance) {
      await playbackInstance.pauseAsync();
    }
  };

  const resumeSong = async () => {
    if (playbackInstance) {
      await playbackInstance.playAsync();
    }
  };

  const seekTo = async (position: number) => {
    if (!playbackInstance) return;
    
    // Validate position is within bounds
    if (position < 0) {
      position = 0;
    } else if (position > duration) {
      position = duration;
    }
    
    await playbackInstance.setPositionAsync(position);
  };

  const getCurrentSongIndex = () => {
    if (!currentSong || playlist.length === 0) return -1;
    return playlist.findIndex(song => song.id === currentSong.id);
  };

  const playNextSong = async () => {
    if (playlist.length === 0) return;
    
    const currentIndex = getCurrentSongIndex();
    if (currentIndex === -1) return;
    
    const nextIndex = (currentIndex + 1) % playlist.length;
    await playSong(playlist[nextIndex]);
  };

  const playPreviousSong = async () => {
    if (playlist.length === 0) return;
    
    const currentIndex = getCurrentSongIndex();
    if (currentIndex === -1) return;
    
    const previousIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    await playSong(playlist[previousIndex]);
  };

  const stopSong = async () => {
    if (playbackInstance) {
      await playbackInstance.stopAsync();
      await playbackInstance.unloadAsync();
      setPlaybackInstance(null);
    }
    setCurrentSong(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  };

  const stopPlayback = async () => {
    // Stop the current song playback and clear the current song
    // but keep the playlist intact for future use
    if (playbackInstance) {
      await playbackInstance.stopAsync();
      await playbackInstance.unloadAsync();
      setPlaybackInstance(null);
    }
    setCurrentSong(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  };

  // Simple playlist setter
  const setPlaylistAndUpdateCurrent = (songs: DownloadedSong[]) => {
    setPlaylist(songs);
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        isLoading,
        duration,
        position,
        playbackInstance,
        playSong,
        pauseSong,
        resumeSong,
        seekTo,
        playNextSong,
        playPreviousSong,
        playlist,
        setPlaylist: setPlaylistAndUpdateCurrent,
        stopSong,
        stopPlayback,
        error,
        playlistSource,
        setPlaylistSource,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};