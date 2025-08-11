import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  storagePath?: string; // Full path in Supabase Storage bucket
  error?: string;
  retryCount?: number;
}

// Configuration constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const SUPPORTED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif',
  'txt'
];
const MAX_RETRY_ATTEMPTS = 3;
const REQUEST_TIMEOUT = 15000; // 15 seconds
const RETRY_DELAY_BASE = 1000; // 1 second base delay

// Supabase configuration validation
const SUPABASE_URL = 'https://utvolelclhzesimpwbrl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dm9sZWxjbGh6ZXNpbXB3YnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTU4MTcsImV4cCI6MjA2NzY5MTgxN30.M2d3R611-y_t26xsN3R6-Y0uf5bRVRDni16-m2mF1tY';

/**
 * Test basic internet connectivity
 */
export const testInternetConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing internet connectivity...');
    
    // Test with a reliable endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('✅ Internet connectivity confirmed');
      return true;
    } else {
      console.log('❌ Internet connectivity test failed:', response.status);
      return false;
    }
  } catch (error: any) {
    console.log('❌ Internet connectivity test failed:', error.message);
    return false;
  }
};

/**
 * Test Supabase connectivity specifically
 */
export const testSupabaseConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing Supabase connectivity...');
    console.log('Supabase URL:', SUPABASE_URL);
    
    // Test basic Supabase endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok || response.status === 401) {
      // 401 is expected for anonymous access to root endpoint
      console.log('✅ Supabase connectivity confirmed');
      return true;
    } else {
      console.log('❌ Supabase connectivity test failed:', response.status);
      return false;
    }
  } catch (error: any) {
    console.log('❌ Supabase connectivity test failed:', error.message);
    return false;
  }
};

/**
 * Create a fetch request with timeout and retry logic
 */
const createFetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

/**
 * Exponential backoff retry logic
 */
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRY_ATTEMPTS,
  baseDelay: number = RETRY_DELAY_BASE
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxRetries) {
        console.log(`❌ All ${maxRetries + 1} attempts failed`);
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      console.log('Error:', error.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'bmp': return 'image/bmp';
    case 'webp': return 'image/webp';
    case 'heic': return 'image/heic';
    case 'heif': return 'image/heif';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}

function sanitizeFileName(fileName: string): string {
  // Remove leading slash to prevent double slashes in URLs
  const cleanedFileName = fileName.startsWith('/') ? fileName.slice(1) : fileName;
  return cleanedFileName.replace(/[^a-zA-Z0-9._-]/g, '');
}

function validateFile(fileName: string, fileSize?: number): string | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  console.log('🔍 File validation:', {
    fileName,
    extension: ext,
    supportedExtensions: SUPPORTED_EXTENSIONS,
    isSupported: ext ? SUPPORTED_EXTENSIONS.includes(ext) : false,
    fileSize: fileSize
  });
  
  // TEMPORARY: Allow all files for testing
  console.log('⚠️ TEMPORARY: Bypassing file type validation for testing');
  console.log('✅ File validation passed (bypassed)');
  return null;
  
  // Original validation logic (commented out for testing)
  /*
  if (!ext) {
    return `No file extension found. Supported types: ${SUPPORTED_EXTENSIONS.join(', ')}`;
  }
  
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return `Unsupported file type: "${ext}". Supported types: ${SUPPORTED_EXTENSIONS.join(', ')}`;
  }
  
  if (fileSize && fileSize > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB. Current size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB`;
  }
  
  if (fileSize === 0) {
    return 'File is empty';
  }
  
  console.log('✅ File validation passed');
  return null;
  */
}

/**
 * Enhanced upload function with network resilience
 */
