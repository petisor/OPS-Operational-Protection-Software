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
import { MachineSearch } from "@/components/MachineSearch";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  QrCode,
  Calendar,
  Users,
  FileText,
  Truck,
  Construction,
  Tractor,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";

interface Machine {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  common_injury: string;
  safety_warning: string;
  manual_url: string | null;
  recertification_days: number;
  question_count: number;
}

interface SafetyLog {
  id: string;
  employee_id: string;
  timestamp: string;
  status: string;
  category: string | null;
  profiles?: {
    full_name: string;
  };
}

interface MachineAccess {
  user_id: string;
  profiles?: {
    full_name: string;
    employee_id: string | null;
  };
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
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [settingsMachine, setSettingsMachine] = useState<Machine | null>(null);
  const [qrMachine, setQrMachine] = useState<Machine | null>(null);
  const [employeesMachine, setEmployeesMachine] = useState<Machine | null>(null);
  const [machineLogs, setMachineLogs] = useState<SafetyLog[]>([]);
  const [machineAccess, setMachineAccess] = useState<MachineAccess[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
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
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("name");

    if (!error && data) {
      setMachines(data);
      setFilteredMachines(data);
    }
  };

  const fetchMachineLogs = async (machineId: string) => {
    // Fetch logs first
    const { data: logs, error } = await supabase
      .from("safety_logs")
      .select("*")
      .eq("machine_id", machineId)
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error || !logs) {
      setMachineLogs([]);
      return;
    }

    // Fetch profiles for these employees
    const employeeIds = [...new Set(logs.map((log) => log.employee_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", employeeIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

    const logsWithProfiles = logs.map((log) => ({
      ...log,
      profiles: { full_name: profileMap.get(log.employee_id) || "Unknown" },
    }));

    setMachineLogs(logsWithProfiles as SafetyLog[]);
  };

  const fetchMachineAccess = async (machineId: string) => {
    // Fetch access records
    const { data: access, error } = await supabase
      .from("machine_access")
      .select("user_id")
      .eq("machine_id", machineId);

    if (error || !access) {
      setMachineAccess([]);
      return;
    }

    // Fetch profiles for these users
    const userIds = access.map((a) => a.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, employee_id")
      .in("user_id", userIds);

    const accessWithProfiles = access.map((a) => {
      const profile = profiles?.find((p) => p.user_id === a.user_id);
      return {
        user_id: a.user_id,
        profiles: profile
          ? { full_name: profile.full_name, employee_id: profile.employee_id }
          : undefined,
      };
    });

    setMachineAccess(accessWithProfiles as MachineAccess[]);
  };

  const handleViewEmployees = async (machine: Machine) => {
    setEmployeesMachine(machine);
    await Promise.all([fetchMachineLogs(machine.id), fetchMachineAccess(machine.id)]);
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

  const handleSaveSettings = async () => {
    if (!settingsMachine) return;
    setSaving(true);

    const { error } = await supabase
      .from("machines")
      .update({
        recertification_days: settingsMachine.recertification_days,
        question_count: settingsMachine.question_count,
      })
      .eq("id", settingsMachine.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
      setSettingsMachine(null);
      fetchMachines();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this machine? This action cannot be undone.")) return;

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

        {/* Search */}
        <MachineSearch onSearch={setSearchQuery} />

        {/* Machine List */}
        <div className="space-y-4">
          {filteredMachines.map((machine) => {
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
                      <p className="text-muted-foreground text-sm">
                        {machine.description}
                      </p>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Recert: {machine.recertification_days} days</span>
                        <span>Questions: {machine.question_count}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQrMachine(machine)}
                      title="QR Code"
                    >
                      <QrCode className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleViewEmployees(machine)}
                      title="View Employees"
                    >
                      <Users className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSettingsMachine(machine)}
                      title="Settings"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingMachine(machine)}
                      title="Edit"
                    >
                      <Pencil className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(machine.id)}
                      title="Delete"
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

        {/* Settings Dialog */}
        <Dialog
          open={!!settingsMachine}
          onOpenChange={() => setSettingsMachine(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {settingsMachine?.name} Settings
              </DialogTitle>
            </DialogHeader>

            {settingsMachine && (
              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Recertification Period (Days)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={settingsMachine.recertification_days}
                    onChange={(e) =>
                      setSettingsMachine({
                        ...settingsMachine,
                        recertification_days: parseInt(e.target.value) || 30,
                      })
                    }
                    className="input-industrial"
                  />
                  <p className="text-sm text-muted-foreground">
                    How often employees must redo the safety check
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Questions per Quiz
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={settingsMachine.question_count}
                    onChange={(e) =>
                      setSettingsMachine({
                        ...settingsMachine,
                        question_count: parseInt(e.target.value) || 5,
                      })
                    }
                    className="input-industrial"
                  />
                  <p className="text-sm text-muted-foreground">
                    Number of questions shown per quiz session
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSettingsMachine(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Employees Dialog */}
        <Dialog
          open={!!employeesMachine}
          onOpenChange={() => setEmployeesMachine(null)}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {employeesMachine?.name} - Employees
              </DialogTitle>
            </DialogHeader>

            {employeesMachine && (
              <div className="space-y-6 mt-4">
                {/* Assigned Employees */}
                <div>
                  <h3 className="font-bold text-lg mb-3">Assigned Employees ({machineAccess.length})</h3>
                  {machineAccess.length > 0 ? (
                    <div className="space-y-2">
                      {machineAccess.map((access) => (
                        <div key={access.user_id} className="card-industrial p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold">{access.profiles?.full_name || "Unknown"}</p>
                            {access.profiles?.employee_id && (
                              <p className="text-sm text-muted-foreground">
                                ID: {access.profiles.employee_id}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No employees assigned</p>
                  )}
                </div>

                {/* Activity Log */}
                <div>
                  <h3 className="font-bold text-lg mb-3">Recent Activity</h3>
                  {machineLogs.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {machineLogs.map((log) => (
                        <div
                          key={log.id}
                          className="card-industrial p-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold">{log.profiles?.full_name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {log.category && (
                              <span className="text-xs bg-muted px-2 py-1 rounded">
                                {log.category}
                              </span>
                            )}
                            <span
                              className={`text-sm font-bold ${
                                log.status === "safe" ? "text-success" : "text-destructive"
                              }`}
                            >
                              {log.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No activity logs</p>
                  )}
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
