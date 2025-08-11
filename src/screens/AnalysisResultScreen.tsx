import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, ToastAndroid } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserPlanStatus, type UserPlanStatus } from '../services/plan'

type RouteParams = {
  analysisId?: string
  pages_total: number
  pages_charged: number
  pages_free: number
  mock?: boolean
}

type AnalysisResultScreenProps = {
  supabase: SupabaseClient
  route: { params: RouteParams }
  onNavigateToPlans?: () => void
}

export default function AnalysisResultScreen({ supabase, route, onNavigateToPlans }: AnalysisResultScreenProps) {
  const { pages_total, pages_charged, pages_free, mock } = route.params

  const [status, setStatus] = useState<UserPlanStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Small toast on first render
    if (Platform.OS === 'android') {
      ToastAndroid.show('Analiza zakończona', ToastAndroid.SHORT)
    } else {
      Alert.alert('Analiza zakończona')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    getUserPlanStatus(supabase)
      .then((s) => {
        if (!mounted) return
        setStatus(s)
      })
      .catch((e) => {
        if (!mounted) return
        setError(e?.message ?? 'Nie udało się pobrać statusu planu')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [supabase])

  const limitExhausted = useMemo(() => {
    if (!status) return false
    if (status.is_unlimited) return false
    return (status.pages_available ?? 0) <= 0
  }, [status])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wynik analizy</Text>

      <View style={styles.card}>
        {mock ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Mock analysis — backend not connected yet</Text>
          </View>
        ) : null}
        <Text style={styles.summaryText}>
          Przeanalizowaliśmy <Text style={styles.bold}>{pages_total}</Text> stron. Z tego{' '}
          <Text style={styles.bold}>{pages_charged}</Text> policzono,{' '}
          <Text style={styles.bold}>{pages_free}</Text> GRATIS 🎁.
        </Text>

        {loading ? (
          <View style={styles.row}> 
            <ActivityIndicator />
            <Text style={styles.muted}>Ładowanie statusu planu…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : status ? (
          <Text style={styles.planText}>
            Pozostały limit: {status.is_unlimited ? 'Nielimitowany' : `${status.pages_available} stron`}
          </Text>
        ) : null}
      </View>

      {limitExhausted && (
        <TouchableOpacity
          style={[styles.button, styles.upgradeButton]}
          onPress={() => {
            if (onNavigateToPlans) onNavigateToPlans()
            else Alert.alert('Upgrade', 'Przejdź do ekranu planów w implementacji nawigacji.')
          }}
        >
          <Text style={styles.buttonText}>Zwiększ limit / Upgrade</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  card: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb', borderWidth: 1, padding: 12, borderRadius: 8, gap: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { color: '#4338ca', fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { color: '#111827' },
  planText: { color: '#374151' },
  muted: { color: '#6b7280' },
  bold: { fontWeight: '700' },
  errorCard: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 8, borderRadius: 6 },
  errorText: { color: '#991b1b' },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  upgradeButton: { backgroundColor: '#10b981' },
  buttonText: { color: '#fff', fontWeight: '600' },
})


