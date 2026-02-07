import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { SafetyWarningModal } from "@/components/SafetyWarningModal";
import { SafetyQuiz } from "@/components/SafetyQuiz";
import { SafetySuccess } from "@/components/SafetySuccess";
import { DoNotOperate } from "@/components/DoNotOperate";
import { QuizCategorySelect } from "@/components/QuizCategorySelect";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

interface Machine {
  id: string;
  name: string;
  common_injury: string;
  safety_warning: string;
  question_count: number;
}

interface Question {
  id: string;
  question: string;
  order_index: number;
  correct_answer: boolean;
  category: "safety" | "usage";
}

type QuizState = "category" | "warning" | "quiz" | "success" | "failed" | "loading" | "error";
type QuizCategory = "safety" | "usage";

export default function InspectMachine() {
  const { machineId } = useParams<{ machineId: string }>();
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | null>(null);
  const [quizState, setQuizState] = useState<QuizState>("loading");
  const [timestamp, setTimestamp] = useState<Date>(new Date());

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (machineId && user) {
      fetchMachineData();
    }
  }, [machineId, user]);

  const fetchMachineData = async () => {
    if (!machineId) return;

    // Fetch machine
    const { data: machineData, error: machineError } = await supabase
      .from("machines")
      .select("*")
      .eq("id", machineId)
      .single();

    if (machineError || !machineData) {
      setQuizState("error");
      return;
    }

    setMachine(machineData);
    setQuizState("category");
  };

  const fetchQuestions = async (category: QuizCategory) => {
    if (!machineId) return;

    const { data, error } = await supabase
      .from("safety_questions")
      .select("*")
      .eq("machine_id", machineId)
      .eq("category", category)
      .order("order_index");

    if (!error && data) {
      setQuestions(data as Question[]);
    }
  };

  const handleSelectCategory = async (category: QuizCategory) => {
    setSelectedCategory(category);
    await fetchQuestions(category);
    setQuizState("warning");
  };

  const handleAcknowledgeWarning = () => {
    setQuizState("quiz");
  };

  const handleQuizComplete = async (correctAnswers: number, totalQuestions: number) => {
    const now = new Date();
    setTimestamp(now);

    if (user && machine && selectedCategory) {
      await supabase.from("safety_logs").insert({
        employee_id: user.id,
        machine_id: machine.id,
        status: "safe",
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        category: selectedCategory,
      });
    }

    setQuizState("success");
  };

  const handleQuizFail = async () => {
    if (user && machine && selectedCategory) {
      await supabase.from("safety_logs").insert({
        employee_id: user.id,
        machine_id: machine.id,
        status: "failed",
        correct_answers: 0,
        total_questions: questions.length,
        category: selectedCategory,
      });
    }
    setQuizState("failed");
  };

  const handleBackToDashboard = () => {
    navigate("/");
  };

  const handleBackToCategory = () => {
    setQuizState("category");
    setQuestions([]);
    setSelectedCategory(null);
  };

  if (loading || quizState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (quizState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Machine Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The requested machine could not be found.
          </p>
          <button
            onClick={() => navigate("/")}
            className="text-primary font-bold hover:underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (quizState === "success" && machine) {
    return (
      <SafetySuccess
        employeeName={profile?.full_name || "Worker"}
        machineName={machine.name}
        timestamp={timestamp}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  if (quizState === "failed" && machine) {
    return (
      <DoNotOperate
        machineName={machine.name}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={profile?.full_name} isAdmin={isAdmin} />

      {quizState === "warning" && machine && (
        <SafetyWarningModal
          machineName={machine.name}
          commonInjury={machine.common_injury}
          safetyWarning={machine.safety_warning}
          onAcknowledge={handleAcknowledgeWarning}
        />
      )}

      <main className="pt-20 md:pt-24 pb-8 px-4 max-w-4xl mx-auto">
        {quizState === "category" && machine && (
          <div className="pt-8">
            <Button
              variant="ghost"
              onClick={handleBackToDashboard}
              className="mb-6 -ml-2"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Button>
            <QuizCategorySelect
              machineName={machine.name}
              onSelect={handleSelectCategory}
            />
          </div>
        )}

        {quizState === "quiz" && machine && (
          <div className="pt-8">
            <Button
              variant="ghost"
              onClick={handleBackToCategory}
              className="mb-6 -ml-2"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Categories
            </Button>
            <SafetyQuiz
              questions={questions}
              questionCount={machine.question_count}
              onComplete={handleQuizComplete}
              onFail={handleQuizFail}
            />
          </div>
        )}
      </main>
    </div>
  );
}
