import AsyncStorage from '@react-native-async-storage/async-storage';
import { DownloadedSong } from './api';

export interface Playlist {
  id: string;
  name: string;
  songs: DownloadedSong[];
  createdAt: string;
  updatedAt: string;
  coverImage?: string; // Will use first song's cover or default
}

const PLAYLISTS_KEY = 'user_playlists';

// Get all playlists
export const getPlaylists = async (): Promise<Playlist[]> => {
  try {
    const playlistsJson = await AsyncStorage.getItem(PLAYLISTS_KEY);
    return playlistsJson ? JSON.parse(playlistsJson) : [];
  } catch (error) {
    console.error('Error getting playlists:', error);
    return [];
  }
};

// Save a playlist
export const savePlaylist = async (playlist: Playlist): Promise<void> => {
  try {
    const playlists = await getPlaylists();
    const existingIndex = playlists.findIndex(p => p.id === playlist.id);
    
    if (existingIndex > -1) {
      playlists[existingIndex] = playlist;
    } else {
      playlists.push(playlist);
    }
    
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch (error) {
    console.error('Error saving playlist:', error);
    throw error;
  }
};

// Create a new playlist
export const createPlaylist = async (name: string): Promise<Playlist> => {
  const playlist: Playlist = {
    id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    songs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await savePlaylist(playlist);
  return playlist;
};

// Delete a playlist
export const deletePlaylist = async (playlistId: string): Promise<void> => {
  try {
    const playlists = await getPlaylists();
    const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updatedPlaylists));
  } catch (error) {
    console.error('Error deleting playlist:', error);
    throw error;
  }
};

// Add song to playlist
export const addSongToPlaylist = async (playlistId: string, song: DownloadedSong): Promise<void> => {
  try {
    const playlists = await getPlaylists();
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);
    
    if (playlistIndex === -1) {
      throw new Error('Playlist not found');
    }
    
    const playlist = playlists[playlistIndex];
    
    // Check if song already exists in playlist
    if (!playlist.songs.some(s => s.id === song.id)) {
      playlist.songs.push(song);
      playlist.updatedAt = new Date().toISOString();
      
      // Update cover image to first song's cover if not set
      if (!playlist.coverImage && playlist.songs.length > 0) {
        playlist.coverImage = playlist.songs[0].coverImage;
      }
      
      await savePlaylist(playlist);
    } else {
      throw new Error('Song already exists in playlist');
    }
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    throw error;
  }
};

// Remove song from playlist
export const removeSongFromPlaylist = async (playlistId: string, songId: string): Promise<void> => {
  try {
    const playlists = await getPlaylists();
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);
    
    if (playlistIndex === -1) {
      throw new Error('Playlist not found');
    }
    
    const playlist = playlists[playlistIndex];
    playlist.songs = playlist.songs.filter(s => s.id !== songId);
    playlist.updatedAt = new Date().toISOString();
    
    // Update cover image if we removed the first song
    if (playlist.songs.length > 0) {
      playlist.coverImage = playlist.songs[0].coverImage;
    } else {
      playlist.coverImage = undefined;
    }
    
    await savePlaylist(playlist);
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    throw error;
  }
};

// Get a specific playlist
export const getPlaylist = async (playlistId: string): Promise<Playlist | null> => {
  try {
    const playlists = await getPlaylists();
    return playlists.find(p => p.id === playlistId) || null;
  } catch (error) {
    console.error('Error getting playlist:', error);
    return null;
  }
};