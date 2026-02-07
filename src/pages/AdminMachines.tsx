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
  Pencil,
  Trash2,
  QrCode,
  X,
  Truck,
  Construction,
  Tractor,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

interface Machine {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  common_injury: string;
  safety_warning: string;
  manual_url: string | null;
}

const iconOptions = [
  { value: "truck", label: "Truck", icon: Truck },
  { value: "construction", label: "Construction", icon: Construction },
  { value: "tractor", label: "Tractor", icon: Tractor },
];

export default function AdminMachines() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [qrMachine, setQrMachine] = useState<Machine | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      } else {
        fetchMachines();
      }
    }
  }, [user, isAdmin, loading, navigate]);

  const fetchMachines = async () => {
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("name");

    if (!error && data) {
      setMachines(data);
    }
  };

  const handleSave = async () => {
    if (!editingMachine) return;
    setSaving(true);

    const { error } = await supabase
      .from("machines")
      .update({
        name: editingMachine.name,
        description: editingMachine.description,
        icon: editingMachine.icon,
        common_injury: editingMachine.common_injury,
        safety_warning: editingMachine.safety_warning,
      })
      .eq("id", editingMachine.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update machine",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Machine updated successfully",
      });
      setEditingMachine(null);
      fetchMachines();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this machine?")) return;

    const { error } = await supabase.from("machines").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete machine",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Machine deleted successfully",
      });
      fetchMachines();
    }
  };

  const getQRUrl = (machineId: string) => {
    return `${window.location.origin}/inspect/${machineId}`;
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

      <main className="pt-20 md:pt-24 pb-8 px-4 max-w-4xl mx-auto">
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
          <h1 className="text-3xl md:text-4xl font-black">Manage Machines</h1>
        </div>

        {/* Machine List */}
        <div className="space-y-4">
          {machines.map((machine) => {
            const IconComponent =
              iconOptions.find((i) => i.value === machine.icon)?.icon || Truck;

            return (
              <div key={machine.id} className="card-industrial p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-sm bg-muted flex items-center justify-center">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{machine.name}</h3>
                      <p className="text-muted-foreground">
                        {machine.description}
                      </p>
                      <p className="text-sm text-destructive mt-1">
                        Common injury: {machine.common_injury}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQrMachine(machine)}
                    >
                      <QrCode className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingMachine(machine)}
                    >
                      <Pencil className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(machine.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit Dialog */}
        <Dialog
          open={!!editingMachine}
          onOpenChange={() => setEditingMachine(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit Machine</DialogTitle>
            </DialogHeader>

            {editingMachine && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-lg">Name</Label>
                  <Input
                    value={editingMachine.name}
                    onChange={(e) =>
                      setEditingMachine({
                        ...editingMachine,
                        name: e.target.value,
                      })
                    }
                    className="input-industrial"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg">Description</Label>
                  <Textarea
                    value={editingMachine.description || ""}
                    onChange={(e) =>
                      setEditingMachine({
                        ...editingMachine,
                        description: e.target.value,
                      })
                    }
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
                        onClick={() =>
                          setEditingMachine({
                            ...editingMachine,
                            icon: opt.value,
                          })
                        }
                        className={`card-industrial p-4 ${
                          editingMachine.icon === opt.value ? "selected" : ""
                        }`}
                      >
                        <opt.icon className="h-8 w-8" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-lg">Common Injury</Label>
                  <Input
                    value={editingMachine.common_injury}
                    onChange={(e) =>
                      setEditingMachine({
                        ...editingMachine,
                        common_injury: e.target.value,
                      })
                    }
                    className="input-industrial"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg">Safety Warning</Label>
                  <Textarea
                    value={editingMachine.safety_warning}
                    onChange={(e) =>
                      setEditingMachine({
                        ...editingMachine,
                        safety_warning: e.target.value,
                      })
                    }
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditingMachine(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={!!qrMachine} onOpenChange={() => setQrMachine(null)}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {qrMachine?.name} QR Code
              </DialogTitle>
            </DialogHeader>

            {qrMachine && (
              <div className="mt-4">
                <div className="qr-container mx-auto">
                  <QRCodeSVG
                    value={getQRUrl(qrMachine.id)}
                    size={200}
                    level="H"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Scan to start safety inspection for this machine
                </p>
                <p className="text-xs text-muted-foreground mt-2 break-all">
                  {getQRUrl(qrMachine.id)}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
