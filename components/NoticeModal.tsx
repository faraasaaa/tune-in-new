import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import Colors from '../constants/Colors'; // Assuming Colors.ts is in ../constants/

export interface NoticeData {
  head: string;
  img?: string | null;
  msg: string;
}

interface NoticeModalProps {
  visible: boolean;
  notice: NoticeData | null;
  onClose: () => void;
}

const NoticeModal: React.FC<NoticeModalProps> = ({ visible, notice, onClose }) => {
  const { width, height } = useWindowDimensions();
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  if (!notice) {
    return null;
  }

  // Responsive calculations
  const isSmallScreen = width < 400;
  const isMediumScreen = width >= 400 && width < 600;
  const isLargeScreen = width >= 600;
  const isTablet = width >= 768;

  // Dynamic sizing based on screen size
  const getModalWidth = () => {
    if (isTablet) return width * 0.6;
    if (isLargeScreen) return width * 0.8;
    if (isMediumScreen) return width * 0.85;
    return width * 0.9;
  };

  const getModalMaxHeight = () => {
    if (isTablet) return height * 0.7;
    return height * 0.8;
  };

  const getImageMaxHeight = () => {
    if (isTablet) return height * 0.25;
    if (isSmallScreen) return height * 0.2;
    return height * 0.3;
  };

  const getPadding = () => {
    if (isTablet) return 30;
    if (isSmallScreen) return 15;
    return 20;
  };

  const getFontSizes = () => {
    if (isTablet) {
      return { header: 26, message: 18 };
    }
    if (isSmallScreen) {
      return { header: 20, message: 14 };
    }
    return { header: 22, message: 16 };
  };

  const modalWidth = getModalWidth();
  const modalMaxHeight = getModalMaxHeight();
  const imageMaxHeight = getImageMaxHeight();
  const padding = getPadding();
  const fontSizes = getFontSizes();

  const handleImageLoadStart = () => {
    setImageLoading(true);
    setImageError(false);
    setImageDimensions(null);
  };

  const handleImageLoadEnd = (event: any) => {
    setImageLoading(false);
    if (event.nativeEvent && event.nativeEvent.source) {
        const { width: imgWidth, height: imgHeight } = event.nativeEvent.source;
        setImageDimensions({ width: imgWidth, height: imgHeight });
    } else {
        setImageDimensions(null); 
    }
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    setImageDimensions(null);
  };

  const getImageContainerStyle = () => {
    if (!imageDimensions) {
        const defaultLoadingHeight = imageMaxHeight * 0.8; 
        return { width: '100%', height: defaultLoadingHeight };
    }

    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const imageWrapperMaxWidth = modalWidth - (padding * 2);
    const constrainedHeightByMax = getImageMaxHeight();

    let calculatedWidth = imageWrapperMaxWidth;
    let calculatedHeight = calculatedWidth / imageAspectRatio;

    if (calculatedHeight > constrainedHeightByMax) {
        calculatedHeight = constrainedHeightByMax;
        calculatedWidth = calculatedHeight * imageAspectRatio;
    }

    if (calculatedWidth > imageWrapperMaxWidth) {
        calculatedWidth = imageWrapperMaxWidth;
        calculatedHeight = calculatedWidth / imageAspectRatio; 
    }
    
    return {
      width: calculatedWidth,
      height: calculatedHeight,
    };
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.centeredView}>
        <View style={[
          styles.modalView, 
          { 
            width: modalWidth, 
            maxHeight: modalMaxHeight,
            padding: padding 
          }
        ]}>
          <TouchableOpacity 
            style={[styles.closeButton, { top: padding * 0.5, right: padding * 0.5 }]} 
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="close-circle" 
              size={isSmallScreen ? 26 : 30} 
              color={Colors.dark.subText} 
            />
          </TouchableOpacity>

          <Text style={[
            styles.headerText, 
            { 
              fontSize: fontSizes.header,
              marginBottom: padding * 0.25, // Reduced marginBottom
              marginTop: padding * 0.5 
            }
          ]}>
            {notice.head}
          </Text>

          <ScrollView 
            style={{ width: '100%' }} 
            // Added paddingTop to contentContainerStyle
            contentContainerStyle={[styles.scrollContentContainer, { paddingTop: padding * 0.5 }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {notice.img && !imageError && (
              <View style={[
                styles.imageContainer, 
                { 
                  maxHeight: imageMaxHeight,
                  // Removed marginTop from here
                }
              ]}>
                {imageLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator 
                      size={isSmallScreen ? "small" : "large"} 
                      color={Colors.dark.text} 
                    />
                    <Text style={[styles.loadingText, { fontSize: fontSizes.message - 2 }]}>
                      Loading image...
                    </Text>
                  </View>
                )}
                <View style={[styles.imageWrapper, getImageContainerStyle()]}>
                  <Image
                    source={{ uri: notice.img }}
                    style={styles.image} 
                    resizeMode="contain" 
                    onLoadStart={handleImageLoadStart}
                    onLoad={handleImageLoadEnd}
                    onError={handleImageError}
                  />
                </View>
              </View>
            )}
            
            {imageError && notice.img && (
              <View style={[
                styles.errorContainer, 
                { 
                  maxHeight: imageMaxHeight, 
                  // Removed marginTop from here
                }
              ]}>
                <Ionicons 
                  name="image-outline" 
                  size={isSmallScreen ? 40 : 50} 
                  color={Colors.dark.subText} 
                />
                <Text style={[styles.errorText, { fontSize: fontSizes.message - 2 }]}>
                  Failed to load image
                </Text>
              </View>
            )}

            <Text style={[
              styles.messageText, 
              { 
                fontSize: fontSizes.message,
                lineHeight: fontSizes.message * 1.4,
                marginTop: notice.img ? padding * 0.25 : 0 // Adjusted marginTop
              }
            ]}>
              {notice.msg}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 19, 19, 0.7)', 
    paddingHorizontal: 10, 
    paddingVertical: 20, 
  },
  modalView: {
    backgroundColor: Colors.dark.card, 
    borderRadius: 15, 
    alignItems: 'center', 
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8, 
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    zIndex: 1, 
    borderRadius: 15, 
  },
  headerText: {
    fontWeight: 'bold',
    color: Colors.dark.text,
    textAlign: 'center',
    paddingHorizontal: 40, 
  },
  scrollContentContainer: { // paddingTop will be added dynamically
    alignItems: 'center', 
    paddingBottom: 10, 
    flexGrow: 1, 
  },
  imageContainer: {
    width: '100%', 
    position: 'relative', 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  imageWrapper: {
    borderRadius: 12, 
    overflow: 'hidden', 
    backgroundColor: 'rgba(128, 128, 128, 0.05)', 
    marginBottom: 15, 
  },
  image: {
    width: '100%', 
    height: '100%', 
  },
  loadingContainer: {
    position: 'absolute',
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.1)', 
    borderRadius: 12, 
    padding: 20,
  },
  loadingText: {
    color: Colors.dark.textDim,
    marginTop: 10,
    textAlign: 'center',
  },
  errorContainer: {
    width: '100%', 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(128, 128, 128, 0.1)', 
    borderRadius: 12, 
    padding: 30, 
    marginBottom: 15, 
  },
  errorText: {
    color: Colors.dark.textDim,
    marginTop: 10,
    textAlign: 'center',
  },
  messageText: {
    color: Colors.dark.textDim,
    textAlign: 'left', 
    width: '100%', 
  },
});

export default NoticeModal;