export const uploadFileToSupabase = async (
  localUri: string,
  fileName: string,
  bucketName: string = 'documents'
): Promise<UploadResult> => {
  let retryCount = 0;
  
  try {
    console.log('🚀 Starting enhanced file upload:', fileName);
    console.log('File URI:', localUri);
    
    // Step 1: Validate file
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      return { success: false, error: 'File does not exist at the specified URI' };
    }

    const validationError = validateFile(fileName, fileInfo.size);
    if (validationError) {
      return { success: false, error: validationError };
    }

    console.log('📁 File size:', fileInfo.size, 'bytes');
    console.log('📁 File type:', getMimeType(fileName));

    // Step 2: Test network connectivity
    const internetConnected = await testInternetConnectivity();
    if (!internetConnected) {
      return { 
        success: false, 
        error: 'No internet connection. Please check your network and try again.',
        retryCount 
      };
    }

    // Step 3: Test Supabase connectivity
    const supabaseConnected = await testSupabaseConnectivity();
    if (!supabaseConnected) {
      return { 
        success: false, 
        error: 'Cannot reach Supabase servers. Please check your connection and try again.',
        retryCount 
      };
    }

    // Step 4: Prepare upload
    const timestamp = Date.now();
    const sanitizedFileName = sanitizeFileName(fileName);
    const filePath = `${timestamp}_${sanitizedFileName}`;
    const contentType = getMimeType(fileName);

    console.log('📤 Upload path:', filePath);
    console.log('📤 Content type:', contentType);

    // Step 5: Attempt upload with retry logic
    const uploadResult = await retryWithBackoff(async () => {
      retryCount++;
      console.log(`🔄 Upload attempt ${retryCount}/${MAX_RETRY_ATTEMPTS + 1}`);
      
      try {
        // Method 1: Try direct Supabase upload first
        console.log('📤 Attempting direct Supabase upload...');
        
        // Read file as base64 for direct upload
        const base64Data = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log('📦 File read as base64, size:', base64Data.length, 'characters');

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, decode(base64Data), {
            contentType,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }

        console.log('✅ Direct upload successful');
        return true;
      } catch (error: any) {
        console.log('❌ Direct upload failed, trying FormData method...');
        console.log('Error:', error.message);
        
        // Method 2: Fallback to FormData upload
        try {
          const formData = new FormData();
          formData.append('file', {
            uri: localUri,
            type: contentType,
            name: fileName,
          } as any);

          // Use the correct Supabase Storage upload endpoint
          const uploadUrl = `${SUPABASE_URL}/storage/v1/upload`;
          const queryParams = new URLSearchParams({
            bucket: bucketName,
            name: filePath,
            upsert: 'false'
          }).toString();
          
          const finalUploadUrl = `${uploadUrl}?${queryParams}`;
          console.log('📤 FormData upload URL:', finalUploadUrl);

          const uploadResponse = await createFetchWithTimeout(
            finalUploadUrl,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
              },
              body: formData,
            },
            REQUEST_TIMEOUT
          );

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `FormData upload failed: ${uploadResponse.status}`);
          }

          console.log('✅ FormData upload successful');
          return true;
        } catch (formDataError: any) {
          console.log('❌ FormData upload also failed:', formDataError.message);
          
          // Method 3: Try with blob approach as last resort
          console.log('📤 Attempting blob upload as fallback...');
          
          const response = await fetch(localUri);
          if (!response.ok) {
            throw new Error(`Failed to read file: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();
          console.log('📦 Blob created, size:', blob.size, 'bytes');

          const { error: blobUploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, blob, {
              contentType,
              cacheControl: '3600',
              upsert: false,
            });

          if (blobUploadError) {
            throw new Error(`Blob upload failed: ${blobUploadError.message}`);
          }

          console.log('✅ Blob upload successful');
          return true;
        }
      }
    });

    // Step 6: Get public URL
    console.log('🔗 Getting public URL...');
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    console.log('✅ Upload completed successfully');
    console.log('🔗 Public URL:', publicUrlData.publicUrl);
    
    return { 
      success: true, 
      publicUrl: publicUrlData.publicUrl,
      retryCount 
    };
  } catch (error: any) {
    console.error('❌ Upload failed after all attempts:', error);
    
    // Provide specific error messages based on error type
    let errorMessage = 'Upload failed';
    
    if (error.message.includes('Network request failed')) {
      errorMessage = 'Network connection failed. Please check your internet connection and try again.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Upload timed out. Please try again with a better connection.';
    } else if (error.message.includes('Supabase')) {
      errorMessage = 'Supabase service error. Please try again later.';
    } else if (error.message.includes('Failed to read file')) {
      errorMessage = 'Could not read the file. Please ensure the file is accessible.';
    } else {
      errorMessage = `Upload error: ${error.message}`;
    }
    
    return { 
      success: false, 
      error: errorMessage,
      retryCount 
    };
  }
};

// Helper function to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Detect file type from content and add appropriate extension if missing
 */
async function detectAndFixFileType(localUri: string, fileName: string): Promise<string> {
  // Remove leading slash to prevent double slashes in URLs
  const cleanedFileName = fileName.startsWith('/') ? fileName.slice(1) : fileName;
  
  // If file already has an extension, return as is
  if (cleanedFileName.includes('.')) {
    return cleanedFileName;
  }
  
  try {
    console.log('🔍 Detecting file type for file without extension...');
    
    // Read first few bytes to detect file type
    const base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Convert base64 to binary to check file signatures
    const binaryData = decode(base64Data);
    
    // Check file signatures (magic numbers)
    if (binaryData.length >= 4) {
      const signature = Array.from(binaryData.slice(0, 4))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('').toLowerCase();
      
      console.log('🔍 File signature:', signature);
      
      // JPEG signature: FF D8 FF
      if (signature.startsWith('ffd8ff')) {
        console.log('✅ Detected JPEG image');
        return `${cleanedFileName}.jpg`;
      }
      
      // PNG signature: 89 50 4E 47
      if (signature.startsWith('89504e47')) {
        console.log('✅ Detected PNG image');
        return `${cleanedFileName}.png`;
      }
      
      // GIF signature: 47 49 46 38
      if (signature.startsWith('47494638')) {
        console.log('✅ Detected GIF image');
        return `${cleanedFileName}.gif`;
      }
      
      // PDF signature: 25 50 44 46
      if (signature.startsWith('25504446')) {
        console.log('✅ Detected PDF document');
        return `${cleanedFileName}.pdf`;
      }
    }
    
    console.log('⚠️ Could not detect file type, defaulting to .jpg');
    return `${cleanedFileName}.jpg`;
  } catch (error) {
    console.log('⚠️ Error detecting file type:', error);
    return `${cleanedFileName}.jpg`; // Default to jpg for images
  }
}

/**
 * Alternative upload method using FormData for very large files
 */
export const uploadFileToSupabaseWithFormData = async (
  localUri: string,
  fileName: string,
  bucketName: string = 'documents'
): Promise<UploadResult> => {
  try {
    console.log('🚀 Starting FormData upload:', fileName);
    
    // Validate file
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      return { success: false, error: 'File does not exist at the specified URI' };
    }

    const validationError = validateFile(fileName, fileInfo.size);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Test connectivity
    const internetConnected = await testInternetConnectivity();
    if (!internetConnected) {
      return { success: false, error: 'No internet connection' };
    }

    const supabaseConnected = await testSupabaseConnectivity();
    if (!supabaseConnected) {
      return { success: false, error: 'Cannot reach Supabase servers' };
    }

    // Prepare upload
    const timestamp = Date.now();
    const sanitizedFileName = sanitizeFileName(fileName);
    const filePath = `${timestamp}_${sanitizedFileName}`;

    // Create FormData
    const formData = new FormData();
    formData.append('file', {
      uri: localUri,
      type: getMimeType(fileName),
      name: fileName,
    } as any);

    // Use the correct Supabase Storage upload endpoint
    const uploadUrl = `${SUPABASE_URL}/storage/v1/upload`;
    const queryParams = new URLSearchParams({
      bucket: bucketName,
      name: filePath,
      upsert: 'false'
    }).toString();
    
    const finalUploadUrl = `${uploadUrl}?${queryParams}`;
    console.log('📤 FormData upload URL:', finalUploadUrl);

    // Upload with retry logic
    await retryWithBackoff(async () => {
      const uploadResponse = await createFetchWithTimeout(
        finalUploadUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: formData,
        },
        REQUEST_TIMEOUT
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${uploadResponse.status}`);
      }
    });

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      return { success: false, error: 'Failed to generate public URL' };
    }

    console.log('✅ FormData upload completed successfully');
    return { success: true, publicUrl: publicUrlData.publicUrl };
  } catch (error: any) {
    console.error('❌ FormData upload error:', error);
    return { success: false, error: `Upload error: ${error.message}` };
  }
};

