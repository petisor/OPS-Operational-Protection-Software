import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Sparkles,
  BookOpen,
  Plus,
  Pencil,
} from "lucide-react";

interface Machine {
  id: string;
  name: string;
}

interface Warning {
  id: string;
  machine_id: string;
  title: string;
  content: string;
  severity: string;
  order_index: number;
  is_approved: boolean;
  created_at: string;
}

interface Instruction {
  id: string;
  machine_id: string;
  step_number: number;
  title: string;
  content: string;
}

const severityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function AdminWarnings() {
  const { machineId } = useParams<{ machineId: string }>();
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState<"instructions" | "warnings" | null>(null);
  
  // Warning form state
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [editingWarning, setEditingWarning] = useState<Warning | null>(null);
  const [warningForm, setWarningForm] = useState({
    title: "",
    content: "",
    severity: "medium",
  });
  const [savingWarning, setSavingWarning] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      } else if (machineId) {
        fetchData();
      }
    }
  }, [user, isAdmin, loading, machineId, navigate]);

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
      navigate("/admin/machines");
      return;
    }

    setMachine(machineData);

    // Fetch warnings (including unapproved for admins)
    const { data: warningsData } = await supabase
      .from("machine_warnings")
      .select("*")
      .eq("machine_id", machineId)
      .order("order_index");

    setWarnings(warningsData || []);

    // Fetch instructions
    const { data: instructionsData } = await supabase
      .from("machine_instructions")
      .select("*")
      .eq("machine_id", machineId)
      .order("step_number");

    setInstructions(instructionsData || []);

    setLoadingData(false);
  };

  const handleGenerateInstructions = async () => {
    if (!machine) return;

    setGenerating("instructions");

    try {
      const response = await supabase.functions.invoke("generate-instructions", {
        body: { machineId: machine.id, machineName: machine.name },
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: "Instructions Generated",
        description: `Generated ${response.data.count} instruction steps`,
      });

      fetchData();
    } catch (error) {
      console.error("Error generating instructions:", error);
      toast({
        title: "Error",
        description: "Failed to generate instructions",
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateWarnings = async () => {
    if (!machine) return;

    setGenerating("warnings");

    try {
      const response = await supabase.functions.invoke("generate-warnings", {
        body: { machineId: machine.id, machineName: machine.name },
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: "Warnings Generated",
        description: `Generated ${response.data.count} warnings (pending approval)`,
      });

      fetchData();
    } catch (error) {
      console.error("Error generating warnings:", error);
      toast({
        title: "Error",
        description: "Failed to generate warnings",
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
    }
  };

  const handleApproveWarning = async (warningId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("machine_warnings")
      .update({
        is_approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", warningId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve warning",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Approved",
        description: "Warning is now published",
      });
      fetchData();
    }
  };

  const handleRejectWarning = async (warningId: string) => {
    const { error } = await supabase
      .from("machine_warnings")
      .delete()
      .eq("id", warningId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete warning",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Warning removed",
      });
      fetchData();
    }
  };

  const handleApproveAll = async () => {
    if (!user) return;

    const pendingIds = warnings.filter((w) => !w.is_approved).map((w) => w.id);

    if (pendingIds.length === 0) return;

    const { error } = await supabase
      .from("machine_warnings")
      .update({
        is_approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .in("id", pendingIds);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve warnings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "All Approved",
        description: `${pendingIds.length} warnings are now published`,
      });
      fetchData();
    }
  };

  const openAddWarningDialog = () => {
    setEditingWarning(null);
    setWarningForm({ title: "", content: "", severity: "medium" });
    setWarningDialogOpen(true);
  };

  const openEditWarningDialog = (warning: Warning) => {
    setEditingWarning(warning);
    setWarningForm({
      title: warning.title,
      content: warning.content,
      severity: warning.severity,
    });
    setWarningDialogOpen(true);
  };

  const handleSaveWarning = async () => {
    if (!machineId || !user) return;
    if (!warningForm.title.trim() || !warningForm.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    setSavingWarning(true);

    try {
      if (editingWarning) {
        // Update existing warning
        const { error } = await supabase
          .from("machine_warnings")
          .update({
            title: warningForm.title.trim(),
            content: warningForm.content.trim(),
            severity: warningForm.severity,
          })
          .eq("id", editingWarning.id);

        if (error) throw error;

        toast({
          title: "Warning Updated",
          description: "Changes saved successfully",
        });
      } else {
        // Create new warning
        const maxOrderIndex = warnings.reduce((max, w) => Math.max(max, w.order_index), -1);
        
        const { error } = await supabase
          .from("machine_warnings")
          .insert({
            machine_id: machineId,
            title: warningForm.title.trim(),
            content: warningForm.content.trim(),
            severity: warningForm.severity,
            order_index: maxOrderIndex + 1,
            is_approved: true, // Manual warnings are auto-approved
            approved_by: user.id,
            approved_at: new Date().toISOString(),
          });

        if (error) throw error;

        toast({
          title: "Warning Added",
          description: "New warning created and published",
        });
      }

      setWarningDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save warning",
        variant: "destructive",
      });
    } finally {
      setSavingWarning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  const pendingWarnings = warnings.filter((w) => !w.is_approved);
  const approvedWarnings = warnings.filter((w) => w.is_approved);

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={profile?.full_name} isAdmin={isAdmin} />

      <main className="pt-20 md:pt-24 pb-8 px-4 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/machines")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Machines
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            Manage Content: {machine?.name}
          </h1>
          <p className="text-muted-foreground">
            Generate and approve AI content for this machine
          </p>
        </div>

        <Tabs defaultValue="warnings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="warnings" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings ({warnings.length})
            </TabsTrigger>
            <TabsTrigger value="instructions" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Instructions ({instructions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="warnings" className="space-y-6">
            <div className="flex gap-4 flex-wrap">
              <Button onClick={openAddWarningDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Warning
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateWarnings}
                disabled={generating !== null}
              >
                {generating === "warnings" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate with AI
              </Button>
              {pendingWarnings.length > 0 && (
                <Button variant="outline" onClick={handleApproveAll}>
                  <Check className="h-4 w-4 mr-2" />
                  Approve All ({pendingWarnings.length})
                </Button>
              )}
            </div>

            {pendingWarnings.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  Pending Approval ({pendingWarnings.length})
                </h3>
                <div className="space-y-4">
                  {pendingWarnings.map((warning) => (
                    <Card key={warning.id} className="border-amber-500/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Badge variant={getSeverityColor(warning.severity)}>
                              {warning.severity.toUpperCase()}
                            </Badge>
                            <CardTitle className="text-lg mt-2">
                              {warning.title}
                            </CardTitle>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => openEditWarningDialog(warning)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleApproveWarning(warning.id)}
                              title="Approve"
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleRejectWarning(warning.id)}
                              title="Reject"
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {warning.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {approvedWarnings.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  Published ({approvedWarnings.length})
                </h3>
                <div className="space-y-4">
                  {approvedWarnings.map((warning) => (
                    <Card key={warning.id} className="border-green-500/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Badge variant={getSeverityColor(warning.severity)}>
                              {warning.severity.toUpperCase()}
                            </Badge>
                            <CardTitle className="text-lg mt-2">
                              {warning.title}
                            </CardTitle>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditWarningDialog(warning)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRejectWarning(warning.id)}
                              title="Delete"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {warning.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {warnings.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No warnings yet. Add one manually or generate with AI!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="instructions" className="space-y-6">
            <Button
              onClick={handleGenerateInstructions}
              disabled={generating !== null}
            >
              {generating === "instructions" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Instructions
            </Button>

            {instructions.length > 0 ? (
              <div className="space-y-4">
                {instructions.map((inst) => (
                  <Card key={inst.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                          {inst.step_number}
                        </div>
                        <CardTitle className="text-lg">{inst.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {inst.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No instructions yet. Generate some using AI!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add/Edit Warning Dialog */}
        <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingWarning ? "Edit Warning" : "Add Warning"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-lg">Title</Label>
                <Input
                  value={warningForm.title}
                  onChange={(e) =>
                    setWarningForm({ ...warningForm, title: e.target.value })
                  }
                  placeholder="Warning title..."
                  className="input-industrial"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-lg">Severity</Label>
                <Select
                  value={warningForm.severity}
                  onValueChange={(value) =>
                    setWarningForm({ ...warningForm, severity: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-lg">Content</Label>
                <Textarea
                  value={warningForm.content}
                  onChange={(e) =>
                    setWarningForm({ ...warningForm, content: e.target.value })
                  }
                  placeholder="Describe the warning in detail..."
                  className="min-h-[120px]"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setWarningDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveWarning}
                  disabled={savingWarning}
                  className="flex-1"
                >
                  {savingWarning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingWarning ? (
                    "Save Changes"
                  ) : (
                    "Add Warning"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
