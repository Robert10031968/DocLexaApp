/**
 * Network utilities for debugging and monitoring upload issues
 */

export interface NetworkStatus {
  internetConnected: boolean;
  supabaseConnected: boolean;
  latency?: number;
  error?: string;
}

export interface UploadDiagnostics {
  networkStatus: NetworkStatus;
  fileInfo: {
    size: number;
    type: string;
    uri: string;
  };
  uploadAttempts: number;
  totalTime: number;
  errors: string[];
}

/**
 * Comprehensive network diagnostics
 */
export const runNetworkDiagnostics = async (): Promise<NetworkStatus> => {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    console.log('🔍 Running comprehensive network diagnostics...');
    
    // Test 1: Basic internet connectivity
    let internetConnected = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      internetConnected = response.ok;
      console.log('✅ Internet connectivity:', internetConnected);
    } catch (error: any) {
      errors.push(`Internet test failed: ${error.message}`);
      console.log('❌ Internet connectivity test failed:', error.message);
    }
    
    // Test 2: DNS resolution
    let dnsWorking = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const dnsResponse = await fetch('https://dns.google/resolve?name=google.com', {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      dnsWorking = dnsResponse.ok;
      console.log('✅ DNS resolution:', dnsWorking);
    } catch (error: any) {
      errors.push(`DNS test failed: ${error.message}`);
      console.log('❌ DNS resolution test failed:', error.message);
    }
    
    // Test 3: Supabase connectivity
    let supabaseConnected = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const supabaseResponse = await fetch('https://utvolelclhzesimpwbrl.supabase.co/rest/v1/', {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dm9sZWxjbGh6ZXNpbXB3YnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTU4MTcsImV4cCI6MjA2NzY5MTgxN30.M2d3R611-y_t26xsN3R6-Y0uf5bRVRDni16-m2mF1tY',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      supabaseConnected = supabaseResponse.ok || supabaseResponse.status === 401;
      console.log('✅ Supabase connectivity:', supabaseConnected);
    } catch (error: any) {
      errors.push(`Supabase test failed: ${error.message}`);
      console.log('❌ Supabase connectivity test failed:', error.message);
    }
    
    const latency = Date.now() - startTime;
    console.log(`⏱️ Diagnostics completed in ${latency}ms`);
    
    return {
      internetConnected,
      supabaseConnected,
      latency,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  } catch (error: any) {
    console.error('❌ Network diagnostics failed:', error);
    return {
      internetConnected: false,
      supabaseConnected: false,
      error: error.message,
    };
  }
};

/**
 * Test upload with detailed diagnostics
 */
export const testUploadWithDiagnostics = async (
  localUri: string,
  fileName: string
): Promise<UploadDiagnostics> => {
  const startTime = Date.now();
  const errors: string[] = [];
  let uploadAttempts = 0;
  
  try {
    console.log('🧪 Running upload diagnostics...');
    
    // Get file info
    const fileInfo = {
      size: 0,
      type: 'unknown',
      uri: localUri,
    };
    
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      fileInfo.size = blob.size;
      fileInfo.type = blob.type;
    } catch (error: any) {
      errors.push(`File info failed: ${error.message}`);
    }
    
    // Run network diagnostics
    const networkStatus = await runNetworkDiagnostics();
    
    // Test upload
    const { testUploadFunctionality } = await import('./fileUpload');
    const uploadSuccess = await testUploadFunctionality(localUri, fileName);
    
    if (!uploadSuccess) {
      errors.push('Upload test failed');
    }
    
    const totalTime = Date.now() - startTime;
    
    return {
      networkStatus,
      fileInfo,
      uploadAttempts,
      totalTime,
      errors,
    };
  } catch (error: any) {
    errors.push(error.message);
    return {
      networkStatus: {
        internetConnected: false,
        supabaseConnected: false,
        error: error.message,
      },
      fileInfo: {
        size: 0,
        type: 'unknown',
        uri: localUri,
      },
      uploadAttempts,
      totalTime: Date.now() - startTime,
      errors,
    };
  }
};

/**
 * Generate a network status report
 */
export const generateNetworkReport = (diagnostics: UploadDiagnostics): string => {
  const { networkStatus, fileInfo, totalTime, errors } = diagnostics;
  
  let report = '📊 Network Diagnostics Report\n';
  report += '='.repeat(40) + '\n';
  report += `⏱️ Total time: ${totalTime}ms\n`;
  report += `📁 File size: ${(fileInfo.size / 1024).toFixed(2)}KB\n`;
  report += `📄 File type: ${fileInfo.type}\n`;
  report += `🌐 Internet: ${networkStatus.internetConnected ? '✅' : '❌'}\n`;
  report += `☁️ Supabase: ${networkStatus.supabaseConnected ? '✅' : '❌'}\n`;
  
  if (networkStatus.latency) {
    report += `⏱️ Latency: ${networkStatus.latency}ms\n`;
  }
  
  if (errors.length > 0) {
    report += '\n❌ Errors:\n';
    errors.forEach((error, index) => {
      report += `${index + 1}. ${error}\n`;
    });
  }
  
  return report;
};

/**
 * Check if device is online
 */
export const isOnline = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get network quality indicator
 */
export const getNetworkQuality = async (): Promise<'excellent' | 'good' | 'poor' | 'offline'> => {
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return 'offline';
    }
    
    const latency = Date.now() - startTime;
    
    if (latency < 500) return 'excellent';
    if (latency < 1000) return 'good';
    return 'poor';
  } catch {
    return 'offline';
  }
}; 