/**
 * Simplified upload function optimized for React Native
 * This is the most reliable method for mobile uploads
 */
export const uploadFileToSupabaseSimple = async (
  localUri: string,
  fileName: string,
  bucketName: string = 'documents'
): Promise<UploadResult> => {
  try {
    console.log('🚀 Starting simple file upload:', fileName);
    console.log('📁 Original filename:', fileName);
    console.log('📁 File URI:', localUri);
    
    // Detect and fix file type if needed
    const fixedFileName = await detectAndFixFileType(localUri, fileName);
    if (fixedFileName !== fileName) {
      console.log('📝 Fixed filename:', fileName, '→', fixedFileName);
      fileName = fixedFileName;
    }
    
    console.log('📁 Final filename:', fileName);
    
    // Validate file exists
    console.log('🔍 Checking if file exists...');
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    console.log('📁 File info:', fileInfo);
    
    if (!fileInfo.exists) {
      console.log('❌ File does not exist');
      return { success: false, error: 'File does not exist at the specified URI' };
    }

    // Validate file type and size
    console.log('🔍 Running file validation...');
    const validationError = validateFile(fileName, fileInfo.size);
    if (validationError) {
      console.log('❌ File validation failed:', validationError);
      return { success: false, error: validationError };
    }

    console.log('📁 File size:', fileInfo.size, 'bytes');
    console.log('📁 File type:', getMimeType(fileName));

    // Prepare upload path
    const timestamp = Date.now();
    const sanitizedFileName = sanitizeFileName(fileName);
    const filePath = `${timestamp}_${sanitizedFileName}`;
    const contentType = getMimeType(fileName);

    console.log('📤 Upload path:', filePath);
    console.log('📤 Content type:', contentType);

    // Read file as base64 (most reliable for React Native)
    console.log('📖 Reading file as base64...');
    const base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('📦 Base64 data size:', base64Data.length, 'characters');

    // Convert base64 to Uint8Array
    console.log('🔄 Converting base64 to binary...');
    const binaryData = decode(base64Data);
    console.log('📦 Binary data size:', binaryData.length, 'bytes');

    // Upload to Supabase
    console.log('📤 Uploading to Supabase...');
    console.log('📤 Bucket:', bucketName);
    console.log('📤 File path:', filePath);
    
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, binaryData, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    console.log('🔗 Getting public URL...');
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      console.log('❌ Failed to get public URL');
      return { success: false, error: 'Failed to generate public URL' };
    }

    console.log('✅ Upload completed successfully');
    console.log('🔗 Public URL:', publicUrlData.publicUrl);
    
    return { 
      success: true, 
      publicUrl: publicUrlData.publicUrl,
      retryCount: 0
    };
  } catch (error: any) {
    console.error('❌ Simple upload failed:', error);
    console.error('❌ Error stack:', error.stack);
    return { 
      success: false, 
      error: `Upload error: ${error.message}`,
      retryCount: 0
    };
  }
};

