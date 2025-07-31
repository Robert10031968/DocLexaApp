import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import { Footer } from '../components';
import { supabase } from '../lib/supabase';

interface AnalysisItem {
  id: string;
  document_type: string;
  created_at: string;
  result_text?: string;
  pdf_url?: string; // Use PDF URL instead of base64
}

const { width, height } = Dimensions.get('window');

const AnalysisResultsScreen = () => {
  const { t } = useTranslation();
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisItem | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('document_analyses')
        .select('id, document_type, created_at, result_text, pdf_url')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAnalyses(data || []);
    } catch (err: any) {
      setError(err.message || t('error'));
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyses();
    setRefreshing(false);
  };

  const getSignedUrl = async (url: string): Promise<string> => {
    try {
      // Extract the file path from the URL
      const urlParts = url.split('/');
      const bucketName = urlParts[3]; // e.g., 'pdfs'
      const filePath = urlParts.slice(4).join('/'); // e.g., 'analysis_123.pdf'
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }
  };

  const handlePreviewPDF = async (analysis: AnalysisItem) => {
    if (!analysis.pdf_url) {
      Alert.alert(t('analysisResults.noPdfAvailable'), t('analysisResults.noPdfAvailableMessage'));
      return;
    }
    
    setPdfLoading(true);
    setSelectedAnalysis(analysis);
    setPdfModalVisible(true);
    
    try {
      const signedUrl = await getSignedUrl(analysis.pdf_url);
      setPdfUrl(signedUrl);
    } catch (error) {
      Alert.alert(t('alerts.error'), t('analysisResults.failedToLoadPdf'));
      setPdfModalVisible(false);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPDF = async (analysis: AnalysisItem) => {
    if (!analysis.pdf_url) {
      Alert.alert(t('analysisResults.noPdfAvailable'), t('analysisResults.noPdfAvailableMessage'));
      return;
    }
    
    Alert.alert(
      t('download_pdf'),
      `${t('download_analysis_for')} "${analysis.document_type}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('download'),
          onPress: async () => {
            try {
              const signedUrl = await getSignedUrl(analysis.pdf_url!);
              
              // Download the file
              const downloadResumable = FileSystem.createDownloadResumable(
                signedUrl,
                FileSystem.documentDirectory + `${analysis.document_type}_${analysis.id}.pdf`,
                {},
                (downloadProgress) => {
                  const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                  console.log(`Downloaded: ${progress * 100}%`);
                }
              );

              const result = await downloadResumable.downloadAsync();
              if (result && result.uri) {
                Alert.alert('Success', `PDF downloaded to: ${result.uri}`);
              } else {
                Alert.alert(t('alerts.error'), t('analysisResults.downloadCompletedUnknownLocation'));
              }
            } catch (error) {
              console.error('Download error:', error);
              Alert.alert(t('alerts.error'), t('analysisResults.failedToDownloadPdf'));
            }
          },
        },
      ]
    );
  };

  const handleDeleteAnalysis = (analysis: AnalysisItem) => {
    Alert.alert(
      t('delete_analysis'),
      `${t('sure_delete_analysis')} "${analysis.document_type}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            setAnalyses((prev) => prev.filter((item) => item.id !== analysis.id));
            Alert.alert(t('deleted'), t('analysis_removed'));
            // TODO: Optionally delete from Supabase as well
          },
        },
      ]
    );
  };

  const truncateText = (text: string, maxLines: number = 3) => {
    const lines = text.split('\n');
    if (lines.length <= maxLines) return text;
    return lines.slice(0, maxLines).join('\n') + '...';
  };

  const renderAnalysisItem = ({ item }: { item: AnalysisItem }) => (
    <View style={styles.analysisItem}>
      {/* Left side - Content */}
      <View style={styles.analysisContent}>
        <Text style={styles.analysisTitle}>{item.document_type || t('unknown_document_type')}</Text>
        <Text style={styles.analysisDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        {item.result_text ? (
          <Text style={styles.analysisSummary} numberOfLines={3}>
            {truncateText(item.result_text, 3)}
          </Text>
        ) : (
          <Text style={[styles.analysisSummary, { color: '#bbb', fontStyle: 'italic' }]}>
            {t('no_analysis_result')}
          </Text>
        )}
      </View>
      {/* Right side - Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePreviewPDF(item)}
          accessibilityLabel="Preview PDF"
        >
          <Text style={styles.actionButtonIcon}>👁️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDownloadPDF(item)}
          accessibilityLabel={t('download_pdf')}
        >
          <Text style={styles.actionButtonIcon}>📄</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteAnalysis(item)}
          accessibilityLabel={t('delete_analysis')}
        >
          <Text style={styles.actionButtonIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📋</Text>
      <Text style={styles.emptyStateTitle}>{t('no_past_analyses')}</Text>
      <Text style={styles.emptyStateMessage}>
        {t('start_by_uploading')}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Text style={styles.title}>{t('analysis_results_title')}</Text>
      <Text style={styles.subtitle}>
        {t('view_manage_analyses')}
      </Text>
    </View>
  );

  // Footer handlers
  const handlePrivacyPolicy = () => {
    Alert.alert(t('privacyPolicy'), 'This would navigate to the Privacy Policy screen or open a URL.');
  };
  const handleTermsOfService = () => {
    Alert.alert(t('termsOfService'), 'This would navigate to the Terms of Service screen or open a URL.');
  };
  const handleCancelSubscription = () => {
    Alert.alert(t('cancelSubscription'), 'This would navigate to the subscription management screen.');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>{t('loading_analyses')}</Text>
        </View>
        <Footer
          onPrivacyPolicy={handlePrivacyPolicy}
          onTermsOfService={handleTermsOfService}
          onCancelSubscription={handleCancelSubscription}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: 'red' }]}>Error: {error}</Text>
          <TouchableOpacity onPress={fetchAnalyses} style={{ marginTop: 16 }}>
            <Text style={{ color: '#3498db', fontWeight: 'bold' }}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
        <Footer
          onPrivacyPolicy={handlePrivacyPolicy}
          onTermsOfService={handleTermsOfService}
          onCancelSubscription={handleCancelSubscription}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={analyses}
        renderItem={renderAnalysisItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />

      {/* PDF Preview Modal */}
      <Modal
        visible={pdfModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setPdfModalVisible(false);
          setPdfUrl(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedAnalysis?.document_type || 'PDF Preview'}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={() => {
                    if (selectedAnalysis) {
                      handleDownloadPDF(selectedAnalysis);
                    }
                  }}
                >
                  <Text style={styles.modalActionIcon}>📄</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setPdfModalVisible(false);
                    setPdfUrl(null);
                  }}
                >
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* PDF WebView */}
            {pdfLoading ? (
              <View style={styles.pdfLoadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
              </View>
            ) : pdfUrl ? (
              <WebView
                style={styles.pdfWebView}
                source={{ uri: pdfUrl }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.pdfLoadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
                  </View>
                )}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('WebView error: ', nativeEvent);
                  Alert.alert('Error', 'Failed to load PDF. Please try again.');
                }}
              />
            ) : (
              <View style={styles.pdfLoadingContainer}>
                <Text style={styles.pdfLoadingText}>No PDF available</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    lineHeight: 22,
  },
  analysisItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analysisContent: {
    flex: 1,
    marginRight: 12,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  analysisDate: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  analysisSummary: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#fed7d7',
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: width * 0.9,
    height: height * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionIcon: {
    fontSize: 16,
  },
  modalCloseIcon: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  pdfLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  pdfLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
});

export default AnalysisResultsScreen; 