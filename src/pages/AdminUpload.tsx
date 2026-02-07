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
  Sparkles,
  Loader2,
  Upload,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const iconOptions = [
  { value: "truck", label: "Truck", icon: Truck },
  { value: "construction", label: "Construction", icon: Construction },
  { value: "tractor", label: "Tractor", icon: Tractor },
];

interface GeneratedQuestion {
  question: string;
  correct_answer: boolean;
  order_index: number;
}

export default function AdminUpload() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState<string | null>(null);

  // Machine details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("truck");
  const [commonInjury, setCommonInjury] = useState("");
  const [safetyWarning, setSafetyWarning] = useState("");
  const [recertificationDays, setRecertificationDays] = useState(30);
  const [questionCount, setQuestionCount] = useState(5);

  // Manual content
  const [manualContent, setManualContent] = useState("");
  const [manualFile, setManualFile] = useState<File | null>(null);

  // Questions
  const [safetyQuestions, setSafetyQuestions] = useState<GeneratedQuestion[]>([]);
  const [usageQuestions, setUsageQuestions] = useState<GeneratedQuestion[]>([]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [user, isAdmin, loading, navigate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setManualFile(file);

    // Read file content if it's text-based
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = await file.text();
      setManualContent(text);
      toast({
        title: "Manual Loaded",
        description: "Text content extracted from file",
      });
    } else {
      toast({
        title: "File Selected",
        description: "File will be uploaded when you create the machine",
      });
    }
  };

  const generateQuestions = async (category: "safety" | "usage") => {
    if (!name) {
      toast({
        title: "Missing Machine Name",
        description: "Please enter a machine name first",
        variant: "destructive",
      });
      return;
    }

    setGeneratingQuestions(category);

    try {
      const response = await supabase.functions.invoke("generate-questions", {
        body: {
          machineName: name,
          manualContent: manualContent || undefined,
          category,
          count: 30,
        },
      });

      if (response.error) throw response.error;

      const questions = response.data.questions as GeneratedQuestion[];

      if (category === "safety") {
        setSafetyQuestions(questions);
      } else {
        setUsageQuestions(questions);
      }

      toast({
        title: "Questions Generated",
        description: `Generated ${questions.length} ${category} questions`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate questions",
        variant: "destructive",
      });
    } finally {
      setGeneratingQuestions(null);
    }
  };

  const addManualQuestion = (category: "safety" | "usage") => {
    const newQuestion: GeneratedQuestion = {
      question: "",
      correct_answer: true,
      order_index: (category === "safety" ? safetyQuestions : usageQuestions).length + 1,
    };

    if (category === "safety") {
      setSafetyQuestions([...safetyQuestions, newQuestion]);
    } else {
      setUsageQuestions([...usageQuestions, newQuestion]);
    }
  };

  const updateQuestion = (
    category: "safety" | "usage",
    index: number,
    field: "question" | "correct_answer",
    value: string | boolean
  ) => {
    const questions = category === "safety" ? [...safetyQuestions] : [...usageQuestions];
    questions[index] = { ...questions[index], [field]: value };

    if (category === "safety") {
      setSafetyQuestions(questions);
    } else {
      setUsageQuestions(questions);
    }
  };

  const removeQuestion = (category: "safety" | "usage", index: number) => {
    if (category === "safety") {
      setSafetyQuestions(safetyQuestions.filter((_, i) => i !== index));
    } else {
      setUsageQuestions(usageQuestions.filter((_, i) => i !== index));
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

    const validSafetyQuestions = safetyQuestions.filter((q) => q.question.trim());
    const validUsageQuestions = usageQuestions.filter((q) => q.question.trim());

    if (validSafetyQuestions.length < 3) {
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
          recertification_days: recertificationDays,
          question_count: questionCount,
        })
        .select()
        .single();

      if (machineError) throw machineError;

      // Upload manual file if exists
      if (manualFile) {
        const filePath = `${machine.id}/${manualFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("machine-manuals")
          .upload(filePath, manualFile);

        if (uploadError) {
          console.error("Manual upload error:", uploadError);
        } else {
          // Update machine with manual URL
          await supabase
            .from("machines")
            .update({ manual_url: filePath })
            .eq("id", machine.id);
        }
      }

      // Create safety questions
      if (validSafetyQuestions.length > 0) {
        const safetyQuestionRows = validSafetyQuestions.map((q, index) => ({
          machine_id: machine.id,
          question: q.question.trim(),
          correct_answer: q.correct_answer,
          order_index: index + 1,
          category: "safety" as const,
        }));

        const { error: safetyError } = await supabase
          .from("safety_questions")
          .insert(safetyQuestionRows);

        if (safetyError) throw safetyError;
      }

      // Create usage questions
      if (validUsageQuestions.length > 0) {
        const usageQuestionRows = validUsageQuestions.map((q, index) => ({
          machine_id: machine.id,
          question: q.question.trim(),
          correct_answer: q.correct_answer,
          order_index: index + 1,
          category: "usage" as const,
        }));

        const { error: usageError } = await supabase
          .from("safety_questions")
          .insert(usageQuestionRows);

        if (usageError) throw usageError;
      }

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

  const renderQuestionList = (
    category: "safety" | "usage",
    questions: GeneratedQuestion[]
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          {questions.length} questions added. Toggle to set if YES or NO is the correct answer.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addManualQuestion(category)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Manual
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => generateQuestions(category)}
            disabled={generatingQuestions !== null}
          >
            {generatingQuestions === category ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Generate with AI
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {questions.map((question, index) => (
          <div key={index} className="card-industrial p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  value={question.question}
                  onChange={(e) =>
                    updateQuestion(category, index, "question", e.target.value)
                  }
                  placeholder={`Question ${index + 1}`}
                  className="input-industrial mb-2"
                />
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Correct answer:
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestion(category, index, "correct_answer", true)
                      }
                      className={`px-4 py-2 rounded-sm text-sm font-bold transition-colors ${
                        question.correct_answer
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestion(category, index, "correct_answer", false)
                      }
                      className={`px-4 py-2 rounded-sm text-sm font-bold transition-colors ${
                        !question.correct_answer
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeQuestion(category, index)}
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No questions yet. Add manually or generate with AI.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={profile?.full_name} isAdmin={isAdmin} />

      <main className="pt-20 md:pt-24 pb-8 px-4 max-w-3xl mx-auto">
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
            Create a new machine and generate its safety & usage quizzes with AI.
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-lg">Recertification (Days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={recertificationDays}
                  onChange={(e) => setRecertificationDays(parseInt(e.target.value) || 30)}
                  className="input-industrial"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-lg">Questions per Quiz</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                  className="input-industrial"
                />
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

          {/* Manual Upload */}
          <div className="card-industrial p-6 space-y-4">
            <h2 className="text-xl font-bold">Machine Manual (Optional)</h2>
            <p className="text-muted-foreground">
              Upload a manual to help AI generate more accurate questions.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex-1">
                  <div className="card-industrial p-4 flex items-center justify-center gap-3 cursor-pointer hover:border-primary transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="font-medium">
                      {manualFile ? manualFile.name : "Choose file..."}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <Label className="text-lg">Or paste manual content:</Label>
                <Textarea
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="Paste relevant safety and operation content here..."
                  className="min-h-[150px]"
                />
              </div>
            </div>
          </div>

          {/* Questions Tabs */}
          <div className="card-industrial p-6">
            <Tabs defaultValue="safety" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="safety" className="text-lg font-bold">
                  Safety Questions ({safetyQuestions.length})
                </TabsTrigger>
                <TabsTrigger value="usage" className="text-lg font-bold">
                  Usage Questions ({usageQuestions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="safety">
                <div className="space-y-4">
                  <div className="bg-warning/20 border border-warning rounded-sm p-4">
                    <h3 className="font-bold text-warning mb-2">Safety Questions Focus</h3>
                    <p className="text-sm text-muted-foreground">
                      Questions about Warnings, Cautions, Danger zones, Safety precautions,
                      PPE requirements, and Emergency procedures.
                    </p>
                  </div>
                  {renderQuestionList("safety", safetyQuestions)}
                </div>
              </TabsContent>

              <TabsContent value="usage">
                <div className="space-y-4">
                  <div className="bg-primary/20 border border-primary rounded-sm p-4">
                    <h3 className="font-bold text-primary mb-2">Usage Questions Focus</h3>
                    <p className="text-sm text-muted-foreground">
                      Questions about Operation procedures, How to use controls,
                      Proper usage instructions, and Maintenance indicators.
                    </p>
                  </div>
                  {renderQuestionList("usage", usageQuestions)}
                </div>
              </TabsContent>
            </Tabs>
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
