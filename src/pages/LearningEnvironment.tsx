import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BookOpen, AlertTriangle, ClipboardCheck, MessageCircle, Lock, CheckCircle } from "lucide-react";

interface Machine {
  id: string;
  name: string;
  description: string | null;
  icon: string;
}

interface LearningProgress {
  instructions_completed: boolean;
  warnings_completed: boolean;
  quiz_unlocked: boolean;
}

export default function LearningEnvironment() {
  const { machineId } = useParams<{ machineId: string }>();
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (machineId && user) {
      fetchData();
    }
  }, [machineId, user]);

  const fetchData = async () => {
    if (!machineId || !user) return;

    setLoadingData(true);

    // Fetch machine
    const { data: machineData, error: machineError } = await supabase
      .from("machines")
      .select("id, name, description, icon")
      .eq("id", machineId)
      .single();

    if (machineError || !machineData) {
      console.error("Machine not found:", machineError);
      navigate("/");
      return;
    }

    setMachine(machineData);

    // Fetch or create learning progress
    const { data: progressData } = await supabase
      .from("user_learning_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("machine_id", machineId)
      .single();

    if (progressData) {
      setProgress({
        instructions_completed: progressData.instructions_completed,
        warnings_completed: progressData.warnings_completed,
        quiz_unlocked: progressData.quiz_unlocked,
      });
    } else {
      // Create initial progress record
      await supabase.from("user_learning_progress").insert({
        user_id: user.id,
        machine_id: machineId,
      });
      setProgress({
        instructions_completed: false,
        warnings_completed: false,
        quiz_unlocked: false,
      });
    }

    setLoadingData(false);
  };

  const handleCategoryClick = (category: string) => {
    if (!machineId) return;

    switch (category) {
      case "how-to-use":
        navigate(`/learn/${machineId}/instructions`);
        break;
      case "warnings":
        navigate(`/learn/${machineId}/warnings`);
        break;
      case "quiz":
        if (progress?.warnings_completed) {
          navigate(`/learn/${machineId}/quiz`);
        }
        break;
      case "live-assistance":
        navigate(`/learn/${machineId}/chat`);
        break;
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  const categories = [
    {
      id: "how-to-use",
      title: "How to Use",
      description: "Step-by-step instructions on how to operate this machine safely and effectively.",
      icon: BookOpen,
      completed: progress?.instructions_completed,
      locked: false,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      id: "warnings",
      title: "Warnings",
      description: "Safety warnings and liability notices. You must acknowledge all warnings to proceed.",
      icon: AlertTriangle,
      completed: progress?.warnings_completed,
      locked: false,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      id: "quiz",
      title: "Quiz",
      description: "Test your knowledge with safety and usage quizzes to get certified.",
      icon: ClipboardCheck,
      completed: false,
      locked: !progress?.warnings_completed,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      id: "live-assistance",
      title: "Live Assistance",
      description: "Chat with an AI assistant trained on this machine's manual for instant help.",
      icon: MessageCircle,
      completed: false,
      locked: false,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={profile?.full_name} isAdmin={isAdmin} />

      <main className="pt-20 md:pt-24 pb-8 px-4 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            Learning Environment
          </h1>
          <p className="text-lg text-muted-foreground">
            {machine?.name} - Complete all sections to operate this machine
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isLocked = category.locked;
            const isCompleted = category.completed;

            return (
              <Card
                key={category.id}
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  isLocked ? "opacity-60" : ""
                } ${isCompleted ? "border-green-500/50" : ""}`}
                onClick={() => !isLocked && handleCategoryClick(category.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${category.bgColor}`}>
                      <Icon className={`h-6 w-6 ${category.color}`} />
                    </div>
                    {isLocked && (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                    {isCompleted && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <CardTitle className="text-xl mt-3">{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLocked ? (
                    <p className="text-sm text-muted-foreground">
                      Complete the Warnings section to unlock
                    </p>
                  ) : (
                    <Button
                      variant={isCompleted ? "outline" : "default"}
                      className="w-full"
                      disabled={isLocked}
                    >
                      {isCompleted ? "Review Again" : "Start"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
