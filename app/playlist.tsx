import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Colors from '../constants/Colors';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { DownloadedSong } from '../services/api';
import { Playlist, createPlaylist, deletePlaylist, getPlaylists } from '../services/playlist';
import { getDownloadedSongs } from '../services/storage';

export default function PlaylistScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [downloadedSongs, setDownloadedSongs] = useState<DownloadedSong[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { playSong, setPlaylist, setPlaylistSource, currentSong, isPlaying, playlistSource } = useAudioPlayer();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [playlistData, songsData] = await Promise.all([
        getPlaylists(),
        getDownloadedSongs()
      ]);
      setPlaylists(playlistData);
      setDownloadedSongs(songsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load playlists');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    try {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateModal(false);
      loadData();
      Toast.show({
        type: "success",
        text1: "Playlist Created",
        text2: `"${newPlaylistName.trim()}" has been created`,
        position: "top",
        visibilityTime: 3000,
      });
    } catch (error) {
      console.error('Error creating playlist:', error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to create playlist",
        position: "top",
        visibilityTime: 3000,
      });
    }
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlaylist(playlist.id);
              loadData();
              Toast.show({
                type: "success",
                text1: "Playlist Deleted",
                text2: `"${playlist.name}" has been deleted`,
                position: "top",
                visibilityTime: 3000,
              });
            } catch (error) {
              console.error('Error deleting playlist:', error);
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to delete playlist",
                position: "top",
                visibilityTime: 3000,
              });
            }
          },
        },
      ]
    );
  };

  const handlePlayPlaylist = async (playlist: Playlist) => {
    if (playlist.songs.length === 0) {
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
      if (currentSong?.id === playlist.songs[0].id && isPlaying && playlistSource === 'playlist') {
        // If the same song is already playing, just navigate to the player
        router.push('/player');
        return;
      }
      
      setPlaylist(playlist.songs);
      setPlaylistSource('playlist'); // Set source as playlist
      await playSong(playlist.songs[0]);
      router.push('/player');
    } catch (error) {
      console.error('Error playing playlist:', error);
      Toast.show({
        type: "error",
        text1: "Playback Error",
        text2: "Failed to play playlist",
        position: "top",
        visibilityTime: 3000,
      });
    }
  };

  const navigateToPlaylistDetail = (playlist: Playlist) => {
    router.push({
      pathname: '/playlist-detail' as any,
      params: { playlistId: playlist.id }
    });
  };

  const renderPlaylistItem = ({ item }: { item: Playlist }) => {
    const coverImage = item.coverImage || item.songs[0]?.coverImage;
    
    return (
      <TouchableOpacity 
        style={styles.playlistItem} 
        onPress={() => navigateToPlaylistDetail(item)}
        activeOpacity={0.8}
      >
        <View style={styles.coverContainer}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} />
          ) : (
            <LinearGradient
              colors={[Colors.dark.primary + '40', Colors.dark.primary + '20']}
              style={styles.defaultCover}
            >
              <Ionicons name="musical-notes" size={32} color={Colors.dark.primary} />
            </LinearGradient>
          )}
          <TouchableOpacity 
            style={styles.playButton}
            onPress={() => handlePlayPlaylist(item)}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="play-circle" size={36} color={Colors.dark.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.songCount}>
            {item.songs.length} song{item.songs.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.createdDate}>
            Created {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeletePlaylist(item)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.dark.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <LinearGradient
        colors={[Colors.dark.background, '#0A0A0A']}
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="list-outline" size={28} color={Colors.dark.primary} />
              <Text style={styles.headerTitle}>Playlists</Text>
            </View>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={24} color={Colors.dark.background} />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.loadingContainer}>
              <Ionicons name="list-outline" size={48} color={Colors.dark.primary} />
              <Text style={styles.loadingText}>Loading playlists...</Text>
            </View>
          </View>
        ) : playlists.length > 0 ? (
          <FlatList
            data={playlists}
            renderItem={renderPlaylistItem}
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
          />
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyStateContainer}>
              <LinearGradient
                colors={[Colors.dark.primary + '20', Colors.dark.primary + '05']}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="list-outline" size={64} color={Colors.dark.primary} />
              </LinearGradient>
              <Text style={styles.emptyText}>No playlists yet</Text>
              <Text style={styles.emptySubText}>
                Create your first playlist to organize your favorite songs
              </Text>
              <TouchableOpacity 
                style={styles.createFirstButton}
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color={Colors.dark.background} />
                <Text style={styles.createFirstButtonText}>Create Playlist</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Create Playlist Modal */}
        <Modal
          visible={showCreateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Playlist</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewPlaylistName('');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={Colors.dark.textDim} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Enter playlist name"
                placeholderTextColor={Colors.dark.subText}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={handleCreatePlaylist}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewPlaylistName('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.createModalButton}
                  onPress={handleCreatePlaylist}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createModalButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + '30',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark.text,
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  createButton: {
    backgroundColor: Colors.dark.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  separator: {
    height: 12,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border + '40',
  },
  coverContainer: {
    position: 'relative',
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  defaultCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  playButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  playlistName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  songCount: {
    fontSize: 14,
    color: Colors.dark.subText,
    marginBottom: 2,
    fontWeight: '500',
  },
  createdDate: {
    fontSize: 12,
    color: Colors.dark.subText + 'AA',
    fontWeight: '400',
  },
  deleteButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.dark.error + '15',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.dark.subText,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    maxWidth: 280,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptySubText: {
    fontSize: 16,
    color: Colors.dark.subText,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 4,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createFirstButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.background,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    padding: 0,
    width: '100%',
    maxWidth: 320,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + '30',
    backgroundColor: Colors.dark.background,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    backgroundColor: Colors.dark.background,
    borderRadius: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.dark.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + '30',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border + '60',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  createModalButton: {
    flex: 1,
    backgroundColor: Colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  createModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.background,
  },
});