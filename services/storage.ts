import AsyncStorage from '@react-native-async-storage/async-storage';
import { DownloadedSong } from './api';

const DOWNLOADED_SONGS_KEY = 'downloaded_songs';
const RECENT_SEARCHES_KEY = 'recent_searches';

// Save a downloaded song to storage
export const saveSong = async (song: DownloadedSong): Promise<void> => {
  try {
    // Get existing songs
    let existingSongs = await getDownloadedSongs();
    
    // Check if the song already exists
    const songIndex = existingSongs.findIndex(s => s.id === song.id);

    if (songIndex > -1) {
      // Replace existing song
      existingSongs[songIndex] = song;
    } else {
      // Add new song
      existingSongs.push(song);
    }
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(DOWNLOADED_SONGS_KEY, JSON.stringify(existingSongs));
  } catch (error) {
    console.error('Error saving song:', error);
    throw error;
  }
};

// Get all downloaded songs
export const getDownloadedSongs = async (): Promise<DownloadedSong[]> => {
  try {
    const songsJson = await AsyncStorage.getItem(DOWNLOADED_SONGS_KEY);
    return songsJson ? JSON.parse(songsJson) : [];
  } catch (error) {
    console.error('Error getting downloaded songs:', error);
    return [];
  }
};

// Delete a downloaded song
export const deleteSong = async (songId: string): Promise<void> => {
  try {
    const songs = await getDownloadedSongs();
    const updatedSongs = songs.filter(song => song.id !== songId);
    await AsyncStorage.setItem(DOWNLOADED_SONGS_KEY, JSON.stringify(updatedSongs));
  } catch (error) {
    console.error('Error deleting song:', error);
    throw error;
  }
};

// Check if a song is already downloaded
export const isSongDownloaded = async (uri: string): Promise<boolean> => {
  try {
    const songs = await getDownloadedSongs();
    return songs.some(song => song.id.startsWith(uri));
  } catch (error) {
    console.error('Error checking if song is downloaded:', error);
    return false;
  }
};

// Save a recent search term
export const saveRecentSearch = async (term: string): Promise<void> => {
  if (!term.trim()) return;
  try {
    let recentSearches = await getRecentSearches();
    // Remove the term if it already exists to move it to the top
    recentSearches = recentSearches.filter(t => t.toLowerCase() !== term.toLowerCase());
    // Add the new term to the beginning
    recentSearches.unshift(term);
    // Keep only the latest (e.g., 10) searches
    const MAX_RECENT_SEARCHES = 10;
    recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  } catch (error) {
    console.error('Error saving recent search:', error);
    // Don't throw, as this is not a critical error
  }
};

// Get all recent search terms
export const getRecentSearches = async (): Promise<string[]> => {
  try {
    const searchesJson = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return searchesJson ? JSON.parse(searchesJson) : [];
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
};

// Clear all recent search terms
export const clearRecentSearches = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.error('Error clearing recent searches:', error);
    // Don't throw
  }
};