import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const PhotoDebugScreen = () => {
  const handleTakePhoto = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera permissions to make this work!'
        );
        return;
      }

      // Launch camera with default settings
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const timestamp = Date.now();

        // Log the entire asset to console
        console.log('📷 Photo Debug - Asset:', JSON.stringify(asset, null, 2));

        // Check fileName and generate fallback if needed
        const originalFileName = asset.fileName;
        let finalFileName = originalFileName;

        // Check if fileName is missing or doesn't contain a dot
        if (!originalFileName || !originalFileName.includes('.')) {
          finalFileName = `photo_${timestamp}.jpg`;
        }

        // Show alert with debug information
        Alert.alert(
          'Photo Debug Results',
          `Original fileName: ${originalFileName || 'undefined'}\n\nFallback name: ${finalFileName}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Photo debug error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📷 Photo Picker Debug</Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleTakePhoto}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Take a photo</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default PhotoDebugScreen; 