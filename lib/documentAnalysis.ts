import { supabase } from './supabase';

export interface AnalysisRequest {
  document_url: string;
  analysis_type: 'summary' | 'sentiment' | 'keyword_extraction';
}

export interface AnalysisResponse {
  success: boolean;
  result?: string;
  error?: string;
}

export const analyzeDocument = async (
  request: AnalysisRequest
): Promise<AnalysisResponse> => {
  try {
    // TODO: Re-enable authentication check when user accounts are implemented
    // For development, allow anonymous users to test the analysis functionality
    
    console.log('Starting document analysis for:', request.analysis_type);
    
    // Get the current user session for authentication
    const { data: sessionData, error: authError } = await supabase.auth.getSession();
    const session = sessionData?.session;
    
    if (authError) {
      console.warn('Authentication error (continuing as anonymous):', authError.message);
    }
    
    // For development: Allow anonymous users
    // TODO: Uncomment the following lines when user authentication is required:
    // if (!session) {
    //   throw new Error('User not authenticated');
    // }
    
    // Construct the Edge Function URL
    const supabaseUrl = 'https://utvolelclhzesimpwbrl.supabase.co';
    const functionUrl = `${supabaseUrl}/functions/v1/analyze_document`;
    
    console.log('Calling Edge Function:', functionUrl);
    
    // Prepare headers - use session token if available, otherwise proceed without auth
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
      console.log('Using authenticated session');
    } else {
      console.log('No session found - proceeding as anonymous user');
    }
    
    // Make the POST request to the Edge Function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        document_url: request.document_url,
        analysis_type: request.analysis_type,
      }),
    });
    
    console.log('Edge Function response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }
    
    const data = await response.json();
    console.log('Analysis completed successfully');
    
    return {
      success: true,
      result: data.result || data.analysis_result,
    };
  } catch (error: any) {
    console.error('Document analysis error:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze document',
    };
  }
};

// Helper function to save analysis result to Supabase
export const saveAnalysisResult = async (
  documentType: string,
  resultText: string,
  documentUrl?: string
) => {
  try {
    const { data, error } = await supabase
      .from('document_analyses')
      .insert([
        {
          document_type: documentType,
          result_text: resultText,
          document_url: documentUrl,
        },
      ])
      .select();
    if (error) {
      throw error;
    }
    return { success: true, data };
  } catch (error: any) {
    console.error('Save analysis error:', error);
    return {
      success: false,
      error: error.message || 'Failed to save analysis result',
    };
  }
}; 