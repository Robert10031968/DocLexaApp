// KROK 11: Supabase Edge Function - Auto cleanup cron job
// Plik: supabase/functions/cleanup-expired-documents/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify cron secret (bezpieczeństwo)
    const authHeader = req.headers.get('authorization')
    const expectedAuth = `Bearer ${Deno.env.get('CRON_SECRET')}`
    
    if (authHeader !== expectedAuth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid cron secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🧹 Starting cleanup job...')

    // 1. Get expired documents
    const { data: expiredDocs, error: queryError } = await supabase
      .rpc('get_expired_documents')

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`)
    }

    console.log(`📋 Found ${expiredDocs?.length || 0} expired documents`)

    const cleanupResults = []
    let successCount = 0
    let errorCount = 0

    // 2. Process each expired document
    for (const doc of expiredDocs || []) {
      try {
        console.log(`🗑️ Cleaning up document: ${doc.document_id}`)

        // Delete PDF from storage if exists
        if (doc.pdf_url) {
          const { error: storageError } = await supabase.storage
            .from('pdfs')
            .remove([doc.pdf_url])
          
          if (storageError) {
            console.warn(`⚠️ Storage delete warning for ${doc.pdf_url}:`, storageError.message)
          } else {
            console.log(`✅ Deleted PDF: ${doc.pdf_url}`)
          }
        }

        // Delete document and analysis from database
        const { data: cleanupResult, error: cleanupError } = await supabase
          .rpc('cleanup_document', { p_document_id: doc.document_id })

        if (cleanupError) {
          throw new Error(`Cleanup error: ${cleanupError.message}`)
        }

        cleanupResults.push({
          document_id: doc.document_id,
          pdf_url: doc.pdf_url,
          expired_days: doc.expired_days,
          status: 'success',
          cleaned_at: new Date().toISOString()
        })

        successCount++
        console.log(`✅ Successfully cleaned up: ${doc.document_id}`)

      } catch (error) {
        console.error(`❌ Failed to cleanup ${doc.document_id}:`, error.message)
        
        cleanupResults.push({
          document_id: doc.document_id,
          status: 'error',
          error: error.message,
          attempted_at: new Date().toISOString()
        })
        
        errorCount++
      }
    }

    const response = {
      success: true,
      summary: {
        total_found: expiredDocs?.length || 0,
        success_count: successCount,
        error_count: errorCount
      },
      cleanup_results: cleanupResults,
      executed_at: new Date().toISOString()
    }

    console.log('🎉 Cleanup job completed:', response.summary)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Cleanup job failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        executed_at: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})