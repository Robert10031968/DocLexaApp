import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import type { SupabaseClient } from '@supabase/supabase-js'
import { canAnalyzePages, getUserPlanStatus } from '../services/plan'

type UploadPdfScreenProps = {
  supabase: SupabaseClient
  userId: string
  onPickPdf?: () => Promise<{ documentId: string; pageCount: number; fileRef?: string | null }>
  onNavigateToResult?: (payload: {
    document_id: string | null
    pages_total: number
    pages_free: number
    pages_charged: number
  }) => void
}

export default function UploadPdfScreen({ supabase, userId, onPickPdf, onNavigateToResult }: UploadPdfScreenProps) {
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState<number>(0)
  const [fileRef, setFileRef] = useState<string | null>(null)

  const [isChecking, setIsChecking] = useState(false)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [pagesAvailable, setPagesAvailable] = useState<number>(0)
  const [pagesFree, setPagesFree] = useState<number>(0)
  const [pagesToCharge, setPagesToCharge] = useState<number>(0)
  const [isUnlimited, setIsUnlimited] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const shouldShowBanner = useMemo(() => {
    if (!pageCount) return false
    if (isUnlimited) return false
    return pagesAvailable < pageCount
  }, [isUnlimited, pageCount, pagesAvailable])

  const handlePickPdf = useCallback(async () => {
    setErrorMessage(null)
    try {
      if (!onPickPdf) {
        Alert.alert('Wybór PDF', 'Brak obsługi wyboru pliku w tej wersji. Podłącz onPickPdf.')
        return
      }
      const result = await onPickPdf()
      setDocumentId(result.documentId)
      setPageCount(result.pageCount)
      setFileRef(result.fileRef ?? result.documentId)

      setIsChecking(true)
      // Load plan status and allowance in parallel
      const [plan, allowance] = await Promise.all([
        getUserPlanStatus(supabase),
        canAnalyzePages(supabase, userId, result.pageCount),
      ])

      setIsUnlimited(!!plan.is_unlimited)
      setPagesAvailable(Number(allowance.pages_available ?? 0))
      setPagesFree(Number(allowance.pages_free ?? 0))
      setPagesToCharge(Number(allowance.pages_to_charge ?? 0))
      setAllowed(Boolean(allowance.allowed))
    } catch (err: any) {
      const message = err?.message ?? 'Nie udało się przygotować analizy.'
      setErrorMessage(message)
      setAllowed(false)
    } finally {
      setIsChecking(false)
    }
  }, [onPickPdf, supabase, userId])

  const handleAnalyze = useCallback(async () => {
    if (!documentId || !pageCount) {
      Alert.alert('Błąd', 'Brakuje dokumentu lub liczby stron.')
      return
    }
    setErrorMessage(null)
    try {
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: {
          user_id: userId,
          document_id: documentId,
          page_count: pageCount,
          file_ref: fileRef ?? documentId,
        },
      })

      if (error) {
        throw new Error(error.message || 'Nie udało się zainicjować analizy dokumentu')
      }

      if (!data?.success) {
        const message = data?.message || data?.error || 'Analiza nie powiodła się'
        throw new Error(message)
      }

      const payload = {
        document_id: data.document_id ?? documentId,
        pages_total: Number(data.pages_total ?? pageCount),
        pages_free: Number(data.pages_free ?? pagesFree),
        pages_charged: Number(data.pages_charged ?? Math.max(0, pageCount - pagesFree)),
      }

      if (onNavigateToResult) {
        onNavigateToResult(payload)
      } else {
        Alert.alert('Sukces', `Przeanalizowano dokument. Strony: ${payload.pages_total}`)
      }
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Wystąpił błąd podczas analizy dokumentu')
    }
  }, [documentId, fileRef, onNavigateToResult, pageCount, pagesFree, supabase, userId])

  const analyzeDisabled = useMemo(() => {
    if (isChecking) return true
    if (!documentId || !pageCount) return true
    if (allowed === false) return true
    return false
  }, [allowed, documentId, isChecking, pageCount])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prześlij plik PDF</Text>

      <TouchableOpacity style={styles.button} onPress={handlePickPdf}>
        <Text style={styles.buttonText}>Wybierz PDF</Text>
      </TouchableOpacity>

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
        <View style={styles.bannerCard}>
          <Text style={styles.bannerText}>
            Masz <Text style={styles.bold}>{pagesAvailable}</Text> stron w limicie, dokument ma{' '}
            <Text style={styles.bold}>{pageCount}</Text> stron — przeanalizujemy CAŁOŚĆ.{' '}
            <Text style={styles.bold}>{Math.max(0, pageCount - pagesAvailable)}</Text> stron GRATIS 🎁
          </Text>
        </View>
      )}

      <TouchableOpacity style={[styles.button, analyzeDisabled && styles.buttonDisabled]} onPress={handleAnalyze} disabled={analyzeDisabled}>
        <Text style={styles.buttonText}>Analizuj</Text>
      </TouchableOpacity>

      {!!pageCount && (
        <Text style={styles.muted}>
          Strony: {pageCount} {allowed === false ? '(niedozwolone)' : ''}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: { backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
  muted: { color: '#6b7280' },
  bannerCard: { backgroundColor: '#f0f9ff', borderColor: '#7dd3fc', borderWidth: 1, padding: 12, borderRadius: 8 },
  bannerText: { color: '#0c4a6e' },
  bold: { fontWeight: '700' },
  errorCard: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 8 },
  errorText: { color: '#991b1b' },
})


