import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Image as ImageIcon, Loader2, Wand2, Check, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

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

interface MachineVisual {
  id: string;
  image_url: string;
  title: string;
  description: string | null;
  is_approved: boolean;
}

export default function MachineVisuals() {
  const { machineId } = useParams<{ machineId: string }>();
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [visuals, setVisuals] = useState<MachineVisual[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [imageTitle, setImageTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [uploading, setUploading] = useState(false);

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

    // Fetch existing visuals
    const { data: visualsData } = await supabase
      .from("machine_visuals")
      .select("*")
      .eq("machine_id", machineId)
      .order("created_at", { ascending: false });

    if (visualsData) {
      setVisuals(visualsData);
    }

    setLoadingData(false);
  };

  const generateVisual = async () => {
    if (!machine || !isAdmin) return;

    if (!imageTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the image.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const response = await supabase.functions.invoke("generate-visuals", {
        body: {
          machineId: machine.id,
          machineName: machine.name,
          instructions: instructions,
          userPrompt: customPrompt || null,
          isAdmin: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Save the generated visual to database
      const { error: insertError } = await supabase
        .from("machine_visuals")
        .insert({
          machine_id: machine.id,
          image_url: response.data.imageUrl,
          title: imageTitle,
          description: response.data.description,
          is_approved: false,
        });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Visual Generated",
        description: "The image has been generated and is pending approval.",
      });

      setCustomPrompt("");
      setImageTitle("");
      fetchData();
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

  const handleApprove = async (visualId: string) => {
    const { error } = await supabase
      .from("machine_visuals")
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      })
      .eq("id", visualId);

    if (error) {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
    } else {
      toast({ title: "Approved", description: "Visual is now visible to workers" });
      fetchData();
    }
  };

  const handleReject = async (visualId: string) => {
    const { error } = await supabase
      .from("machine_visuals")
      .delete()
      .eq("id", visualId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Visual has been removed" });
      fetchData();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !machine || !isAdmin) return;

    const file = e.target.files[0];
    if (!imageTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the image.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${machine.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("machine-manuals")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("machine-manuals")
        .getPublicUrl(fileName);

      // Save to database
      const { error: insertError } = await supabase
        .from("machine_visuals")
        .insert({
          machine_id: machine.id,
          image_url: urlData.publicUrl,
          title: imageTitle,
          description: customPrompt || null,
          is_approved: false,
        });

      if (insertError) throw insertError;

      toast({ title: "Uploaded", description: "Image uploaded and pending approval" });
      setImageTitle("");
      setCustomPrompt("");
      fetchData();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const approvedVisuals = visuals.filter((v) => v.is_approved);
  const pendingVisuals = visuals.filter((v) => !v.is_approved);

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
            {machine?.name} - {isAdmin ? "Manage visual guides" : "View approved visual guides"}
          </p>
        </div>

        {/* Admin: Generate/Upload Section */}
        {isAdmin && (
          <div className="card-industrial p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">Create New Visual</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Image Title *</Label>
                <Input
                  placeholder="e.g., Emergency Stop Location"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  className="input-industrial"
                />
              </div>

              <div className="space-y-2">
                <Label>Description / Generation Prompt</Label>
                <Input
                  placeholder="Describe what you want to see..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="input-industrial"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={generateVisual}
                  disabled={generating || !imageTitle.trim()}
                  className="flex-1"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>

                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading || !imageTitle.trim()}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={uploading || !imageTitle.trim()}
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2" />
                          Upload Image
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Admin: Pending Approval */}
        {isAdmin && pendingVisuals.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Pending Approval ({pendingVisuals.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingVisuals.map((visual) => (
                <div key={visual.id} className="card-industrial p-4">
                  <img
                    src={visual.image_url}
                    alt={visual.title}
                    className="w-full aspect-video object-cover rounded-sm mb-3"
                  />
                  <h4 className="font-bold">{visual.title}</h4>
                  {visual.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {visual.description}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(visual.id)}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(visual.id)}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Visuals */}
        <div>
          <h3 className="text-xl font-bold mb-4">
            {isAdmin ? "Approved Visuals" : "Visual Guides"} ({approvedVisuals.length})
          </h3>
          {approvedVisuals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedVisuals.map((visual) => (
                <div key={visual.id} className="card-industrial p-4">
                  <img
                    src={visual.image_url}
                    alt={visual.title}
                    className="w-full aspect-video object-cover rounded-sm mb-3"
                  />
                  <h4 className="font-bold">{visual.title}</h4>
                  {visual.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {visual.description}
                    </p>
                  )}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(visual.id)}
                      className="mt-3"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card-industrial p-8 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                {isAdmin
                  ? "No approved visuals yet. Generate or upload images above."
                  : "No visual guides available yet. Please check back later."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
