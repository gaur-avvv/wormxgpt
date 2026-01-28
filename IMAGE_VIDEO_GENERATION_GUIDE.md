# Image, Video & Audio Generation Guide

## Overview
WormGPT now supports automatic image, video, and audio generation with Pollinations.ai! Simply select the appropriate model and start creating.

## How to Use

### 🎨 Image Generation

**Method 1: Automatic (Recommended)**
1. Select **POLLINATIONS_IDENTITY** as provider
2. Choose any **image model** from dropdown:
   - `flux` - FLUX Schnell (Fast)
   - `zimage` - Z-Image Turbo (6B Flux)
   - `turbo` - SDXL Turbo (Real-time)
   - `nanobanana` - NanoBanana (Gemini 2.5)
   - `nanobanana-pro` - NanoBanana Pro (4K)
   - `seedream` - Seedream 4.0 (ByteDance)
   - `seedream-pro` - Seedream 4.5 Pro (4K)
   - `gptimage` - GPT Image 1 Mini (OpenAI)
   - `gptimage-large` - GPT Image 1.5 (Advanced)
   - `kontext` - FLUX Kontext (In-context)

3. Type your prompt directly:
   ```
   A cyberpunk hacker terminal with red glowing screens
   ```

4. Press INJECT>>> and watch your image generate!

**Method 2: Manual Command (Works with any text model)**
```
/image A cyberpunk hacker terminal with red glowing screens
```

### 🎬 Video Generation

**Method 1: Automatic (Recommended)**
1. Select **POLLINATIONS_IDENTITY** as provider
2. Choose any **video model** from dropdown:
   - `veo` - Veo 3.1 Fast (Google)
   - `seedance` - Seedance Lite (ByteDance)
   - `seedance-pro` - Seedance Pro-Fast (ByteDance)

3. Type your prompt directly:
   ```
   A hacker typing code in a dark room with red ambient lighting
   ```

4. Press INJECT>>> and your video will generate!
   - Videos display with native controls (play, pause, fullscreen)
   - Click "🔗 Open in new tab" to download

**Method 2: Manual Command (Works with any text model)**
```
/video A hacker typing code in a dark room with red ambient lighting
```

### 🎤 Audio Generation

**Method 1: Automatic (Recommended)**
1. Select **POLLINATIONS_IDENTITY** as provider
2. Choose the **audio model** from dropdown:
   - `openai-audio` 🎤 - OpenAI GPT-4o Mini Audio (Voice I/O with 13 voices)

3. Type your prompt directly:
   ```
   Explain quantum computing in a dramatic voice
   ```

4. Press INJECT>>> and your audio will generate!
   - Audio displays with native HTML5 player
   - Volume, play/pause, timeline controls
   - Styled with WormGPT red theme

**Metudio Display
- ✅ Native HTML5 audio player
- ✅ Play/pause/volume/timeline controls
- ✅ Inline playback in chat
- ✅ Red theme with custom styling
- ✅ Base64 encoded audio (no external URLs needed)
- ✅ MP3 format for universal compatibility

### Ahod 2: Manual Command (Works with any text model)**
```
/audio Explain quantum computing in a dramatic voice
```

**Available Voices:**
- alloy, echo, fable, onyx, nova, shimmer (default)
- coral, verse, ballad, ash, sage, amuch, dan

- **Audio**: `openai-audio` (High-quality voice synthesis)
## Features

### Image Display
- ✅ Auto-embedded in chat
- ✅ Grayscale → Color on hover
- ✅ Smooth transitions
- ✅ Red border theme matching WormGPT
- ✅ Shadow glow effects

### Video Display
- ✅ Native HTML5 video player
- ✅ Play/pause/fullscreen controls
- ✅ Max height 600px (responsive)
- ✅ Direct download link
- ✅ Red border theme matching WormGPT
- ✅ Hover glow effects

