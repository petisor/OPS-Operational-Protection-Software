import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BookOpen, AlertTriangle, ClipboardCheck, MessageCircle, Lock, CheckCircle, Image as ImageIcon } from "lucide-react";

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
      case "visual-support":
        navigate(`/learn/${machineId}/visuals`);
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
      iconBgColor: "bg-primary/20",
      iconColor: "text-primary",
      badgeText: "Start Here",
      badgeBgColor: "bg-primary/20",
      badgeTextColor: "text-primary",
    },
    {
      id: "warnings",
      title: "Warnings",
      description: "Safety warnings and liability notices. You must acknowledge all warnings to proceed.",
      icon: AlertTriangle,
      completed: progress?.warnings_completed,
      locked: false,
      iconBgColor: "bg-warning/20",
      iconColor: "text-warning",
      badgeText: "Required",
      badgeBgColor: "bg-warning/20",
      badgeTextColor: "text-warning",
    },
    {
      id: "quiz",
      title: "Quiz",
      description: "Test your knowledge with safety and usage quizzes to get certified.",
      icon: ClipboardCheck,
      completed: false,
      locked: !progress?.warnings_completed,
      iconBgColor: "bg-success/20",
      iconColor: "text-success",
      badgeText: progress?.warnings_completed ? "Ready" : "Locked",
      badgeBgColor: progress?.warnings_completed ? "bg-success/20" : "bg-muted",
      badgeTextColor: progress?.warnings_completed ? "text-success" : "text-muted-foreground",
    },
    {
      id: "visual-support",
      title: "Visual Support",
      description: "Generate visual guides and illustrations based on the machine manual.",
      icon: ImageIcon,
      completed: false,
      locked: false,
      iconBgColor: "bg-blue-500/20",
      iconColor: "text-blue-500",
      badgeText: "AI Generated",
      badgeBgColor: "bg-blue-500/20",
      badgeTextColor: "text-blue-500",
    },
    {
      id: "live-assistance",
      title: "Live Assistance",
      description: "Chat with an AI assistant trained on this machine's manual for instant help.",
      icon: MessageCircle,
      completed: false,
      locked: false,
      iconBgColor: "bg-purple-500/20",
      iconColor: "text-purple-500",
      badgeText: "AI Powered",
      badgeBgColor: "bg-purple-500/20",
      badgeTextColor: "text-purple-500",
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

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            Learning Environment
          </h1>
          <p className="text-lg text-muted-foreground">
            {machine?.name} - Complete all sections to operate this machine
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            const isLocked = category.locked;
            const isCompleted = category.completed;

            return (
              <button
                key={category.id}
                onClick={() => !isLocked && handleCategoryClick(category.id)}
                disabled={isLocked}
                className={`card-industrial p-8 flex flex-col items-center gap-4 transition-all text-left ${
                  isLocked 
                    ? "opacity-60 cursor-not-allowed" 
                    : `hover:border-primary cursor-pointer`
                } ${isCompleted ? "border-success/50" : ""}`}
              >
                <div className={`w-20 h-20 rounded-full ${category.iconBgColor} flex items-center justify-center relative`}>
                  <Icon className={`h-10 w-10 ${category.iconColor}`} />
                  {isCompleted && (
                    <CheckCircle className="absolute -top-1 -right-1 h-6 w-6 text-success bg-background rounded-full" />
                  )}
                  {isLocked && (
                    <Lock className="absolute -top-1 -right-1 h-6 w-6 text-muted-foreground bg-background rounded-full p-0.5" />
                  )}
                </div>
                <h2 className="text-2xl font-black text-center">{category.title}</h2>
                <p className="text-muted-foreground text-center">
                  {category.description}
                </p>
                <div className={`mt-2 px-4 py-2 ${category.badgeBgColor} rounded-sm`}>
                  <span className={`font-bold ${category.badgeTextColor}`}>
                    {isCompleted ? "Completed" : category.badgeText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