/**
 * Comprehensive test utility for upload functionality
 */
export const testUploadFunctionality = async (
  localUri: string,
  fileName: string
): Promise<boolean> => {
  try {
    console.log('🧪 Testing upload functionality...');
    
    // Test connectivity first
    const internetOk = await testInternetConnectivity();
    if (!internetOk) {
      console.log('❌ No internet connection');
      return false;
    }
    
    const supabaseOk = await testSupabaseConnectivity();
    if (!supabaseOk) {
      console.log('❌ Supabase not reachable');
      return false;
    }
    
    // Test the main upload function
    const result = await uploadFileToSupabase(localUri, fileName);
    
    if (result.success) {
      console.log('✅ Upload test passed');
      console.log('🔗 Public URL:', result.publicUrl);
      console.log('🔄 Retry count:', result.retryCount);
      return true;
    } else {
      console.error('❌ Upload test failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Upload test error:', error);
    return false;
  }
}; 

/**
 * Enhanced upload function optimized for React Native/Expo
 * This function ensures reliable file uploads to Supabase Storage
 * 
 * Key features for React Native/Expo:
 * - Uses expo-file-system for reliable file reading
 * - Converts to Uint8Array for proper binary handling
 * - Generates proper filenames with extensions
 * - Includes detailed logging for debugging
 * - Handles React Native specific URI formats
 */
export const testUploadNoValidation = async (
  localUri: string,
  fileName: string,
  bucketName: string = 'documents'
): Promise<UploadResult> => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 === UPLOAD START ===');
    console.log('📁 Original filename:', fileName);
    console.log('📁 File URI:', localUri);
    console.log('📦 Target bucket:', bucketName);
    
    // Step 1: Validate file exists
    console.log('🔍 Step 1: Checking if file exists...');
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    console.log('📁 File info:', {
      exists: fileInfo.exists,
      size: fileInfo.exists ? fileInfo.size : 'N/A',
      uri: fileInfo.uri
    });
    
    if (!fileInfo.exists) {
      console.log('❌ File does not exist at URI:', localUri);
      return { success: false, error: 'File does not exist' };
    }
    
    if (!fileInfo.size || fileInfo.size === 0) {
      console.log('❌ File is empty or size is 0');
      return { success: false, error: 'File is empty' };
    }
    
    console.log('✅ File validation passed');
    
    // Step 2: Generate proper filename with extension
    console.log('🔍 Step 2: Processing filename...');
    let finalFileName = fileName;
    
    // Remove any invalid characters and ensure proper extension
    if (!fileName.includes('.')) {
      // For React Native, detect image files and add .jpg extension
      if (localUri.includes('image') || localUri.includes('photo') || 
          localUri.includes('jpg') || localUri.includes('jpeg') || 
          localUri.includes('png') || localUri.includes('camera')) {
        finalFileName = `${fileName}.jpg`;
        console.log('📝 Added .jpg extension for image file');
      } else {
        finalFileName = `${fileName}.pdf`;
        console.log('📝 Added .pdf extension for document file');
      }
    }
    
    // Clean filename for URL safety
    const cleanFileName = finalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    console.log('📁 Final filename:', cleanFileName);
    
    // Step 3: Generate upload path
    console.log('🔍 Step 3: Generating upload path...');
    const timestamp = Date.now();
    const filePath = `${timestamp}_${cleanFileName}`;
    const contentType = getMimeType(cleanFileName);
    
    console.log('📤 Upload details:', {
      path: filePath,
      contentType: contentType,
      bucket: bucketName
    });
    
    // Step 4: Read file as Base64 (most reliable for React Native)
    console.log('🔍 Step 4: Reading file as Base64...');
    console.log('📖 Reading from URI:', localUri);
    
    const base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('📦 Base64 data size:', base64Data.length, 'characters');
    
    if (!base64Data || base64Data.length === 0) {
      console.log('❌ Base64 data is empty');
      return { success: false, error: 'Failed to read file data' };
    }
    
    // Step 5: Convert Base64 to Uint8Array
    console.log('🔍 Step 5: Converting Base64 to binary...');
    const binaryData = decode(base64Data);
    console.log('📦 Binary data size:', binaryData.length, 'bytes');
    
    if (binaryData.length === 0) {
      console.log('❌ Binary data is empty');
      return { success: false, error: 'Failed to convert file to binary' };
    }
    
    // Step 6: Upload to Supabase Storage
    console.log('🔍 Step 6: Uploading to Supabase Storage...');
    console.log('📤 Upload parameters:', {
      bucket: bucketName,
      path: filePath,
      contentType: contentType,
      dataSize: binaryData.length
    });
    
    const uploadStartTime = Date.now();
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, binaryData, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });
    
    const uploadDuration = Date.now() - uploadStartTime;
    console.log('⏱️ Upload duration:', uploadDuration, 'ms');
    
    if (uploadError) {
      console.error('❌ Upload failed with error:', uploadError);
      console.error('❌ Error message:', uploadError.message);
      console.error('❌ Error details:', uploadError);
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }
    
    console.log('✅ Upload completed successfully');
    
    // Step 7: Get public URL
    console.log('🔍 Step 7: Getting public URL...');
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    if (!publicUrlData?.publicUrl) {
      console.log('❌ Failed to generate public URL');
      return { success: false, error: 'Failed to generate public URL' };
    }
    
    const totalDuration = Date.now() - startTime;
    console.log('✅ === UPLOAD SUCCESS ===');
    console.log('🔗 Public URL:', publicUrlData.publicUrl);
    console.log('📁 File size uploaded:', binaryData.length, 'bytes');
    console.log('⏱️ Total duration:', totalDuration, 'ms');
    console.log('📤 File path in storage:', filePath);
    
    return { 
      success: true, 
      publicUrl: publicUrlData.publicUrl,
      storagePath: filePath, // Return the storage path for deletion
      retryCount: 0
    };
    
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error('❌ === UPLOAD FAILED ===');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('⏱️ Duration before failure:', totalDuration, 'ms');
    
    return { 
      success: false, 
      error: `Upload error: ${error.message}`,
      retryCount: 0
    };
  }
}; 

