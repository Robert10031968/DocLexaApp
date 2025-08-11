import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'
import { canAnalyzePages, getUserPlanStatus } from '../services/plan'
import { getWordsPerPage } from '../services/remoteConfig'
import OverflowBanner from '../components/OverflowBanner'

type PasteTextScreenProps = {
  supabase: SupabaseClient
  userId: string
  onNavigateToResult?: (payload: {
    document_id: string | null
    pages_total: number
    pages_free: number
    pages_charged: number
  }) => void
}

export default function PasteTextScreen({ supabase, userId, onNavigateToResult }: PasteTextScreenProps) {
  const [text, setText] = useState('')
  const [wordsPerPage, setWordsPerPage] = useState<number>(300)
  const [isUnlimited, setIsUnlimited] = useState(false)
  const [pagesAvailable, setPagesAvailable] = useState(0)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [pagesFree, setPagesFree] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const debounceTimer = useRef<number | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [cfgWpp, plan] = await Promise.all([
          getWordsPerPage(supabase),
          getUserPlanStatus(supabase),
        ])
        if (!mounted) return
        setWordsPerPage(cfgWpp)
        setIsUnlimited(!!plan.is_unlimited)
        setPagesAvailable(Number(plan.pages_available ?? 0))
      } catch (e: any) {
        if (!mounted) return
        setErrorMessage(e?.message ?? 'Nie udało się pobrać konfiguracji lub planu')
      }
    })()
    return () => {
      mounted = false
    }
  }, [supabase])

  const words = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) return 0
    // Basic word count: split on whitespace
    return trimmed.split(/\s+/).filter(Boolean).length
  }, [text])

  const estimatedPages = useMemo(() => {
    if (words <= 0) return 0
    return Math.ceil(Math.max(1, words / Math.max(1, wordsPerPage)))
  }, [words, wordsPerPage])

  const shouldShowBanner = useMemo(() => {
    if (!estimatedPages) return false
    if (isUnlimited) return false
    return pagesAvailable < estimatedPages
  }, [estimatedPages, isUnlimited, pagesAvailable])

  const runPreCheck = useCallback(async (pages: number) => {
    if (!pages) return
    setIsChecking(true)
    setErrorMessage(null)
    try {
      const { allowed: ok, pages_available, pages_free } = await canAnalyzePages(supabase, userId, pages)
      setAllowed(Boolean(ok))
      setPagesAvailable(Number(pages_available ?? 0))
      setPagesFree(Number(pages_free ?? 0))
    } catch (e: any) {
      setErrorMessage(e?.message ?? 'Nie udało się sprawdzić dostępnych stron')
      setAllowed(false)
    } finally {
      setIsChecking(false)
    }
  }, [supabase, userId])

  // Debounced pre-check when text or words/pages change
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    if (!estimatedPages) {
      setAllowed(null)
      setPagesFree(0)
      return
    }
    debounceTimer.current = setTimeout(() => {
      runPreCheck(estimatedPages)
    }, 300) as unknown as number
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [estimatedPages, runPreCheck])

  const handleAnalyze = useCallback(async () => {
    if (!estimatedPages) {
      Alert.alert('Błąd', 'Wklej tekst do analizy')
      return
    }
    setErrorMessage(null)
    try {
      // Ensure allowance check just before analyzing
      await runPreCheck(estimatedPages)

      const { data, error } = await supabase.functions.invoke('analyze-text', {
        body: {
          user_id: userId,
          document_id: null,
          words,
        },
      })

      if (error) throw new Error(error.message || 'Nie udało się zainicjować analizy tekstu')
      if (!data?.success) {
        const msg = data?.message || data?.error || 'Analiza nie powiodła się'
        throw new Error(msg)
      }

      const payload = {
        document_id: data.document_id ?? null,
        pages_total: Number(data.pages_total ?? estimatedPages),
        pages_free: Number(data.pages_free ?? pagesFree),
        pages_charged: Number(data.pages_charged ?? Math.max(0, estimatedPages - pagesFree)),
      }

      if (onNavigateToResult) {
        onNavigateToResult(payload)
      } else {
        Alert.alert('Sukces', `Przeanalizowano tekst. Strony: ${payload.pages_total}`)
      }
    } catch (e: any) {
      setErrorMessage(e?.message ?? 'Wystąpił błąd podczas analizy tekstu')
    }
  }, [estimatedPages, onNavigateToResult, pagesFree, runPreCheck, supabase, userId, words])

  const analyzeDisabled = useMemo(() => {
    if (isChecking) return true
    if (!estimatedPages) return true
    if (allowed === false) return true
    return false
  }, [allowed, estimatedPages, isChecking])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wklej tekst do analizy</Text>

      <TextInput
        style={styles.input}
        placeholder="Wklej tutaj…"
        multiline
        value={text}
        onChangeText={setText}
      />

      <Text style={styles.muted}>Słowa: {words} • Szacowane strony: {estimatedPages}</Text>

      {isChecking && (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.muted}>Sprawdzanie dostępnych stron…</Text>
        </View>
      )}

      {!!errorMessage && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
        </View>
      )}

      {shouldShowBanner && (
        <OverflowBanner pagesAvailable={pagesAvailable} pageCount={estimatedPages} />
      )}

      <TouchableOpacity style={[styles.button, analyzeDisabled && styles.buttonDisabled]} onPress={handleAnalyze} disabled={analyzeDisabled}>
        <Text style={styles.buttonText}>Analizuj</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: { backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
  muted: { color: '#6b7280' },
  errorCard: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 8 },
  errorText: { color: '#991b1b' },
})


