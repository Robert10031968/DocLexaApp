import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { analyzePastedText } from '../lib/textAnalysis';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import { Footer } from '../components';
import { analyzeDocument } from '../lib/documentAnalysis';
import { supabase } from '../lib/supabase';
import { testUploadNoValidation, deleteFileFromSupabase } from '../lib/fileUpload';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { logAnalysisEvent } from '../lib/supabase';
import { fetchUserPlanInfo, getHomeScreenDisplayText, UserPlanInfo } from '../lib/planInfo';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

interface DocumentItem {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  uri: string;
  size?: number;
  publicUrl?: string;
  storagePath?: string; // Full path in Supabase Storage bucket for deletion
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const HomeScreen = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // Paste text section state
  const [pastedText, setPastedText] = useState<string>('');
  const [pasteCounters, setPasteCounters] = useState<{ chars: number; words: number; pages: number }>({ chars: 0, words: 0, pages: 0 });
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  function estimatePagesFromText(text: string, wordsPerPage = 300) {
    const trimmed = (text || '').trim();
    if (!trimmed) return { chars: 0, words: 0, pages: 0 };
    const chars = text.length;
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const pages = Math.ceil(words / Math.max(1, wordsPerPage));
    return { chars, words, pages };
  }

  React.useEffect(() => {
    const handle = setTimeout(() => {
      const next = estimatePagesFromText(pastedText, 300);
      setPasteCounters(next);
    }, 250);
    return () => clearTimeout(handle);
  }, [pastedText]);

  const handlePasteFromClipboard = async () => {
    try {
      const clip = await Clipboard.getStringAsync();
      if (!clip?.trim()) {
        Alert.alert(t('paste.clipboardEmpty'), t('paste.clipboardEmpty'));
        return;
      }
      setPastedText(clip);
    } catch (e: any) {
      Alert.alert('Clipboard Error', e?.message ?? 'Failed to read clipboard');
    }
  };

  const handleAnalyzePastedText = async () => {
    try {
      if (!pastedText.trim()) return;
      if (pasteCounters.pages <= 0) return;
      setIsAnalyzingText(true);
      setAnalysisError(null);
      setPasteError(null);

      const res = await analyzePastedText({
        text: pastedText,
        analysisType: 'summary',
        words: pasteCounters.words,
        pagesEstimated: pasteCounters.pages,
        source: 'pasted',
      });

      if (res.success) {
        setAnalysisResult(res.result || '');
        await fetchUsageInfo();
      } else {
        Alert.alert(t('alerts.analysisError'), res.error || t('alerts.analysisFailed'));
        setPasteError(res.error || t('alerts.analysisFailed'));
      }
    } catch (e: any) {
      Alert.alert(t('alerts.analysisError'), e?.message || t('alerts.analysisFailed'));
      setPasteError(e?.message || t('alerts.analysisFailed'));
    } finally {
      setIsAnalyzingText(false);
    }
  };


  const [usage, setUsage] = useState<number | null>(null);
  const [quota, setQuota] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<UserPlanInfo | null>(null);

  const { t } = useTranslation();
  const { user } = useAuth();





  // Fetch usage/quota on mount and after analysis
  const fetchUsageInfo = React.useCallback(async () => {
    setUsageError(null);
    try {
      if (!user?.id) {
        setUsageError(t('planInfo.noUserFound'));
        return;
      }

      const planInfo = await fetchUserPlanInfo(user.id);
      setPlan(planInfo.planName);
      setPlanInfo(planInfo);
      
      // Set quota for backward compatibility
      setQuota(planInfo.remainingPages);
      
      console.log('📊 Plan info updated:', planInfo);
    } catch (err) {
      console.error('❌ Error in fetchUsageInfo:', err);
      setUsageError(t('planInfo.errorLoadingPlanInfo'));
    }
  }, [user?.id, t]);

  React.useEffect(() => {
    fetchUsageInfo();
  }, [fetchUsageInfo, analysisResult]);

  const handleUploadDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        // Check file sizes before adding to documents
        const validDocuments: DocumentItem[] = [];
        
