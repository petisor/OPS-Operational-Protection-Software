import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { EquipmentCard } from "@/components/EquipmentCard";
import { SafetyWarningModal } from "@/components/SafetyWarningModal";
import { SafetyQuiz } from "@/components/SafetyQuiz";
import { SafetySuccess } from "@/components/SafetySuccess";
import { DoNotOperate } from "@/components/DoNotOperate";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, Clock, ArrowRight } from "lucide-react";

interface Machine {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  common_injury: string;
  safety_warning: string;
}

interface Question {
  id: string;
  question: string;
  order_index: number;
}

type QuizState = "select" | "warning" | "quiz" | "success" | "failed";

export default function Dashboard() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizState, setQuizState] = useState<QuizState>("select");
  const [timestamp, setTimestamp] = useState<Date>(new Date());

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchMachines();
  }, [isAdmin, user]);

  const fetchMachines = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("name");

    if (!error && data) {
      setMachines(data);
    }
  };

  const fetchQuestions = async (machineId: string) => {
    const { data, error } = await supabase
      .from("safety_questions")
      .select("*")
      .eq("machine_id", machineId)
      .order("order_index");

    if (!error && data) {
      setQuestions(data);
    }
  };

  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine);
  };

  const handleStartInspection = async () => {
    if (selectedMachine) {
      await fetchQuestions(selectedMachine.id);
      setQuizState("warning");
    }
  };

  const handleAcknowledgeWarning = () => {
    setQuizState("quiz");
  };

  const handleQuizComplete = async () => {
    const now = new Date();
    setTimestamp(now);

    // Log to database
    if (user && selectedMachine) {
      await supabase.from("safety_logs").insert({
        employee_id: user.id,
        machine_id: selectedMachine.id,
        status: "safe",
      });
    }

    setQuizState("success");
  };

  const handleQuizFail = () => {
    setQuizState("failed");
  };

  const handleBackToDashboard = () => {
    setQuizState("select");
    setSelectedMachine(null);
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
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-black mb-2">
                {getGreeting()}, {profile?.full_name || "Worker"}
              </h1>
              <p className="text-lg text-muted-foreground">
                Complete your equipment safety check before starting work.
              </p>
            </div>

            {/* Equipment Selection */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4 uppercase text-muted-foreground">
                Select Equipment for Inspection
              </h2>

              {machines.length === 0 ? (
                <div className="card-industrial p-8 text-center">
                  <p className="text-lg text-muted-foreground mb-4">
                    No equipment has been assigned to you yet.
                  </p>
                  <p className="text-muted-foreground">
                    Contact your administrator to get equipment access.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {machines.map((machine) => (
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

            {/* Start Button */}
            {selectedMachine && (
              <Button
                onClick={handleStartInspection}
                size="full"
                variant="default"
                className="uppercase font-black tracking-wide animate-slide-up"
              >
                Start Safety Inspection
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
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
        ) : quizState === "quiz" ? (
          <div className="pt-8">
            <SafetyQuiz
              questions={questions}
              onComplete={handleQuizComplete}
              onFail={handleQuizFail}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
