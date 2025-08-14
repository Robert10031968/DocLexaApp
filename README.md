# DocLexa

An AI-powered document assistant mobile app built with Expo and React Native.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
# For web
npm run web

# For iOS
npm run ios

# For Android
npm run android
```

## 📁 Project Structure

```
DocLexaApp/
├── components/          # Reusable UI components
├── screens/            # Screen components
├── navigation/         # Navigation configuration
├── services/           # API calls and external services
├── hooks/              # Custom React hooks
├── context/            # React Context providers
└── assets/             # Images, fonts, and other static assets
```

## 🛠️ Tech Stack

- **Framework**: Expo with React Native
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **State Management**: React Context (ready for expansion)

## 📱 Features

- [ ] Document scanning and processing
- [ ] AI-powered text extraction
- [ ] Document organization and search
- [ ] Cross-platform compatibility

## 🎨 Development

The app is set up with a clean, modular architecture:

- **Components**: Reusable UI elements
- **Screens**: Full-page components
- **Navigation**: Stack-based navigation with React Navigation
- **Services**: API integration and external service calls
- **Hooks**: Custom React hooks for shared logic
- **Context**: Global state management

## 📄 License

This project is licensed under the MIT License. 

## 🔐 Encryption of analyses (server-side)

Environment:

```
ANALYSIS_ENC_KEY   # 32-byte key, base64 or hex
# Optional feature flag:
ANALYSIS_ENCRYPTION_ENABLED=true   # set to 'false' to temporarily disable encryption
# Example:
openssl rand -base64 32
```

Behavior:
- Analyses are encrypted at rest in the database using AES-GCM (256-bit).
- The API decrypts analyses for the authorized user when reading.
- A short plaintext `summary_tldr` may be stored for listings.

Feature flag:
- If `ANALYSIS_ENCRYPTION_ENABLED` is set to `false`, the service will store plaintext fields as before and mark `encrypted=false`. This is intended only for temporary troubleshooting.

Caveats:
- Losing `ANALYSIS_ENC_KEY` makes existing analyses undecryptable. Store it securely and back it up.
- Consider key rotation in the future (key versioning).

## 🔌 API examples

### GET /api/analyses

Headers:

```
Authorization: Bearer <supabase_jwt>
```

Response:

```json
{
  "items": [
    {
      "id": "7d4f3e3a-1a1b-4d5e-9a9c-1d2e3f4a5b6c",
      "created_at": "2025-08-13T10:21:45.000Z",
      "doc_type": "contract",
      "summary_tldr": "Umowa sprzedaży – kluczowe warunki...",
      "encrypted": true
    }
  ]
}
```

### GET /api/analysis/{id}

Headers:

```
Authorization: Bearer <supabase_jwt>
```

Response:

```json
{
  "analysisId": "7d4f3e3a-1a1b-4d5e-9a9c-1d2e3f4a5b6c",
  "summary_tldr": "Umowa sprzedaży – kluczowe warunki...",
  "doc_type": "contract",
  "lang": "pl",
  "key_points": [
    "Strony: ...",
    "Przedmiot: ..."
  ]
}
```

### POST /api/analyze

Body:

```json
{
  "fileUrl": "<signed-url>",
  "mimeType": "application/pdf",
  "pageCount": 7,
  "targetLanguage": "pl",
  "documentType": "contract"
}
```

Response:

```
Plaintext analysis JSON (API decrypts before sending back). The database stores ciphertext (plus summary_tldr) when encryption is enabled.
```