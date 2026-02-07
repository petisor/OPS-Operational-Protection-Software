import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Truck,
  Construction,
  Tractor,
  Plus,
  Trash2,
} from "lucide-react";

const iconOptions = [
  { value: "truck", label: "Truck", icon: Truck },
  { value: "construction", label: "Construction", icon: Construction },
  { value: "tractor", label: "Tractor", icon: Tractor },
];

export default function AdminUpload() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("truck");
  const [commonInjury, setCommonInjury] = useState("");
  const [safetyWarning, setSafetyWarning] = useState("");
  const [questions, setQuestions] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
  ]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [user, isAdmin, loading, navigate]);

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, ""]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !commonInjury || !safetyWarning) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const validQuestions = questions.filter((q) => q.trim());
    if (validQuestions.length < 3) {
      toast({
        title: "Not Enough Questions",
        description: "Please add at least 3 safety questions",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Create machine
      const { data: machine, error: machineError } = await supabase
        .from("machines")
        .insert({
          name,
          description: description || null,
          icon,
          common_injury: commonInjury,
          safety_warning: safetyWarning,
        })
        .select()
        .single();

      if (machineError) throw machineError;

      // Create questions
      const questionRows = validQuestions.map((q, index) => ({
        machine_id: machine.id,
        question: q.trim(),
        order_index: index + 1,
      }));

      const { error: questionsError } = await supabase
        .from("safety_questions")
        .insert(questionRows);

      if (questionsError) throw questionsError;

      toast({
        title: "Success",
        description: "Machine created successfully",
      });

      navigate("/admin/machines");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={profile?.full_name} isAdmin={isAdmin} />

      <main className="pt-20 md:pt-24 pb-8 px-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Admin
          </Button>
          <h1 className="text-3xl md:text-4xl font-black">Add New Machine</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Create a new machine and define its safety checklist.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="card-industrial p-6 space-y-4">
            <h2 className="text-xl font-bold">Basic Information</h2>

            <div className="space-y-2">
              <Label className="text-lg">Machine Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-industrial"
                placeholder="e.g., Crane Operator"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-lg">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the equipment"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-lg">Icon</Label>
              <div className="flex gap-2">
                {iconOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIcon(opt.value)}
                    className={`card-industrial p-4 ${
                      icon === opt.value ? "selected" : ""
                    }`}
                  >
                    <opt.icon className="h-8 w-8" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Safety Info */}
          <div className="card-industrial p-6 space-y-4">
            <h2 className="text-xl font-bold">Safety Information</h2>

            <div className="space-y-2">
              <Label className="text-lg">Common Injury Type *</Label>
              <Input
                value={commonInjury}
                onChange={(e) => setCommonInjury(e.target.value)}
                className="input-industrial"
                placeholder="e.g., Crushing Hazard"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-lg">Safety Warning Message *</Label>
              <Textarea
                value={safetyWarning}
                onChange={(e) => setSafetyWarning(e.target.value)}
                placeholder="Critical warning shown before inspection"
                className="min-h-[100px]"
                required
              />
            </div>
          </div>

          {/* Safety Questions */}
          <div className="card-industrial p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Safety Checklist Questions</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuestion}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            <p className="text-muted-foreground">
              Add at least 3 yes/no safety questions. Each question should verify
              a critical safety aspect.
            </p>

            <div className="space-y-3">
              {questions.map((question, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={question}
                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                    className="input-industrial"
                    placeholder={`Question ${index + 1}: e.g., "Is the safety guard in place?"`}
                  />
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(index)}
                    >
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            size="full"
            disabled={saving}
            className="uppercase font-bold"
          >
            {saving ? "Creating Machine..." : "Create Machine"}
          </Button>
        </form>
      </main>
    </div>
  );
}
