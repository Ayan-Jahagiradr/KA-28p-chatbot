
import { useState, useRef, useEffect, useCallback } from 'react';

// Definitions for the Web Speech API to provide TypeScript support.
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult;
  readonly length: number;
}
interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
  readonly length: number;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionHookProps {
  /** A callback function to execute when a voice command is detected. */
  onCommand?: (command: string) => void;
}

interface SpeechRecognitionHook {
  /** True if the microphone is currently listening. */
  isListening: boolean;
  /** The transcribed text from the user's speech. */
  transcript: string;
  /** Function to start listening for speech. */
  startListening: () => void;
  /** Function to stop listening for speech. */
  stopListening: () => void;
  /** True if the browser supports the Web Speech API. */
  hasRecognitionSupport: boolean;
  /** Any error message from the speech recognition service. */
  error: string | null;
}

// Get the browser's implementation of the Speech Recognition API.
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// A map of spoken phrases to command identifiers.
const COMMANDS: { [key: string]: string } = {
  'new chat': 'new chat',
  'stop listening': 'stop listening',
  'send message': 'send message',
  'clear input': 'clear input',
};

/**
 * A custom hook to manage voice-to-text transcription using the browser's Web Speech API.
 * @param {SpeechRecognitionHookProps} props - The properties for the hook, including an onCommand callback.
 * @returns {SpeechRecognitionHook} An object containing the state and functions for controlling speech recognition.
 */
export const useSpeechRecognition = ({
  onCommand,
}: SpeechRecognitionHookProps): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const hasRecognitionSupport = !!SpeechRecognitionAPI;

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const startListening = useCallback(() => {
    if (isListening || !SpeechRecognitionAPI) {
      return;
    }

    setError(null);
    setTranscript('');

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = true; // Keep listening even after a pause.
    recognition.interimResults = true; // Get results as the user speaks.
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      // Concatenate all speech segments.
      for (let i = 0; i < event.results.length; i++) {
        const segment = event.results[i];
        if (segment.isFinal) {
          finalTranscript += segment[0].transcript;
        } else {
          interimTranscript += segment[0].transcript;
        }
      }

      const lowerCaseTranscript = (
        finalTranscript + interimTranscript
      ).toLowerCase();
      
      // Check if the transcript contains a command.
      const command = Object.keys(COMMANDS).find((key) =>
        lowerCaseTranscript.includes(key),
      );

      if (command && onCommand) {
        onCommand(COMMANDS[command]);
        // Don't update the text input if it's a command.
      } else {
        setTranscript(finalTranscript + interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  }, [isListening, SpeechRecognitionAPI, onCommand]);

  // Cleanup effect to ensure recognition is stopped when the component unmounts.
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    hasRecognitionSupport,
    error,
  };
};
