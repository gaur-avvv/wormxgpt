// Real-Time Audio Service simulating Voice-to-Voice
export class VoiceModeService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private apiKey: string = '';
  private isRecording = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (e: any) {
      throw new Error("Microphone access denied or unavailable: " + e.message);
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.mediaRecorder) throw new Error("Recorder not initialized");

    return new Promise((resolve, reject) => {
      this.mediaRecorder!.onstop = async () => {
        this.isRecording = false;
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Cleanup tracks
        this.mediaRecorder!.stream.getTracks().forEach(track => track.stop());

        try {
          // 1. Send Audio to STT (Transcription)
          const transcriptionText = await this.transcribeAudio(audioBlob);
          resolve(transcriptionText);
        } catch (e) {
          reject(e);
        }
      };

      this.mediaRecorder!.stop();
    });
  }

  private async transcribeAudio(blob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1'); // Pollinations alias

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch('https://gen.pollinations.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  }

  async generateAndPlaySpeech(text: string, voice = 'alloy') {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch('https://gen.pollinations.ai/v1/audio/speech', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice
      })
    });

    if (!response.ok) {
      throw new Error(`Text-to-speech failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  }
}
