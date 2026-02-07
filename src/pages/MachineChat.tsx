import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Send, Bot, User, Loader2 } from "lucide-react";

interface Machine {
  id: string;
  name: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;

export default function MachineChat() {
  const { machineId } = useParams<{ machineId: string }>();
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (machineId && user) {
      fetchMachine();
    }
  }, [machineId, user]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMachine = async () => {
    if (!machineId) return;

    const { data: machineData } = await supabase
      .from("machines")
      .select("id, name")
      .eq("id", machineId)
      .single();

    if (!machineData) {
      navigate(`/learn/${machineId}`);
      return;
    }

    setMachine(machineData);
    setLoadingData(false);

    // Add welcome message
    setMessages([
      {
        role: "assistant",
        content: `${t("chat.greeting")} ${machineData.name}. ${t("chat.greetingEnd")}`,
      },
    ]);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming || !machineId) return;

    const userMessage: Message = { role: "user", content: inputValue.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsStreaming(true);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2].role === "user") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const conversationHistory = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          machineId,
          message: userMessage.content,
          conversationHistory,
          language, // Pass the selected language to the backend
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar userName={profile?.full_name} isAdmin={isAdmin} />

      <main className="flex-1 pt-20 md:pt-24 pb-4 px-4 max-w-4xl mx-auto w-full flex flex-col">
        <Button
          variant="ghost"
          onClick={() => navigate(`/learn/${machineId}`)}
          className="mb-4 -ml-2 self-start"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          {t("learn.backToLearn")}
        </Button>

        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-black">
            {t("chat.title")}: {machine?.name}
          </h1>
          <p className="text-muted-foreground">
            {t("chat.placeholder")}
          </p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("chat.placeholder")}
                disabled={isStreaming}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isStreaming}
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
