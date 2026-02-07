import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceRecorderOptions {
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

// Extend Window interface for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

type SpeechRecognitionType = {
  new (): SpeechRecognitionInstance;
};

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionType;
    webkitSpeechRecognition: SpeechRecognitionType;
  }
}

export function useVoiceRecorder({ 
  onTranscription, 
  onError,
  language = "en-US" 
}: UseVoiceRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef<string>("");
  
  // Use refs for callbacks to avoid re-creating recognition on callback changes
  const onTranscriptionRef = useRef(onTranscription);
  const onErrorRef = useRef(onError);
  
  // Keep refs in sync with props
  useEffect(() => {
    onTranscriptionRef.current = onTranscription;
  }, [onTranscription]);
  
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Initialize speech recognition once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsRecording(true);
      transcriptRef.current = "";
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        transcriptRef.current += finalTranscript;
      }

      if (interimTranscript) {
        setIsTranscribing(true);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore aborted errors when stopping intentionally
      if (event.error === "aborted") {
        return;
      }
      
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      setIsTranscribing(false);
      
      if (event.error === "not-allowed") {
        onErrorRef.current?.("Microphone access denied. Please allow microphone access.");
      } else if (event.error === "no-speech") {
        onErrorRef.current?.("No speech detected. Please try again.");
      } else {
        onErrorRef.current?.(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      setIsTranscribing(false);
      
      if (transcriptRef.current.trim()) {
        onTranscriptionRef.current?.(transcriptRef.current.trim());
      }
    };

    recognitionRef.current = recognition;

    // Cleanup only on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, [language]); // Only re-create when language changes

  const startRecording = useCallback(() => {
    if (!isSupported) {
      onErrorRef.current?.("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (recognitionRef.current && !isRecording) {
      try {
        transcriptRef.current = "";
        recognitionRef.current.start();
      } catch (error: any) {
        // Handle case where recognition is already started
        if (error.message?.includes("already started")) {
          return;
        }
        console.error("Failed to start recording:", error);
        onErrorRef.current?.("Failed to start recording. Please try again.");
      }
    }
  }, [isSupported, isRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isTranscribing,
    isSupported,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
