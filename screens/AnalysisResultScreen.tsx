import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AnalysisResultScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analysis Results</Text>
      <Text style={styles.subtitle}>View your document analysis results</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default AnalysisResultScreen; 