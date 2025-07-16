import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  FlatList,
  Alert,
  Dimensions
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Footer } from '../components';

const { width } = Dimensions.get('window');

interface DocumentItem {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  uri: string;
  size?: number;
}

const HomeScreen = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');

  const handleUploadDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const newDocuments = result.assets.map((asset, index) => ({
          id: `doc_${Date.now()}_${index}`,
          name: asset.name || `Document ${index + 1}`,
          type: 'pdf' as const,
          uri: asset.uri,
          size: asset.size,
        }));
        
        setDocuments(prev => [...prev, ...newDocuments]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    }
  };

  const handleTakePhotos = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera permissions to make this work!'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newDocument: DocumentItem = {
        id: `img_${Date.now()}`,
        name: 'Camera Capture',
        type: 'image',
        uri: result.assets[0].uri,
      };
      
      setDocuments(prev => [...prev, newDocument]);
    }
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleStartAnalysis = () => {
    if (documents.length === 0) {
      Alert.alert('No Documents', 'Please upload or take photos of documents first.');
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate analysis process
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisResult(
        `Analysis completed for ${documents.length} document(s)!\n\n` +
        `Found ${documents.length} document(s) with various content types.\n\n` +
        `Key insights:\n` +
        `• Document processing successful\n` +
        `• AI analysis completed\n` +
        `• Results ready for review\n\n` +
        `This is a placeholder result. In the real app, this would contain the actual AI analysis results.`
      );
    }, 3000);
  };

  const renderDocumentItem = ({ item }: { item: DocumentItem }) => (
    <View style={styles.documentItem}>
      <View style={styles.documentInfo}>
        <Text style={styles.documentIcon}>
          {item.type === 'pdf' ? '📄' : '📷'}
        </Text>
        <View style={styles.documentDetails}>
          <Text style={styles.documentName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.documentType}>
            {item.type.toUpperCase()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveDocument(item.id)}
        activeOpacity={0.7}
      >
        <Text style={styles.removeIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Your AI Document Assistant</Text>
          <Text style={styles.subtitle}>
            Upload documents or take photos to get instant AI-powered insights and answers
          </Text>
        </View>

        {/* Upload Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>Upload Document or Take Photo</Text>
          <Text style={styles.instructionsSubtitle}>
            Drag and drop files here, or click to browse
          </Text>
          <View style={styles.fileTypesContainer}>
            <View style={styles.fileTypeItem}>
              <Text style={styles.fileTypeIcon}>📄</Text>
              <View style={styles.fileTypeInfo}>
                <Text style={styles.fileTypeTitle}>Documents</Text>
                <Text style={styles.fileTypeDesc}>PDF, DOC, DOCX, TXT files up to 10MB</Text>
              </View>
            </View>
            <View style={styles.fileTypeItem}>
              <Text style={styles.fileTypeIcon}>📷</Text>
              <View style={styles.fileTypeInfo}>
                <Text style={styles.fileTypeTitle}>Images</Text>
                <Text style={styles.fileTypeDesc}>JPG, PNG files or camera photos</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Upload Buttons */}
        <View style={styles.uploadSection}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadDocuments}
            activeOpacity={0.8}
          >
            <Text style={styles.uploadButtonIcon}>📄</Text>
            <Text style={styles.uploadButtonText}>Upload Document</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleTakePhotos}
            activeOpacity={0.8}
          >
            <Text style={styles.uploadButtonIcon}>📷</Text>
            <Text style={styles.uploadButtonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Document Pool Section */}
        {documents.length > 0 && (
          <View style={styles.documentPoolSection}>
            <Text style={styles.sectionTitle}>Document Pool</Text>
            <FlatList
              data={documents}
              renderItem={renderDocumentItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              style={styles.documentList}
            />
          </View>
        )}

        {/* Analyze Button */}
        <View style={styles.analyzeSection}>
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              (documents.length === 0 || isAnalyzing) && styles.analyzeButtonDisabled
            ]}
            onPress={handleStartAnalysis}
            disabled={documents.length === 0 || isAnalyzing}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.analyzeButtonText,
              (documents.length === 0 || isAnalyzing) && styles.analyzeButtonTextDisabled
            ]}>
              {isAnalyzing ? '🔄 Analyzing...' : '🔍 Start Analyzing'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Analysis Result Section */}
        {analysisResult && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Analysis Results</Text>
            <ScrollView style={styles.resultContainer}>
              <Text style={styles.resultText}>{analysisResult}</Text>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <Footer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 10, // Add some extra spacing from the top
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  instructionsSection: {
    backgroundColor: '#f1f2f6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderStyle: 'dashed',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  fileTypesContainer: {
    gap: 15,
  },
  fileTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fileTypeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  fileTypeInfo: {
    flex: 1,
  },
  fileTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  fileTypeDesc: {
    fontSize: 12,
    color: '#7f8c8d',
    lineHeight: 16,
  },
  uploadSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 15,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
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
  uploadButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  documentPoolSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  documentList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  documentType: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  removeIcon: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  analyzeSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  analyzeButton: {
    backgroundColor: '#27ae60',
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
  analyzeButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  analyzeButtonTextDisabled: {
    color: '#95a5a6',
  },
  resultSection: {
    marginBottom: 20,
  },
  resultContainer: {
    backgroundColor: '#f1f2f6',
    borderRadius: 12,
    padding: 20,
    maxHeight: 300,
  },
  resultText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
});

export default HomeScreen; 