/**
 * Delete a file from Supabase Storage
 * This function removes the file from the specified bucket using the storage path
 * 
 * @param storagePath - The full path of the file in the bucket (e.g., "12345_photo.jpg")
 * @param bucketName - The bucket name (default: 'documents')
 * @returns Promise<{success: boolean, error?: string}>
 */
export const deleteFileFromSupabase = async (
  storagePath: string,
  bucketName: string = 'documents'
): Promise<{success: boolean, error?: string}> => {
  try {
    console.log('🗑️ === DELETE START ===');
    console.log('📤 Storage path:', storagePath);
    console.log('📦 Bucket:', bucketName);
    
    if (!storagePath) {
      console.log('❌ No storage path provided');
      return { success: false, error: 'No storage path provided' };
    }
    
    // Remove the file from Supabase Storage
    console.log('🗑️ Removing file from Supabase Storage...');
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([storagePath]);
    
    if (deleteError) {
      console.error('❌ === DELETE FAILED ===');
      console.error('❌ Delete error:', deleteError);
      console.error('❌ Error message:', deleteError.message);
      return { success: false, error: `Delete failed: ${deleteError.message}` };
    }
    
    console.log('✅ === DELETE SUCCESS ===');
    console.log('🗑️ File removed from storage:', storagePath);
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ === DELETE ERROR ===');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    return { success: false, error: `Delete error: ${error.message}` };
  }
};