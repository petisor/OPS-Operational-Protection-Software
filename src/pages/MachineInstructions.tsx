import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Machine {
  id: string;
  name: string;
}

interface Instruction {
  id: string;
  step_number: number;
  title: string;
  content: string;
}

export default function MachineInstructions() {
  const { machineId } = useParams<{ machineId: string }>();
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
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
    if (!machineId) return;

    setLoadingData(true);

    // Fetch machine
    const { data: machineData } = await supabase
      .from("machines")
      .select("id, name")
      .eq("id", machineId)
      .single();

    if (!machineData) {
      navigate("/");
      return;
    }

    setMachine(machineData);

    // Fetch instructions
    const { data: instructionsData } = await supabase
      .from("machine_instructions")
      .select("*")
      .eq("machine_id", machineId)
      .order("step_number");

    setInstructions(instructionsData || []);
    setLoadingData(false);
  };

  const handleComplete = async () => {
    if (!user || !machineId) return;

    // Update progress
    await supabase
      .from("user_learning_progress")
      .upsert({
        user_id: user.id,
        machine_id: machineId,
        instructions_completed: true,
        instructions_completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,machine_id" });

    navigate(`/learn/${machineId}`);
  };

  const nextStep = () => {
    if (currentStep < instructions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (instructions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar userName={profile?.full_name} isAdmin={isAdmin} />
        <main className="pt-20 md:pt-24 pb-8 px-4 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(`/learn/${machineId}`)}
            className="mb-6 -ml-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Learning Environment
          </Button>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">No Instructions Available</h2>
            <p className="text-muted-foreground mb-6">
              Instructions for this machine haven't been generated yet.
            </p>
            <Button onClick={() => navigate(`/learn/${machineId}`)}>
              Go Back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const currentInstruction = instructions[currentStep];
  const progressPercent = ((currentStep + 1) / instructions.length) * 100;
  const isLastStep = currentStep === instructions.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={profile?.full_name} isAdmin={isAdmin} />

      <main className="pt-20 md:pt-24 pb-8 px-4 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(`/learn/${machineId}`)}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Learning Environment
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black mb-2">
            How to Use: {machine?.name}
          </h1>
          <div className="flex items-center gap-4">
            <Progress value={progressPercent} className="flex-1" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Step {currentStep + 1} of {instructions.length}
            </span>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                {currentInstruction.step_number}
              </div>
              <CardTitle className="text-xl">{currentInstruction.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed whitespace-pre-wrap">
              {currentInstruction.content}
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex-1"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Previous
          </Button>

          {isLastStep ? (
            <Button onClick={handleComplete} className="flex-1">
              <CheckCircle className="h-5 w-5 mr-2" />
              Complete
            </Button>
          ) : (
            <Button onClick={nextStep} className="flex-1">
              Next
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
