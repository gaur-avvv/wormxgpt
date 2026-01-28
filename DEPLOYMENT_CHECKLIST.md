# Deployment Checklist

## Pre-Deployment
- [x] Remove harmful/unsafe content from constants.ts
- [x] Enable TypeScript strict mode
- [x] Add build optimizations (minification, code splitting)
- [x] Add TailwindCSS to dependencies
- [x] Update HTML meta tags and remove CDN importmap
- [x] Create .env.example file
- [x] Update comprehensive README with deployment instructions
- [x] Verify no TypeScript errors

## Security
- [x] Removed dangerous system instructions
- [x] API keys handled via environment variables
- [x] Meta robots tag added (noindex, nofollow)
- [x] HTML minified in production builds
- [x] Console logs removed from production bundles

## Performance
- [x] Code splitting implemented (vendor, gemini, app chunks)
- [x] Terser minification enabled
- [x] Source maps disabled in production
- [x] Image and CSS optimizations in place
- [x] Lazy loading for chat sessions

## Deployment Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your GEMINI_API_KEY
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Test production build locally:**
   ```bash
   npm run preview
   ```

5. **Deploy `dist/` folder to your hosting:**
   - Vercel: Push to main branch (auto-deploy)
   - Netlify: Connect git repo
   - Self-hosted: Serve with nginx/Apache
   - Docker: Use provided Dockerfile

## Environment Variables Required

- `GEMINI_API_KEY` - Your Gemini API key (required)

## Post-Deployment

- [ ] Test all features in deployed version
- [ ] Verify API key is set correctly
- [ ] Check console for errors (F12 DevTools)
- [ ] Test on mobile devices
- [ ] Verify session persistence
- [ ] Test image upload functionality
- [ ] Monitor for JavaScript errors
