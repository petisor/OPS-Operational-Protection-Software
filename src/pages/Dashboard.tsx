import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { EquipmentCard } from "@/components/EquipmentCard";
import { SafetyWarningModal } from "@/components/SafetyWarningModal";
import { SafetyQuiz } from "@/components/SafetyQuiz";
import { SafetySuccess } from "@/components/SafetySuccess";
import { DoNotOperate } from "@/components/DoNotOperate";
import { MachineSearch } from "@/components/MachineSearch";
import { QuizCategorySelect } from "@/components/QuizCategorySelect";
import { WarningBanner } from "@/components/WarningBanner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, Clock, ArrowRight, ArrowLeft, BookOpen } from "lucide-react";

interface Machine {
  id: string;
  name: string;
  description: string | null;
  icon: string;
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

type QuizState = "select" | "category" | "warning" | "quiz" | "success" | "failed";
type QuizCategory = "safety" | "usage";

export default function Dashboard() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizState, setQuizState] = useState<QuizState>("select");
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchMachines();
  }, [isAdmin, user]);

  useEffect(() => {
    // Filter machines based on search
    if (!searchQuery.trim()) {
      setFilteredMachines(machines);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredMachines(
        machines.filter(
          (m) =>
            m.name.toLowerCase().includes(query) ||
            m.id.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, machines]);

  const fetchMachines = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("name");

    if (!error && data) {
      setMachines(data);
      setFilteredMachines(data);
    }
  };

  const fetchQuestions = async (machineId: string, category: QuizCategory) => {
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

  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine);
  };

  const handleStartInspection = () => {
    if (selectedMachine) {
      setQuizState("category");
    }
  };

  const handleSelectCategory = async (category: QuizCategory) => {
    setSelectedCategory(category);
    if (selectedMachine) {
      await fetchQuestions(selectedMachine.id, category);
      setQuizState("warning");
    }
  };

  const handleAcknowledgeWarning = () => {
    setQuizState("quiz");
  };

  const handleQuizComplete = async (correctAnswers: number, totalQuestions: number) => {
    const now = new Date();
    setTimestamp(now);

    // Log to database with score
    if (user && selectedMachine && selectedCategory) {
      await supabase.from("safety_logs").insert({
        employee_id: user.id,
        machine_id: selectedMachine.id,
        status: "safe",
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        category: selectedCategory,
      });
    }

    setQuizState("success");
  };

  const handleQuizFail = async (correctAnswers: number, totalQuestions: number) => {
    // Log the failure with actual correct count
    if (user && selectedMachine && selectedCategory) {
      await supabase.from("safety_logs").insert({
        employee_id: user.id,
        machine_id: selectedMachine.id,
        status: "failed",
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        category: selectedCategory,
      });
    }
    setQuizState("failed");
  };

  const handleBackToDashboard = () => {
    setQuizState("select");
    setSelectedMachine(null);
    setSelectedCategory(null);
    setQuestions([]);
  };

  const handleBackToCategory = () => {
    setQuizState("category");
    setQuestions([]);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  // Success Screen
  if (quizState === "success" && selectedMachine) {
    return (
      <SafetySuccess
        employeeName={profile?.full_name || "Worker"}
        machineName={selectedMachine.name}
        timestamp={timestamp}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  // Failed Screen
  if (quizState === "failed" && selectedMachine) {
    return (
      <DoNotOperate
        machineName={selectedMachine.name}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={profile?.full_name} isAdmin={isAdmin} />

      {/* Warning Modal */}
      {quizState === "warning" && selectedMachine && (
        <SafetyWarningModal
          machineName={selectedMachine.name}
          commonInjury={selectedMachine.common_injury}
          safetyWarning={selectedMachine.safety_warning}
          onAcknowledge={handleAcknowledgeWarning}
        />
      )}

      <main className="pt-20 md:pt-24 pb-8 px-4 max-w-4xl mx-auto">
        {quizState === "select" ? (
          <>
            {/* Warning Banner */}
            {user && <WarningBanner userId={user.id} />}

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-black mb-2">
                {getGreeting()}, {profile?.full_name || "Worker"}
              </h1>
              <p className="text-lg text-muted-foreground">
                Complete your equipment safety check before starting work.
              </p>
            </div>

            {/* Search Bar */}
            <MachineSearch 
              onSearch={setSearchQuery}
              placeholder="Search machines by name or ID..."
            />

            {/* Equipment Selection */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4 uppercase text-muted-foreground">
                Select Equipment for Inspection
              </h2>

              {filteredMachines.length === 0 ? (
                <div className="card-industrial p-8 text-center">
                  <p className="text-lg text-muted-foreground mb-4">
                    {searchQuery
                      ? "No machines match your search."
                      : "No equipment has been assigned to you yet."}
                  </p>
                  {!searchQuery && (
                    <p className="text-muted-foreground">
                      Contact your administrator to get equipment access.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredMachines.map((machine) => (
                    <EquipmentCard
                      key={machine.id}
                      id={machine.id}
                      name={machine.name}
                      icon={machine.icon}
                      description={machine.description || undefined}
                      selected={selectedMachine?.id === machine.id}
                      onClick={() => handleSelectMachine(machine)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Action Buttons */}
            {selectedMachine && (
              <div className="flex gap-4 animate-slide-up">
                <Button
                  onClick={() => navigate(`/learn/${selectedMachine.id}`)}
                  size="lg"
                  variant="outline"
                  className="flex-1 uppercase font-black tracking-wide"
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  Learn
                </Button>
                <Button
                  onClick={handleStartInspection}
                  size="lg"
                  variant="default"
                  className="flex-1 uppercase font-black tracking-wide"
                >
                  Quick Inspection
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Footer with Date/Time */}
            <footer className="mt-12 pt-6 border-t border-border">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span className="text-lg">{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="text-lg">{format(new Date(), "h:mm a")}</span>
                </div>
              </div>
            </footer>
          </>
        ) : quizState === "category" && selectedMachine ? (
          <div className="pt-8">
            <Button
              variant="ghost"
              onClick={handleBackToDashboard}
              className="mb-6 -ml-2"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Machines
            </Button>
            <QuizCategorySelect
              machineName={selectedMachine.name}
              onSelect={handleSelectCategory}
            />
          </div>
        ) : quizState === "quiz" && selectedMachine ? (
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
              questionCount={selectedMachine.question_count}
              onComplete={handleQuizComplete}
              onFail={handleQuizFail}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
