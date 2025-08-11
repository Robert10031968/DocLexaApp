import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'

type OverflowBannerProps = {
  pagesAvailable: number
  pageCount: number
}

export default function OverflowBanner({ pagesAvailable, pageCount }: OverflowBannerProps) {
  const pagesFree = useMemo(() => Math.max(0, pageCount - pagesAvailable), [pageCount, pagesAvailable])

  return (
    <View style={styles.bannerCard}>
      <Text style={styles.bannerText}>
        Masz <Text style={styles.bold}>{pagesAvailable}</Text> stron w limicie, dokument ma{' '}
        <Text style={styles.bold}>{pageCount}</Text> stron — przeanalizujemy CAŁOŚĆ.{' '}
        <Text style={styles.bold}>{pagesFree}</Text> stron GRATIS 🎁
      </Text>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => Alert.alert('FAQ', 'Przejdź do ekranu FAQ (placeholder)')}
      >
        <Text style={styles.linkText}>Dowiedz się więcej</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  bannerCard: {
    backgroundColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  bannerText: { color: '#0c4a6e' },
  bold: { fontWeight: '700' },
  linkButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 6 },
  linkText: { color: '#2563eb', fontWeight: '600' },
})


