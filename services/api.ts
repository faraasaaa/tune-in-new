import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

// Hardcoded base URL
const BASE_URL = 'https://conventional-malena-noneoool-355b1774.koyeb.app';

// Function to get the hardcoded base URL
const getBaseUrl = async (): Promise<string> => {
  return BASE_URL;
};

export interface Track {
  album: string;
  artists: string[];
  cover_image: string;
  external_urls: string;
  name: string;
  uri: string;
}

export interface SearchResponse {
  tracks: Track[];
}

export interface DownloadResponse {
  data: {
    message: string;
    track_info: {
      album: string;
      artist: string;
      title: string;
    };
    upload_url: string;
  };
  status: string;
}

export interface DownloadedSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverImage: string;
  filePath: string;
  downloadDate: string;
}

// Search for songs
export const searchSongs = async (songName: string): Promise<Track[]> => {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/search?song_name=${encodeURIComponent(songName)}`);
    const data: SearchResponse = await response.json();
    return data.tracks || [];
  } catch (error) {
    console.error('Error searching songs:', error);
    Alert.alert('Error', 'Failed to search songs. Please try again.');
    return [];
  }
};

// Download a song
export const downloadSong = async (track: Track): Promise<DownloadedSong | null> => {
  try {
    // Extract Spotify URL from external_urls
    const spotifyUrl = track.external_urls;
    
    // Request download from API
    const baseUrl = await getBaseUrl();
    const downloadResponse = await fetch(`${baseUrl}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spotify_url: spotifyUrl,
      }),
    });

    const downloadData: DownloadResponse = await downloadResponse.json();
    
    if (downloadData.status !== 'success') {
      throw new Error('Download failed');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const sanitizedTitle = downloadData.data.track_info.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${sanitizedTitle}_${timestamp}.mp3`;
    const fileUri = `${FileSystem.documentDirectory}songs/${fileName}`;
    
    // Ensure directory exists
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}songs/`, {
      intermediates: true
    });

    // Wait for 4 seconds before starting the download
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Download the file
    const downloadResult = await FileSystem.downloadAsync(
      downloadData.data.upload_url,
      fileUri
    );

    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }

    // Create downloaded song object
    const downloadedSong: DownloadedSong = {
      id: `${track.uri}-${timestamp}`,
      title: downloadData.data.track_info.title,
      artist: downloadData.data.track_info.artist,
      album: downloadData.data.track_info.album,
      coverImage: track.cover_image,
      filePath: fileUri,
      downloadDate: new Date().toISOString(),
    };

    return downloadedSong;
  } catch (error) {
    console.error('Error downloading song:', error);
    Alert.alert('Error', 'Failed to download song. Please try again.');
    return null;
  }
};