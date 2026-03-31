// Real-Time Audio Service with proper WebRTC stream management and cleanup
export class VoiceModeService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private apiKey: string = '';
  private isRecording = false;
  private stream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private audioObjectUrl: string | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Cleanup all active media streams and resources.
   * Call this on component unmount to prevent WebRTC leaks.
   */
  cleanup(): void {
    // Stop any active recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (_e) {
        // Ignore errors during cleanup
      }
    }

    // Release all media stream tracks (WebRTC cleanup)
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      this.stream = null;
    }

    // Cleanup audio playback resources
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }

    // Revoke any object URLs to prevent memory leaks
    if (this.audioObjectUrl) {
      URL.revokeObjectURL(this.audioObjectUrl);
      this.audioObjectUrl = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  async startRecording(): Promise<void> {
    // Cleanup any previous recording session first
    this.cleanup();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });

      // Determine best supported audio format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Handle unexpected stops
      this.mediaRecorder.onerror = (event: Event) => {
        console.error('[VoiceMode] MediaRecorder error:', event);
        this.cleanup();
      };

      this.mediaRecorder.start(250); // Collect data every 250ms for smoother streaming
      this.isRecording = true;
    } catch (e: any) {
      this.cleanup();
      throw new Error("Microphone access denied or unavailable: " + e.message);
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.mediaRecorder || !this.isRecording) {
      throw new Error("Recorder not initialized or not recording");
    }

    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder!;
      const currentStream = this.stream;

      recorder.onstop = async () => {
        this.isRecording = false;
        const audioBlob = new Blob(this.audioChunks, { type: recorder.mimeType });

        // Cleanup media stream tracks (WebRTC cleanup)
        if (currentStream) {
          currentStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
        }
        this.stream = null;
        this.mediaRecorder = null;

        try {
          const transcriptionText = await this.transcribeAudio(audioBlob);
          resolve(transcriptionText);
        } catch (e) {
          reject(e);
        }
      };

      recorder.stop();
    });
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  private async transcribeAudio(blob: Blob): Promise<string> {
    if (blob.size === 0) {
      throw new Error('No audio data recorded');
    }

    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://gen.pollinations.ai/v1/audio/transcriptions', {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Transcription failed (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data.text || '';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateAndPlaySpeech(text: string, voice = 'alloy'): Promise<void> {
    // Cleanup previous audio playback
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.audioObjectUrl) {
      URL.revokeObjectURL(this.audioObjectUrl);
      this.audioObjectUrl = null;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://gen.pollinations.ai/v1/audio/speech', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'tts-1',
          input: text.slice(0, 4096), // Limit text length for TTS
          voice
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Text-to-speech failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      this.audioObjectUrl = URL.createObjectURL(blob);
      this.audioElement = new Audio(this.audioObjectUrl);

      // Auto-cleanup when playback finishes
      this.audioElement.onended = () => {
        if (this.audioObjectUrl) {
          URL.revokeObjectURL(this.audioObjectUrl);
          this.audioObjectUrl = null;
        }
        this.audioElement = null;
      };

      await this.audioElement.play();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
