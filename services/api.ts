import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

const SPOTIFY_CLIENT_ID = '66e7d064dbdc421d8a3b9b2faac6d408';
const SPOTIFY_CLIENT_SECRET = 'ccd204ab13c84096b148b3c1091084a8';

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
  album: string;
  artist: string;
  download_link: string;
  title: string;
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

let spotifyAccessToken: string | null = null;

const getSpotifyAccessToken = async () => {
  try {
    const authString = `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`;
    const b64AuthString = btoa(authString);
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const headers = {
      Authorization: `Basic ${b64AuthString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const data = 'grant_type=client_credentials';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: data,
    });

    const json = await response.json();
    spotifyAccessToken = json.access_token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    Alert.alert('Error', 'Failed to authenticate with Spotify. Please check your credentials.');
    spotifyAccessToken = null;
  }
};

// Search for songs using Spotify API
export const searchSongs = async (songName: string): Promise<Track[]> => {
  if (!spotifyAccessToken) {
    await getSpotifyAccessToken();
  }

  if (!spotifyAccessToken) {
    return [];
  }

  try {
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(songName)}&type=track&limit=20`;
    const headers = {
      Authorization: `Bearer ${spotifyAccessToken}`,
    };

    const response = await fetch(searchUrl, { headers });

    if (response.status === 401) {
      // Token expired, get a new one and retry
      await getSpotifyAccessToken();
      if (!spotifyAccessToken) return [];
      const newResponse = await fetch(searchUrl, { headers: { Authorization: `Bearer ${spotifyAccessToken}` } });
      const data = await newResponse.json();
      return data.tracks.items.map((item: any) => ({
        album: item.album.name,
        artists: item.artists.map((artist: any) => artist.name),
        cover_image: item.album.images[0]?.url || '',
        external_urls: item.external_urls.spotify,
        name: item.name,
        uri: item.uri,
      }));
    }

    const data = await response.json();
    return data.tracks.items.map((item: any) => ({
      album: item.album.name,
      artists: item.artists.map((artist: any) => artist.name),
      cover_image: item.album.images[0]?.url || '',
      external_urls: item.external_urls.spotify,
      name: item.name,
      uri: item.uri,
    }));
  } catch (error) {
    console.error('Error searching songs on Spotify:', error);
    Alert.alert('Error', 'Failed to search songs on Spotify. Please try again.');
    return [];
  }
};

// Download a song
export const downloadSong = async (track: Track): Promise<DownloadedSong | null> => {
  try {
    const trackId = track.uri.split(':').pop();
    if (!trackId) {
      throw new Error('Invalid track URI');
    }

    const downloadApiUrl = `http://fi8.bot-hosting.net:20980/get?id=${trackId}`;
    const response = await fetch(downloadApiUrl);

    if (!response.ok) {
      throw new Error(`Download request failed with status ${response.status}`);
    }

    const downloadData: DownloadResponse = await response.json();

    // Create a unique filename
    const timestamp = Date.now();
    const sanitizedTitle = downloadData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${sanitizedTitle}_${timestamp}.mp3`;
    const fileUri = `${FileSystem.documentDirectory}songs/${fileName}`;

    // Ensure directory exists
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}songs/`, {
      intermediates: true,
    });
    
    // Download the file
    const downloadResult = await FileSystem.downloadAsync(
      downloadData.download_link,
      fileUri
    );

    if (downloadResult.status !== 200) {
      throw new Error(`File download failed with status ${downloadResult.status}`);
    }

    // Create downloaded song object
    const downloadedSong: DownloadedSong = {
      id: `${track.uri}-${timestamp}`,
      title: downloadData.title,
      artist: downloadData.artist,
      album: downloadData.album,
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