import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Image as ImageIcon, Loader2, Wand2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Machine {
  id: string;
  name: string;
  description: string | null;
}

interface Instruction {
  id: string;
  title: string;
  content: string;
}

export default function MachineVisuals() {
  const { machineId } = useParams<{ machineId: string }>();
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
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
    const { data: machineData, error: machineError } = await supabase
      .from("machines")
      .select("id, name, description")
      .eq("id", machineId)
      .single();

    if (machineError || !machineData) {
      console.error("Machine not found:", machineError);
      navigate("/");
      return;
    }

    setMachine(machineData);

    // Fetch instructions for context
    const { data: instructionsData } = await supabase
      .from("machine_instructions")
      .select("id, title, content")
      .eq("machine_id", machineId)
      .order("step_number");

    if (instructionsData) {
      setInstructions(instructionsData);
    }

    setLoadingData(false);
  };

  const generateVisual = async (userPrompt?: string) => {
    if (!machine) return;

    setGenerating(true);
    try {
      const response = await supabase.functions.invoke("generate-visuals", {
        body: {
          machineId: machine.id,
          machineName: machine.name,
          instructions: instructions,
          userPrompt: userPrompt || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setGeneratedImage(response.data.imageUrl);
      setImageDescription(response.data.description);
      
      toast({
        title: "Visual Generated",
        description: "Your image has been generated successfully.",
      });
    } catch (error: any) {
      console.error("Error generating visual:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate visual. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateDefault = () => {
    generateVisual();
  };

  const handleGenerateCustom = () => {
    if (!customPrompt.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please describe what you want to see.",
        variant: "destructive",
      });
      return;
    }
    generateVisual(customPrompt);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

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

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            Visual Support
          </h1>
          <p className="text-lg text-muted-foreground">
            {machine?.name} - Generate visual guides based on the manual
          </p>
        </div>

        {/* Generated Image Display */}
        <div className="card-industrial p-6 mb-8">
          {generatedImage ? (
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-sm overflow-hidden">
                <img
                  src={generatedImage}
                  alt="Generated machine visual"
                  className="w-full h-full object-contain"
                />
              </div>
              {imageDescription && (
                <p className="text-muted-foreground">{imageDescription}</p>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-sm flex flex-col items-center justify-center gap-4">
              <ImageIcon className="h-16 w-16 text-muted-foreground" />
              <p className="text-lg text-muted-foreground text-center">
                Generate a visual to see it here
              </p>
            </div>
          )}
        </div>

        {/* Generation Controls */}
        <div className="space-y-6">
          {/* Auto Generate Button */}
          <div className="card-industrial p-6">
            <h3 className="text-xl font-bold mb-4">Auto-Generate from Manual</h3>
            <p className="text-muted-foreground mb-4">
              Generate a visual based on the machine instructions and manual content.
            </p>
            <Button
              onClick={handleGenerateDefault}
              disabled={generating}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5 mr-2" />
                  Generate Machine Visual
                </>
              )}
            </Button>
          </div>

          {/* Custom Prompt */}
          <div className="card-industrial p-6">
            <h3 className="text-xl font-bold mb-4">Custom Visual Request</h3>
            <p className="text-muted-foreground mb-4">
              Describe what you want to see - specific parts, safety procedures, or operational steps.
            </p>
            <div className="space-y-4">
              <Input
                placeholder="e.g., Show the emergency stop button location..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="input-industrial"
              />
              <Button
                onClick={handleGenerateCustom}
                disabled={generating || !customPrompt.trim()}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Generate Custom Visual
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
