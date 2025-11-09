# Production Deployment Guide

## Environment Variables

Make sure to set the following environment variables in your production environment (Vercel, Netlify, etc.):

### Firebase Client SDK (Required - Must be set during build)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**Important**: Even though Firebase initializes client-side, Next.js may still validate these during build. Set them in your build environment.

### Firebase Admin SDK (Required for API routes)
```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

### External Services (Optional but recommended)
```
OPENAI_API_KEY=your-openai-key
ASSEMBLYAI_API_KEY=your-assemblyai-key
NEXT_PUBLIC_WEBHOOK_URL=https://your-production-url.com (for webhooks)
```

## Build Configuration

The app is configured to:
- Use dynamic rendering (`export const dynamic = 'force-dynamic'`) to prevent SSR/prerendering
- Lazy-load Firebase client SDK using dynamic imports (only loads on client)
- Use type-only imports for Firebase types to prevent build-time execution
- Handle missing environment variables gracefully during build
- Mark Firebase packages as external in Next.js config

## Deployment Steps

1. **Set all environment variables** in your hosting platform's build settings
2. **Build the app**: `npm run build`
   - The build should complete successfully even if Firebase client SDK isn't fully initialized
   - Firebase will initialize on first client-side access
3. **Deploy**: The app should work correctly in production

## Troubleshooting

### Error: `auth/invalid-api-key` during build

**Solution**: Ensure all `NEXT_PUBLIC_FIREBASE_*` environment variables are set in your build environment. Even though Firebase initializes client-side, Next.js may validate the config during build.

**Quick check**:
```bash
# Verify variables are set
echo $NEXT_PUBLIC_FIREBASE_API_KEY
```

### Firebase doesn't initialize in production

1. Check browser console for errors
2. Verify environment variables are accessible (they should be with `NEXT_PUBLIC_` prefix)
3. Ensure the Firebase project is active and API key is valid
4. Check Firebase project settings for API restrictions

### Build succeeds but app doesn't work

- Check that `FIREBASE_SERVICE_ACCOUNT_KEY` is set (required for API routes)
- Verify API routes are working: check server logs
- Ensure Firebase Storage CORS is configured (run `npm run setup-cors`)

## Architecture Notes

- **Client SDK**: Uses dynamic imports to prevent build-time execution
- **Admin SDK**: Only used in API routes (server-side only)
- **Page Rendering**: Marked as `force-dynamic` to skip static generation
- **Firebase Config**: Returns `null` during SSR/build, initializes on client mount

