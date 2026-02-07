import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, CheckCircle, ChevronRight, ChevronLeft, Pencil, Save, X, Plus, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const { t } = useLanguage();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState<Instruction[]>([]);
  const [saving, setSaving] = useState(false);

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
    setEditedInstructions(instructionsData || []);
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

  const handleStartEdit = () => {
    setEditedInstructions([...instructions]);
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditedInstructions([...instructions]);
    setEditMode(false);
  };

  const updateInstruction = (index: number, field: "title" | "content", value: string) => {
    const updated = [...editedInstructions];
    updated[index] = { ...updated[index], [field]: value };
    setEditedInstructions(updated);
  };

  const addInstruction = () => {
    const newInstruction: Instruction = {
      id: `new-${Date.now()}`,
      step_number: editedInstructions.length + 1,
      title: "",
      content: "",
    };
    setEditedInstructions([...editedInstructions, newInstruction]);
  };

  const removeInstruction = (index: number) => {
    const updated = editedInstructions.filter((_, i) => i !== index);
    // Re-number steps
    const renumbered = updated.map((inst, i) => ({ ...inst, step_number: i + 1 }));
    setEditedInstructions(renumbered);
  };

  const handleSaveInstructions = async () => {
    if (!machineId) return;

    const validInstructions = editedInstructions.filter(inst => inst.title.trim() && inst.content.trim());
    
    if (validInstructions.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one instruction with title and content",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Delete existing instructions
      await supabase
        .from("machine_instructions")
        .delete()
        .eq("machine_id", machineId);

      // Insert updated instructions
      const instructionsToInsert = validInstructions.map((inst, index) => ({
        machine_id: machineId,
        step_number: index + 1,
        title: inst.title.trim(),
        content: inst.content.trim(),
      }));

      const { error } = await supabase
        .from("machine_instructions")
        .insert(instructionsToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Instructions saved successfully",
      });

      setEditMode(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save instructions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold">{t("common.loading")}</div>
      </div>
    );
  }

  // Admin Edit Mode
  if (editMode && isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar userName={profile?.full_name} isAdmin={isAdmin} />

        <main className="pt-20 md:pt-24 pb-8 px-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-black">
              {t("instructions.editInstructions")}: {machine?.name}
            </h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                <X className="h-5 w-5 mr-2" />
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSaveInstructions} disabled={saving}>
                <Save className="h-5 w-5 mr-2" />
                {saving ? t("instructions.saving") : t("common.save")}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {editedInstructions.map((instruction, index) => (
              <Card key={instruction.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <Input
                      value={instruction.title}
                      onChange={(e) => updateInstruction(index, "title", e.target.value)}
                      placeholder={t("instructions.stepTitle")}
                      className="flex-1 font-bold text-lg"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInstruction(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={instruction.content}
                    onChange={(e) => updateInstruction(index, "content", e.target.value)}
                    placeholder={t("instructions.stepContent")}
                    className="min-h-[120px]"
                  />
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={addInstruction} className="w-full">
              <Plus className="h-5 w-5 mr-2" />
              {t("instructions.addStep")}
            </Button>
          </div>
        </main>
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
            {t("learn.backToLearn")}
          </Button>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">{t("instructions.noInstructions")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("instructions.notGenerated")}
            </p>
            {isAdmin && (
              <Button onClick={handleStartEdit}>
                <Plus className="h-5 w-5 mr-2" />
                {t("instructions.addInstructions")}
              </Button>
            )}
            {!isAdmin && (
              <Button onClick={() => navigate(`/learn/${machineId}`)}>
                {t("common.goBack")}
              </Button>
            )}
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
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/learn/${machineId}`)}
            className="-ml-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t("learn.backToLearn")}
          </Button>
          
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleStartEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              {t("instructions.editInstructions")}
            </Button>
          )}
        </div>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black mb-2">
            {t("instructions.title")}: {machine?.name}
          </h1>
          <div className="flex items-center gap-4">
            <Progress value={progressPercent} className="flex-1" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {t("common.step")} {currentStep + 1} {t("common.of")} {instructions.length}
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
            {t("common.previous")}
          </Button>

          {isLastStep ? (
            <Button onClick={handleComplete} className="flex-1">
              <CheckCircle className="h-5 w-5 mr-2" />
              {t("common.complete")}
            </Button>
          ) : (
            <Button onClick={nextStep} className="flex-1">
              {t("common.next")}
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
