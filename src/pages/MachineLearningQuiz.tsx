import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { SafetyQuiz } from "@/components/SafetyQuiz";
import { SafetySuccess } from "@/components/SafetySuccess";
import { DoNotOperate } from "@/components/DoNotOperate";
import { QuizCategorySelect } from "@/components/QuizCategorySelect";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Lock } from "lucide-react";

interface Machine {
  id: string;
  name: string;
  question_count: number;
}

interface Question {
  id: string;
  question: string;
  order_index: number;
  correct_answer: boolean;
  category: "safety" | "usage";
}

type QuizCategory = "safety" | "usage";
type QuizState = "category" | "quiz" | "success" | "failed" | "locked";

export default function MachineLearningQuiz() {
  const { machineId } = useParams<{ machineId: string }>();
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | null>(null);
  const [quizState, setQuizState] = useState<QuizState>("category");
  const [timestamp, setTimestamp] = useState<Date>(new Date());
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

    // Check learning progress - quiz must be unlocked
    const { data: progressData } = await supabase
      .from("user_learning_progress")
      .select("quiz_unlocked")
      .eq("user_id", user.id)
      .eq("machine_id", machineId)
      .single();

    if (!progressData?.quiz_unlocked) {
      setQuizState("locked");
      setLoadingData(false);
      return;
    }

    // Fetch machine
    const { data: machineData } = await supabase
      .from("machines")
      .select("id, name, question_count")
      .eq("id", machineId)
      .single();

    if (!machineData) {
      navigate(`/learn/${machineId}`);
      return;
    }

    setMachine(machineData);
    setLoadingData(false);
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

  const handleBackToLearning = () => {
    navigate(`/learn/${machineId}`);
  };

  const handleBackToCategory = () => {
    setQuizState("category");
    setQuestions([]);
    setSelectedCategory(null);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (quizState === "locked") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar userName={profile?.full_name} isAdmin={isAdmin} />
        <main className="pt-20 md:pt-24 pb-8 px-4 max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-4">Quiz Locked</h2>
            <p className="text-muted-foreground mb-6">
              You must complete all safety warnings before taking the quiz.
            </p>
            <Button onClick={handleBackToLearning}>
              Go to Warnings
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (quizState === "success" && machine) {
    return (
      <SafetySuccess
        employeeName={profile?.full_name || "Worker"}
        machineName={machine.name}
        timestamp={timestamp}
        onBackToDashboard={handleBackToLearning}
      />
    );
  }

  if (quizState === "failed" && machine) {
    return (
      <DoNotOperate
        machineName={machine.name}
        onBackToDashboard={handleBackToLearning}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={profile?.full_name} isAdmin={isAdmin} />

      <main className="pt-20 md:pt-24 pb-8 px-4 max-w-4xl mx-auto">
        {quizState === "category" && machine && (
          <div className="pt-8">
            <Button
              variant="ghost"
              onClick={handleBackToLearning}
              className="mb-6 -ml-2"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Learning Environment
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