### API Key
- 🔓 **Works without API key** (rate limited)
- 🔑 **Add API key** for unlimited usage:
  1. Go to https://pollinations.ai
  2. Get your API key (pk_ or sk_)
  3. Enter in "POLLINATIONS_API_KEY_OPTIONAL" field
  4. Key saved automatically in localStorage

## Model Recommendations

### Best for Speed
- **Image**: `turbo` (SDXL Turbo - Real-time)
- **Video**: `veo` (Veo 3.1 Fast)

### Best for Quality
- **Image**: `seedream-pro` (4K quality)
- **Video**: `seedance-pro` (Pro-Fast quality)

### Best for Experimentation
- **Image**: `flux` (FLUX Schnell - Balanced)
- **Video**: `seedance` (Lite version)

### Best for AI-Powered
- **Image**: `nanobanana-pro` (Gemini 2.5 powered, 4K)
- **Image**: `gptimage-large` (GPT-powered advanced)

## Pro Tips

1. **Detailed Prompts = Better Results**
   ```
   Bad:  "a car"
   Good: "A futuristic cyberpunk sports car with neon underglow, rain-slicked streets, night scene, cinematic lighting"
   ```

2. **Use Style Keywords**
   - `cyberpunk`, `noir`, `cinematic`, `8k`, `photorealistic`
   - `anime style`, `oil painting`, `sketch`, `3D render`

3. **Video Duration**
   - Default: 4 seconds
   - Longer videos may take more time to generate

4. **Combine with Text Models**
   - Use text models to brainstorm ideas
   - Copy the prompt suggestions
   - Switch to image/video model and generate

5. **Session Management**
   - Images/videos persist in session history
   - Copy session logs to save media URLs
   - Use NEW_SESSION_THREAD to organize projects

## Troubleshooting

**Image/Video Not Loading?**
- Check your internet connection
- Wait 2-5 seconds for generation to complete
- Try refreshing the page
- Verify model is selected correctly

**Rate Limited?**
- Add your Pollinations API key
- Free tier has rate limits
- Upgrade to sk_ key for unlimited access
# Audio Examples
```
Narrate a cybersecurity breach scenario in a suspenseful tone
```
```
Explain RSA encryption like you're a villainous hacker
```
```
Read this code snippet in a dramatic voice: while(true) { hack(); }
```

##
**Vidio Generation**
- Endpoint: `https://gen.pollinations.ai/v1/chat/completions`
- Parameters: model, messages, modalities, audio (voice, format)
- Output: Base64 encoded audio (MP3)
- Voices: 13 options (alloy, echo, fable, onyx, nova, shimmer, coral, verse, ballad, ash, sage, amuch, dan)

**Audeo Won't Play?**🎤
- Some browsers may not support the video format
- Click "🔗 Open in new tab" to download
- Try a different browser (Chrome recommended)

**Slow Generation?**
- Switch to faster models (`turbo`, `veo`)
- Reduce prompt complexity
- Check if API is experiencing high traffic

## Examples

### Image Examples
```
A dark terminal interface with cascading green matrix code
```
```
Cybersecurity hacker workspace with multiple monitors showing code, red LED lighting, ultra realistic
```
```
Digital art of a worm-shaped AI entity made of glowing red circuits
```

### Video Examples
```
Camera pan across a dark hacker den with glowing red screens
```
```
Zoom into a terminal as malicious code executes, cyberpunk aesthetic
```
```
First-person view of hacking into a mainframe, Matrix-style
```

## Technical Details

**Image Generation**
- Endpoint: `https://image.pollinations.ai/prompt/{prompt}`
- Parameters: model, width, height, enhance, nologo
- Output: Direct image URL (on-demand generation)

**Video Generation**
- Endpoint: `https://image.pollinations.ai/prompt/{prompt}`
- Parameters: model, duration, nologo
- Output: Video file URL (MP4)

**Authentication**
- Optional Bearer token in Authorization header
- Works without auth (rate limited to free tier)

---

**Happy Creating! 🎨🎬**

Need help? Check the main [POLLINATIONS_GUIDE.md](./POLLINATIONS_GUIDE.md) for full API documentation.
