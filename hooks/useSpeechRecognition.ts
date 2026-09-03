import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
  lang?: string;
  continuous?: boolean;
}

export const useSpeechRecognition = (options: SpeechRecognitionOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = options.continuous ?? true;
        recognition.interimResults = true;
        recognition.lang = options.lang || 'en-US';

        recognition.onresult = (event: any) => {
          let accumulated = '';
          let isFinal = false;

          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i];
            if (item && item[0]) {
              accumulated += item[0].transcript;
              if (item.isFinal) {
                isFinal = true;
              }
            }
          }

          setTranscript(accumulated);
          if (optionsRef.current.onResult) {
            optionsRef.current.onResult(accumulated, isFinal);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            console.warn('Speech recognition warning/error:', event.error);
            setIsListening(false);
          }
          if (optionsRef.current.onError) {
            optionsRef.current.onError(event);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          if (optionsRef.current.onEnd) {
            optionsRef.current.onEnd();
          }
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('SpeechRecognition initialization error:', e);
        setIsSupported(false);
      }
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [options.lang, options.continuous]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (err) {
        console.error('Failed to stop speech recognition:', err);
      }
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    toggleListening
  };
};

export default useSpeechRecognition;
