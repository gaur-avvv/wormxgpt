# Automatic Media Generation Flow

## Overview
This document describes how the automatic media generation feature works in WormGPT.

## Flow Diagram

```
User Input (Prompt)
        |
        v
+---------------------------------------+
| Check: Manual Command?                |
| - /image [prompt]                     |
| - /video [prompt]                     |
| - /audio [prompt]                     |
+---------------------------------------+
        |
   YES  |  NO
        v
+---------------------------------------+
| Execute Manual Command                |
| (takes precedence)                    |
+---------------------------------------+
        |
        v
    [DONE]


        |
   NO   |
        v
+---------------------------------------+
| Check Model Capabilities              |
| (from MODEL_OPTIONS)                  |
+---------------------------------------+
        |
        v
+---------------------------------------+
| Has imageGen flag?                    |
+---------------------------------------+
   YES  |  NO
        v
+---------------------------------------+
| Generate Image Automatically          |
| - Use prompt as-is                    |
| - Route to generateImage()            |
+---------------------------------------+
        |
        v
    [DONE]


        |
   NO   |
        v
+---------------------------------------+
| Has videoGen flag?                    |
+---------------------------------------+
   YES  |  NO
        v
+---------------------------------------+
| Generate Video Automatically          |
| - Use prompt as-is                    |
| - Route to generateVideo()            |
+---------------------------------------+
        |
        v
    [DONE]


        |
   NO   |
        v
+---------------------------------------+
| Has audioGen flag?                    |
+---------------------------------------+
   YES  |  NO
        v
+---------------------------------------+
| Generate Audio Automatically          |
| - Use prompt as-is                    |
| - Route to generateAudio()            |
+---------------------------------------+
        |
        v
    [DONE]


        |
   NO   |
        v
+---------------------------------------+
| Default: Text Generation              |
| - Route to generateText()             |
+---------------------------------------+
        |
        v
    [DONE]
```

## Priority Order

1. **Manual Commands** (Highest Priority)
   - `/image [prompt]` → Always generates image
   - `/video [prompt]` → Always generates video
   - `/audio [prompt]` → Always generates audio
   - These work with ANY model

2. **Model Capability Detection**
   - Checks `MODEL_OPTIONS` for capability flags
   - `imageGen: true` → Automatic image generation
   - `videoGen: true` → Automatic video generation
   - `audioGen: true` → Automatic audio generation

3. **Default Behavior** (Lowest Priority)
   - Falls back to text generation
   - Used for standard chat models

## Example Scenarios

### Scenario 1: Image Model with Direct Prompt
```
Selected Model: "flux" (imageGen: true)
User Input: "A cyberpunk hacker terminal"
Result: → Automatically generates image
```

### Scenario 2: Text Model with Manual Command
```
Selected Model: "openai" (no special flags)
User Input: "/image A cyberpunk hacker terminal"
Result: → Generates image via manual command
```

### Scenario 3: Video Model with Manual Image Command
```
Selected Model: "veo" (videoGen: true)
User Input: "/image A cyberpunk hacker terminal"
Result: → Generates image (manual command takes precedence)
```

### Scenario 4: Text Model with Regular Prompt
```
Selected Model: "openai" (no special flags)
User Input: "Explain quantum computing"
Result: → Generates text response
```

## Implementation Details

### Code Location
- **File**: `services/pollinations.ts`
- **Function**: `streamChat()`
- **Lines**: 21-69

### Key Decision Points
1. **Line 25-42**: Check for manual commands first
2. **Line 44-65**: Check model capabilities
3. **Line 67-68**: Default to text generation

### Model Metadata
- **File**: `constants.ts`
- **Array**: `MODEL_OPTIONS`
- **Flags**: `imageGen`, `videoGen`, `audioGen`

## Benefits

✅ **User Experience**
- No commands needed for media models
- More intuitive workflow
- Faster media generation

✅ **Flexibility**
- Manual commands still available
- Works across all model types
- Backward compatible

✅ **Maintainability**
- Single source of truth (MODEL_OPTIONS)
- Clear priority order
- Easy to extend with new media types

## Future Enhancements

Potential improvements:
- Add settings toggle to disable automatic generation
- Support multiple media types in one prompt
- Add capability detection for Gemini and Groq models
- Introduce `audioTranscription` flag for Whisper-like models
