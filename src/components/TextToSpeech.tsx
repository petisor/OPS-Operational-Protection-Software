import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function TextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const extractPageText = (): string => {
    // Get main content first, fallback to body
    const mainContent = document.querySelector("main") || document.body;
    
    // Clone to avoid modifying DOM
    const clone = mainContent.cloneNode(true) as HTMLElement;
    
    // Remove interactive elements, nav, scripts, styles
    clone.querySelectorAll("button, input, nav, script, style, svg, [role='navigation']").forEach(el => el.remove());
    
    // Get text content and clean up whitespace
    const text = clone.textContent?.trim() || "";
    return text.replace(/\s+/g, " ");
  };

  const handleSpeak = () => {
    // Check if speech synthesis is supported
    if (!window.speechSynthesis) {
      toast({
        title: "Not supported",
        description: "Text-to-speech is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    // If currently speaking, stop
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = extractPageText();
    if (!text) {
      toast({
        title: "No content",
        description: "No readable content found on this page.",
        variant: "destructive",
      });
      return;
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      // Don't show error when speech is manually cancelled/interrupted
      if (event.error === "interrupted" || event.error === "canceled") {
        return;
      }
      toast({
        title: "Error",
        description: "Failed to read page content.",
        variant: "destructive",
      });
    };

    // Start speaking
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <Button
      variant="default"
      size="icon"
      onClick={handleSpeak}
      className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
      title={isSpeaking ? "Stop reading" : "Read page aloud"}
    >
      {isSpeaking ? (
        <Square className="h-5 w-5" />
      ) : (
        <Volume2 className="h-5 w-5" />
      )}
    </Button>
  );
}
