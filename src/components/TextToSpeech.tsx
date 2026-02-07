import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TextToSpeechProps {
  className?: string;
}

export function TextToSpeech({ className }: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const extractPageText = () => {
    // Get main content, excluding navigation, buttons, etc.
    const mainContent = document.querySelector("main");
    if (!mainContent) return "";

    // Clone to avoid modifying DOM
    const clone = mainContent.cloneNode(true) as HTMLElement;
    
    // Remove interactive elements and nav
    clone.querySelectorAll("button, input, nav, script, style").forEach(el => el.remove());
    
    // Get text content
    const text = clone.textContent?.trim() || "";
    
    // Clean up whitespace
    return text.replace(/\s+/g, " ").slice(0, 5000); // Limit to 5000 chars
  };

  const handleSpeak = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
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

    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate speech");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        toast({
          title: "Playback error",
          description: "Failed to play audio.",
          variant: "destructive",
        });
      };

      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("TTS error:", error);
      toast({
        title: "Error",
        description: "Failed to read page content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleSpeak}
      disabled={isLoading}
      className={className}
      title={isPlaying ? "Stop reading" : "Read page aloud"}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="h-5 w-5" />
      ) : (
        <Volume2 className="h-5 w-5" />
      )}
    </Button>
  );
}
