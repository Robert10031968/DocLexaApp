# Google OAuth Setup for DocLexaApp

## Prerequisites

1. A Google Cloud Console project
2. Supabase project with authentication enabled

## Step 1: Configure Google OAuth in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Web application" as the application type
6. Add authorized redirect URIs:
   - `https://utvolelclhzesimpwbrl.supabase.co/auth/v1/callback`
   - `https://auth.expo.io/@rgora/DocLexaApp`
7. Note down the Client ID and Client Secret

## Step 2: Configure Google OAuth in Supabase

1. Go to your Supabase project dashboard
2. Navigate to Authentication → Providers
3. Find Google in the list and click "Edit"
4. Enable Google provider
5. Enter your Google Client ID and Client Secret
6. Save the configuration

## Step 3: Test the Implementation

1. Run the app: `npx expo start --clear`
2. Open the app on your device/simulator using Expo Go
3. Tap "Continue with Google" on the login screen
4. Complete the Google OAuth flow in the browser
5. Verify you're redirected back to the app and logged in

## Implementation Details

### Key Components:

1. **App.tsx**: Added `WebBrowser.maybeCompleteAuthSession()` at the top level
2. **AuthContext**: Uses Expo AuthSession proxy URL for OAuth redirects
3. **LoginScreen**: Enhanced error handling and logging for Google OAuth flow

### OAuth Flow:

1. User taps "Continue with Google"
2. App calls `supabase.auth.signInWithOAuth()` with Expo proxy URL
3. Browser opens with Google login page
4. User completes authentication
5. Browser redirects to `https://auth.expo.io/@rgora/DocLexaApp`
6. `WebBrowser.maybeCompleteAuthSession()` handles the redirect
7. Supabase detects the session and triggers `onAuthStateChange`
8. User is automatically navigated to main app screen

### Correct Implementation:

```javascript
// In AuthContext.tsx
const signInWithGoogle = async () => {
  const redirectTo = 'https://auth.expo.io/@rgora/DocLexaApp';
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
};
```

## Debugging the OAuth Flow

### Console Logs to Watch For:

When you tap "Continue with Google", you should see these logs in order:

1. `🔐 LoginScreen: Starting Google OAuth flow...`
2. `🔐 AuthProvider: Attempting Google OAuth sign in...`
3. `🔐 AuthProvider: Using redirect URI: https://auth.expo.io/@rgora/DocLexaApp`
4. `✅ AuthProvider: Google OAuth initiated successfully`
5. `✅ LoginScreen: Google OAuth initiated successfully`

After completing Google login in the browser, you should see:

1. `🔄 AuthProvider: Auth state changed: { event: 'SIGNED_IN', ... }`
2. `✅ AuthProvider: Setting new session for user: [email]`
3. `💾 AuthProvider: Session stored in AsyncStorage`
4. `📱 App: Auth state updated: { hasSession: true, ... }`

### Common Issues and Solutions:

#### Issue 1: "Invalid redirect URI" error
**Solution**: 
- Make sure the redirect URI in Google Cloud Console exactly matches: `https://auth.expo.io/@rgora/DocLexaApp`
- Check that there are no extra spaces or characters

#### Issue 2: App doesn't detect session after Google login
**Solution**:
- Verify `WebBrowser.maybeCompleteAuthSession()` is called at app startup
- Ensure the app is running in Expo Go environment
- Check console logs for auth state change events
- Verify the redirect URL is exactly `https://auth.expo.io/@rgora/DocLexaApp`

#### Issue 3: Browser opens but doesn't redirect back to app
**Solution**:
- Ensure you're testing in Expo Go (not standalone app)
- Check that the redirect URI is correctly set to the Expo proxy URL
- Verify the app can handle the deep link redirect

#### Issue 4: Session not persisting after app restart
**Solution**:
- Verify AsyncStorage is working correctly
- Check that the AuthContext is properly handling session restoration
- Look for "Found existing session" logs on app startup

### Manual Testing Steps:

1. **Test in Expo Go**: Make sure you're testing in Expo Go environment, not a standalone app
2. **Check Console Logs**: Look for the emoji-prefixed logs to track the flow
3. **Verify Session Storage**: Check AsyncStorage for session data
4. **Test App Restart**: Close and reopen the app to verify session persistence
5. **Test Deep Link**: Try opening `https://auth.expo.io/@rgora/DocLexaApp` manually

### Advanced Debugging:

1. **Enable Supabase Debug Logs**:
   ```javascript
   // The current implementation already includes comprehensive logging
   // Check console for emoji-prefixed logs like 🔐, ✅, ❌, etc.
   ```

2. **Check Network Requests**: Use browser dev tools to monitor the OAuth redirect flow

3. **Verify Supabase Configuration**: Check that Google OAuth is properly enabled in your Supabase dashboard

4. **Test Redirect URI**: Verify the redirect URI is correctly configured:
   ```javascript
   // You can test this in the console
   console.log('Redirect URI:', 'https://auth.expo.io/@rgora/DocLexaApp');
   ```

## Security Notes

- Never commit your Google Client Secret to version control
- Use environment variables for sensitive configuration in production
- Regularly rotate your OAuth credentials
- Monitor your OAuth usage in Google Cloud Console
- Ensure your redirect URIs are secure and properly configured
- The implementation uses PKCE flow for enhanced security
- The Expo AuthSession proxy provides additional security for mobile OAuth flows 