        for (const asset of result.assets) {
          const isFileSizeValid = await checkFileSize(asset.uri);
          if (!isFileSizeValid) {
            Alert.alert(
              t('alerts.fileTooLarge'),
              t('alerts.fileSizeLimitExceeded')
            );
            continue; // Skip this file but continue with others
          }
          
          const timestamp = Date.now();
          const originalName = asset.name || `Document`;
          const fixedName = fixFileName(originalName, false);
          
          validDocuments.push({
            id: `doc_${timestamp}_${validDocuments.length}`,
            name: fixedName,
            type: 'pdf' as const,
            uri: asset.uri,
            size: asset.size,
          });
        }

        if (validDocuments.length > 0) {
          // Add to local documents first
          setDocuments(prev => [...prev, ...validDocuments]);
          
          // Immediately upload each document to Supabase Storage
          console.log('📄 Documents selected, starting immediate uploads...');
          for (const doc of validDocuments) {
            try {
              console.log(`📤 Uploading document: ${doc.name}`);
              const uploadResult = await testUploadNoValidation(doc.uri, doc.name);
              
              if (uploadResult.success && uploadResult.publicUrl) {
                console.log(`✅ Document "${doc.name}" uploaded successfully to Supabase`);
                console.log('🔗 Public URL:', uploadResult.publicUrl);
                console.log('📤 Storage path:', uploadResult.storagePath);
                
                // Update the document with the public URL and storage path
                setDocuments(prev => prev.map(d => 
                  d.id === doc.id 
                    ? { 
                        ...d, 
                        publicUrl: uploadResult.publicUrl,
                        storagePath: uploadResult.storagePath
                      }
                    : d
                ));
              } else {
                console.error(`❌ Document "${doc.name}" upload failed:`, uploadResult.error);
                Alert.alert(
                  'Upload Warning',
                  `Document "${doc.name}" saved locally but failed to upload to cloud storage. You can still analyze it, but it may not be available later.`
                );
              }
            } catch (error: any) {
              console.error(`❌ Document "${doc.name}" upload error:`, error);
              Alert.alert(
                'Upload Error',
                `Document "${doc.name}" saved locally but failed to upload to cloud storage. You can still analyze it, but it may not be available later.`
              );
            }
          }
        }
      }
    } catch (error) {
      Alert.alert(t('alerts.error'), t('alerts.failedToPickDocuments'));
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
      allowsEditing: false, // Auto-confirm photos
      quality: 0.8, // Reduce file size
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      // Check file size before adding to documents
      const isFileSizeValid = await checkFileSize(asset.uri);
      if (!isFileSizeValid) {
        Alert.alert(
          t('alerts.fileTooLarge'),
          t('alerts.fileSizeLimitExceeded')
        );
        return;
      }
      
      const timestamp = Date.now();
      // Generate a reliable filename for camera photos
      // Don't rely on asset.fileName as it's often "image" or undefined on Android
      const cameraPhotoName = `photo_${timestamp}.jpg`;
      
      const newDocument: DocumentItem = {
        id: `img_${timestamp}`,
        name: cameraPhotoName,
        type: 'image',
        uri: asset.uri,
      };

      // Add to local documents first
      setDocuments(prev => [...prev, newDocument]);
      
      // Immediately upload to Supabase Storage
      console.log('📸 === PHOTO UPLOAD START ===');
      console.log('📸 Photo details:', {
        uri: asset.uri,
        filename: cameraPhotoName,
        size: asset.fileSize,
        type: asset.type
      });
      
      try {
        console.log('📤 Calling upload function...');
        const uploadResult = await testUploadNoValidation(asset.uri, cameraPhotoName);
        
        if (uploadResult.success && uploadResult.publicUrl) {
          console.log('✅ === PHOTO UPLOAD SUCCESS ===');
          console.log('🔗 Public URL:', uploadResult.publicUrl);
          console.log('📁 Document ID:', newDocument.id);
          console.log('📤 Storage path:', uploadResult.storagePath);
          
          // Update the document with the public URL and storage path
          setDocuments(prev => prev.map(doc => 
            doc.id === newDocument.id 
              ? { 
                  ...doc, 
                  publicUrl: uploadResult.publicUrl,
                  storagePath: uploadResult.storagePath
                }
              : doc
          ));
          
          console.log('✅ Document state updated with public URL and storage path');
        } else {
          console.error('❌ === PHOTO UPLOAD FAILED ===');
          console.error('❌ Upload error:', uploadResult.error);
          console.error('❌ Upload result:', uploadResult);
          
          Alert.alert(
            'Upload Warning',
            'Photo saved locally but failed to upload to cloud storage. You can still analyze it, but it may not be available later.'
          );
        }
      } catch (error: any) {
        console.error('❌ === PHOTO UPLOAD ERROR ===');
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        Alert.alert(
          'Upload Error',
          'Photo saved locally but failed to upload to cloud storage. You can still analyze it, but it may not be available later.'
        );
      }
    }
  };

  const handleSelectFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need gallery permissions to make this work!'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Auto-confirm photos
      quality: 0.8, // Reduce file size
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      // Check file size before adding to documents
      const isFileSizeValid = await checkFileSize(asset.uri);
      if (!isFileSizeValid) {
        Alert.alert(
          t('alerts.fileTooLarge'),
          t('alerts.fileSizeLimitExceeded')
        );
        return;
      }
      
      const timestamp = Date.now();
      // Ensure the filename has a proper extension for gallery images
      const originalName = asset.fileName || `Gallery Image`;
      const fixedName = fixFileName(originalName, true);
      
      const newDocument: DocumentItem = {
        id: `img_${timestamp}`,
        name: fixedName,
        type: 'image',
        uri: asset.uri,
      };

      // Add to local documents first
      setDocuments(prev => [...prev, newDocument]);
      
      // Immediately upload to Supabase Storage
      console.log('🖼️ === GALLERY UPLOAD START ===');
      console.log('🖼️ Gallery photo details:', {
        uri: asset.uri,
        filename: fixedName,
        originalName: asset.fileName,
        size: asset.fileSize,
        type: asset.type
      });
      
      try {
        console.log('📤 Calling upload function for gallery photo...');
        const uploadResult = await testUploadNoValidation(asset.uri, fixedName);
        
        if (uploadResult.success && uploadResult.publicUrl) {
          console.log('✅ === GALLERY UPLOAD SUCCESS ===');
          console.log('🔗 Public URL:', uploadResult.publicUrl);
          console.log('📁 Document ID:', newDocument.id);
          console.log('📤 Storage path:', uploadResult.storagePath);
          
          // Update the document with the public URL and storage path
          setDocuments(prev => prev.map(doc => 
            doc.id === newDocument.id 
              ? { 
                  ...doc, 
                  publicUrl: uploadResult.publicUrl,
                  storagePath: uploadResult.storagePath
                }
              : doc
          ));
          
          console.log('✅ Gallery document state updated with public URL and storage path');
        } else {
          console.error('❌ === GALLERY UPLOAD FAILED ===');
          console.error('❌ Upload error:', uploadResult.error);
          console.error('❌ Upload result:', uploadResult);
          
          Alert.alert(
            'Upload Warning',
            'Photo saved locally but failed to upload to cloud storage. You can still analyze it, but it may not be available later.'
          );
        }
      } catch (error: any) {
        console.error('❌ === GALLERY UPLOAD ERROR ===');
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        Alert.alert(
          'Upload Error',
          'Photo saved locally but failed to upload to cloud storage. You can still analyze it, but it may not be available later.'
        );
      }
    }
  };

  /**
   * Enhanced document removal function
   * Removes document from local state and also deletes the file from Supabase Storage
   * 
   * @param id - The local document ID to remove
   */
  const handleRemoveDocument = async (id: string) => {
    console.log('🗑️ === DOCUMENT REMOVAL START ===');
    console.log('📁 Document ID to remove:', id);
    
    // Find the document before removing it from state
    const documentToRemove = documents.find(doc => doc.id === id);
    
    if (!documentToRemove) {
      console.log('❌ Document not found in local state');
      return;
    }
    
    console.log('📁 Document details:', {
      name: documentToRemove.name,
      type: documentToRemove.type,
      storagePath: documentToRemove.storagePath,
      hasPublicUrl: !!documentToRemove.publicUrl
    });
    
    // Remove from local state first (immediate UI feedback)
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    console.log('✅ Document removed from local state');
    
    // If the document has a storage path, also remove it from Supabase Storage
    if (documentToRemove.storagePath) {
      console.log('🗑️ Attempting to remove file from Supabase Storage...');
      
      try {
        const deleteResult = await deleteFileFromSupabase(documentToRemove.storagePath);
        
        if (deleteResult.success) {
          console.log('✅ === DOCUMENT REMOVAL SUCCESS ===');
          console.log('🗑️ File successfully removed from Supabase Storage');
          console.log('📤 Storage path removed:', documentToRemove.storagePath);
        } else {
          console.error('❌ === STORAGE DELETE FAILED ===');
          console.error('❌ Delete error:', deleteResult.error);
          console.error('⚠️ Document removed from local state but failed to delete from storage');
          
          // Optionally show a warning to the user
          Alert.alert(
            'Storage Warning',
            'Document removed from your device but failed to delete from cloud storage. The file may still exist in the cloud.'
          );
        }
      } catch (error: any) {
        console.error('❌ === STORAGE DELETE ERROR ===');
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.error('⚠️ Document removed from local state but error occurred during storage deletion');
        
        // Optionally show a warning to the user
        Alert.alert(
          'Storage Error',
          'Document removed from your device but an error occurred while deleting from cloud storage.'
        );
      }
    } else {
      console.log('ℹ️ No storage path found, skipping Supabase Storage deletion');
      console.log('✅ === DOCUMENT REMOVAL SUCCESS (LOCAL ONLY) ===');
    }
  };

  // Helper function to check file size (5MB limit)
  const checkFileSize = async (uri: string): Promise<boolean> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists && fileInfo.size) {
        const fileSizeInMB = fileInfo.size / (1024 * 1024);
        return fileSizeInMB <= 5; // 5MB limit
      }
      return true; // If we can't get file info, allow it
    } catch (error) {
      console.error('Error checking file size:', error);
      return true; // If there's an error, allow it
    }
  };

  // Helper function to fix file names that don't have extensions
  const fixFileName = (originalName: string, isImage: boolean = false): string => {
    // Clean the original name (remove invalid characters)
    const cleanName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // If the name already has an extension, return as is
    if (cleanName.includes('.')) {
      return cleanName;
    }
    
    // Generate a timestamp for unique naming
    const timestamp = Date.now();
    
    // For images, use .jpg as default extension
    if (isImage) {
      return `photo_${timestamp}.jpg`;
    }
    
    // For documents, use .pdf as default extension
    return `document_${timestamp}.pdf`;
  };

  // Helper to upload a file to Supabase Storage and get a public URL
  // Uses the test upload function to bypass validation issues
  const uploadDocumentAndGetUrl = async (doc: DocumentItem): Promise<string | undefined> => {
    try {
      console.log('Starting upload for document:', doc.name);
      
      // Fix the file name if it doesn't have an extension
      const fixedFileName = fixFileName(doc.name, doc.type === 'image');
      console.log('Original filename:', doc.name);
      console.log('Fixed filename:', fixedFileName);
      
      const uploadResult = await testUploadNoValidation(doc.uri, fixedFileName);
      
      if (!uploadResult.success) {
        Alert.alert(t('alerts.uploadError'), uploadResult.error || t('alerts.failedToUploadDocument'));
        return undefined;
      }
      
      console.log('Upload completed successfully');
      return uploadResult.publicUrl;
      
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert(t('alerts.uploadError'), err.message || t('alerts.failedToUploadDocument'));
      return undefined;
    }
  };

  const handleStartAnalysis = async () => {
    setAnalysisError(null);
    if (documents.length === 0) {
      Alert.alert(t('alerts.noDocuments'), t('alerts.pleaseUploadDocumentsFirst'));
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult('');
    try {
      // For demo, analyze the first document
      let doc = documents[0];
      let publicUrl = doc.publicUrl;
      if (!publicUrl) {
        // Use the test upload function to bypass validation issues
        console.log('🧪 Using test upload function...');
        
        // Fix the file name if it doesn't have an extension
        const fixedFileName = fixFileName(doc.name, doc.type === 'image');
        console.log('Original filename:', doc.name);
        console.log('Fixed filename:', fixedFileName);
        
        const uploadResult = await testUploadNoValidation(doc.uri, fixedFileName);
        if (!uploadResult.success || !uploadResult.publicUrl) {
          setIsAnalyzing(false);
          Alert.alert(t('alerts.uploadError'), uploadResult.error || t('alerts.failedToUploadDocument'));
          return;
        }
        publicUrl = uploadResult.publicUrl;
        // Save publicUrl to state for future use
        setDocuments((prev) => prev.map(d => d.id === doc.id ? { ...d, publicUrl } : d));
      }
      // Call the Edge Function
      const analysisType = 'summary'; // Default analysis type
      const result = await analyzeDocument({
        document_url: publicUrl,
        analysis_type: analysisType,
      });
      if (result.success) {
        setAnalysisResult(result.result || 'No result returned.');
        // Log analysis event
        try {
          await logAnalysisEvent({
            document_id: documents && documents.length > 0 ? String(documents[0].name) : null,
            tokens_used: null // Set this if available
          });
        } catch (err) {
          console.error('❌ Error logging analysis event:', err);
        }
      } else {
        setAnalysisError(result.error || t('alerts.analysisFailed'));
        Alert.alert(t('alerts.analysisError'), result.error || t('alerts.analysisFailed'));
      }
    } catch (err: any) {
      setAnalysisError(err.message || t('alerts.analysisFailed'));
      Alert.alert(t('alerts.analysisError'), err.message || t('alerts.analysisFailed'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendChatMessage = () => {
    if (chatInput.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text: chatInput.trim(),
        isUser: true,
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, newMessage]);
      setChatInput('');

      // Simulate AI response
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: 'Thank you for your question. I\'m here to help you with your document analysis.',
          isUser: false,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, aiResponse]);
      }, 1000);
    }
  };

  // Footer handlers
  const handlePrivacyPolicy = () => {
    Alert.alert(t('alerts.privacyPolicy'), t('alerts.privacyPolicyMessage'));
  };

  const handleTermsOfService = () => {
    Alert.alert(t('alerts.termsOfService'), t('alerts.termsOfServiceMessage'));
  };

  const handleCancelSubscription = () => {
    Alert.alert(t('alerts.cancelSubscription'), t('alerts.cancelSubscriptionMessage'));
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>{t('title')}</Text>
          <Text style={styles.subtitle}>{t('subtitle')}</Text>

          {/* Plan and Usage Information */}
          <View style={styles.usageCounterContainer}>
            {usageError ? (
              <Text style={styles.usageError}>{usageError}</Text>
            ) : planInfo ? (
              <>
                <Text style={styles.planNameText}>
                  {planInfo.planName}
                </Text>
                <Text style={styles.usageCounterText}>
                  {getHomeScreenDisplayText(planInfo)}
                </Text>
              </>
            ) : (
              <Text style={styles.usageCounterText}>{t('planInfo.loadingPlanInfo')}</Text>
            )}
          </View>

        </View>

        {/* Paste Text Section */}
        <View style={styles.pasteSection}>
          <Text style={styles.sectionTitle}>{t('paste.title')}</Text>
          <TextInput
            style={styles.pasteInput}
            placeholder={t('paste.placeholder')}
            value={pastedText}
            onChangeText={setPastedText}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />
          <Text style={styles.pasteCounters}>{t('paste.counters', { chars: pasteCounters.chars, words: pasteCounters.words, pages: pasteCounters.pages })}</Text>
          {!!pasteError && <Text style={styles.pasteError}>{pasteError}</Text>}
          <View style={styles.pasteButtonsRow}>
            <TouchableOpacity style={[styles.uploadButton, { backgroundColor: '#6b7280' }]} onPress={handlePasteFromClipboard} activeOpacity={0.8}>
              <Text style={styles.uploadButtonText}>{t('paste.fromClipboard')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.uploadButton, (isAnalyzingText || pasteCounters.pages === 0 || !pastedText.trim()) && styles.analyzeButtonDisabled]}
              onPress={handleAnalyzePastedText}
              activeOpacity={0.8}
              disabled={isAnalyzingText || pasteCounters.pages === 0 || !pastedText.trim()}
            >
              <Text style={styles.uploadButtonText}>{isAnalyzingText ? `🔄 ${t('analyzing')}` : t('paste.analyze')}</Text>
            </TouchableOpacity>
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
            <Text style={styles.uploadButtonText}>{t('uploadDocument')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleTakePhotos}
            activeOpacity={0.8}
          >
            <Text style={styles.uploadButtonIcon}>📷</Text>
            <Text style={styles.uploadButtonText}>{t('takePhoto')}</Text>
          </TouchableOpacity>
        </View>



        {/* Document Pool Section */}
        {documents.length > 0 && (
          <View style={styles.documentPoolSection}>
            <Text style={styles.sectionTitle}>{t('documentPool')}</Text>
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
              {isAnalyzing ? `🔄 ${t('analyzing')}` : t('startAnalyzing')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Persistent Analysis Result Section */}
        <View style={styles.resultSection}>
          <Text style={styles.sectionTitle}>{t('analysisResults.title')}</Text>
          <View style={styles.resultContainer}>
            {isAnalyzing ? (
              <ActivityIndicator size="large" color="#3498db" style={{ marginVertical: 20 }} />
            ) : analysisResult ? (
              <>
                <Text style={styles.resultText}>{analysisResult}</Text>

              </>
            ) : analysisError ? (
              <Text style={[styles.resultText, { color: 'red' }]}>{analysisError}</Text>
            ) : (
              <Text style={styles.placeholderText}>
                {t('resultPlaceholder')}
              </Text>
            )}
          </View>
        </View>

        {/* Chat Section */}
        <View style={styles.chatSection}>
          <Text style={styles.chatHelperText}>
            {t('chatHelperText')}
          </Text>

          {/* Chat Messages */}
          {chatMessages.length > 0 && (
            <View style={styles.chatMessagesContainer}>
              {chatMessages.map((message) => (
                <View key={message.id} style={[
                  styles.chatMessage,
                  message.isUser ? styles.userMessage : styles.aiMessage
                ]}>
                  <Text style={[
                    styles.chatMessageText,
                    message.isUser ? styles.userMessageText : styles.aiMessageText
                  ]}>
                    {message.text}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Chat Input */}
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder={t('chat_input_placeholder')}
              placeholderTextColor="#999"
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendChatMessage}
              disabled={!chatInput.trim()}
            >
              <Text style={styles.sendButtonText}>{t('send_button_text')}</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <Footer
        onPrivacyPolicy={handlePrivacyPolicy}
        onTermsOfService={handleTermsOfService}
        onCancelSubscription={handleCancelSubscription}
      />
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
    marginTop: 4,
    marginBottom: 8,
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
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontSize: 20,
    marginBottom: 6,
  },
  uploadButtonText: {
    fontSize: 13,
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
  placeholderText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    paddingVertical: 20,
  },
  chatSection: {
    marginTop: 20,
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
  chatHelperText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
    textAlign: 'center',
  },
  chatMessagesContainer: {
    maxHeight: 200,
    marginBottom: 10,
  },
  chatMessage: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#3498db',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: '#ecf0f1',
    alignSelf: 'flex-start',
  },
  chatMessageText: {
    fontSize: 14,
    color: '#fff',
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#2c3e50',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f1f2f6',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    paddingVertical: 0,
    paddingHorizontal: 5,
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  usageCounterContainer: {
    marginTop: 20,
    marginBottom: 8,
    alignItems: 'center',
  },
  usageCounterText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  usageCounterSubtle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  usageError: {
    fontSize: 13,
    color: '#b71c1c',
    fontWeight: '500',
  },
  planNameText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  remainingAnalysesText: {
    fontSize: 12,
    color: '#27ae60',
    marginTop: 2,
    fontWeight: '500',
  },
  // Paste text section styles
  pasteSection: {
    marginBottom: 30,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  pasteInput: {
    backgroundColor: '#f1f2f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    minHeight: 140,
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
  },
  pasteCounters: { fontSize: 12, color: '#7f8c8d', marginTop: 8 },
  pasteError: {
    fontSize: 12,
    color: '#b71c1c',
    marginBottom: 8,
  },
  pasteButtonsRow: {
    flexDirection: 'row',
    gap: 15,
  },

});

export default HomeScreen; 