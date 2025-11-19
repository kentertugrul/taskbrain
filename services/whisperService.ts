// OpenAI Whisper Service for Voice Transcription
// This provides much better continuous recording than browser Web Speech API

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm'
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        
        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        
        console.log('🎤 Recording stopped, size:', audioBlob.size);
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

export const transcribeAudio = async (audioBlob: Blob, apiKey: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Transcription failed');
  }

  const result = await response.json();
  return result.text;
};

