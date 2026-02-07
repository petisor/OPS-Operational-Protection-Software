import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MachineSearch } from "@/components/MachineSearch";
import {
  ArrowLeft,
  User,
  CheckCircle,
  XCircle,
  Plus,
  Truck,
  AlertTriangle,
  Send,
  Bell,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, subDays, isAfter } from "date-fns";

interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  employee_id: string | null;
}

interface Machine {
  id: string;
  name: string;
  recertification_days: number;
}

interface SafetyLog {
  id: string;
  machine_id: string;
  status: string;
  timestamp: string;
  category: string | null;
  correct_answers: number | null;
  total_questions: number | null;
}

interface MachineAccess {
  machine_id: string;
}

interface WarningAcknowledgment {
  machine_id: string;
  warning_count: number;
  acknowledged_count: number;
}

interface CertificationStatus {
  machineId: string;
  machineName: string;
  lastCheck: Date | null;
  isOverdue: boolean;
  status: "safe" | "failed" | "none";
  warningsAccepted: boolean;
  warningProgress: string;
}

export default function AdminEmployees() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeLogs, setEmployeeLogs] = useState<SafetyLog[]>([]);
  const [employeeAccess, setEmployeeAccess] = useState<string[]>([]);
  const [certificationStatus, setCertificationStatus] = useState<CertificationStatus[]>([]);
  const [warningAcks, setWarningAcks] = useState<WarningAcknowledgment[]>([]);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [accessEmployee, setAccessEmployee] = useState<Employee | null>(null);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [warningEmployee, setWarningEmployee] = useState<Employee | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [warningMachine, setWarningMachine] = useState<string | null>(null);
  const [sendingWarning, setSendingWarning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      } else {
        fetchEmployees();
        fetchMachines();
      }
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredEmployees(
        employees.filter(
          (e) =>
            e.full_name.toLowerCase().includes(query) ||
            e.employee_id?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, employees]);

  const fetchEmployees = async () => {
    if (!profile?.employer_id) return;
    
    // Only fetch workers who have this admin's employer_id
    // Workers store the admin's employer_id in their employee_id field
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("employee_id", profile.employer_id)
      .order("full_name");

    if (!error && profiles) {
      setEmployees(profiles);
      setFilteredEmployees(profiles);
    }
  };

  const fetchMachines = async () => {
    const { data, error } = await supabase
      .from("machines")
      .select("id, name, recertification_days")
      .order("name");

    if (!error && data) {
      setMachines(data);
    }
  };

  const fetchEmployeeLogs = async (employeeId: string) => {
    const { data, error } = await supabase
      .from("safety_logs")
      .select("*")
      .eq("employee_id", employeeId)
      .order("timestamp", { ascending: false })
      .limit(50);

    if (!error && data) {
      setEmployeeLogs(data);
    }
  };

  const fetchEmployeeAccess = async (employeeId: string) => {
    const { data, error } = await supabase
      .from("machine_access")
      .select("machine_id")
      .eq("user_id", employeeId);

    if (!error && data) {
      setEmployeeAccess(data.map((a: MachineAccess) => a.machine_id));
    }
  };

  const fetchWarningAcknowledgments = async (employeeId: string, accessList: string[]) => {
    // Get all approved warnings for machines the employee has access to
    const { data: warnings } = await supabase
      .from("machine_warnings")
      .select("id, machine_id")
      .in("machine_id", accessList)
      .eq("is_approved", true);

    if (!warnings || warnings.length === 0) {
      setWarningAcks([]);
      return;
    }

    // Get acknowledgments for this user
    const { data: acks } = await supabase
      .from("user_warning_acknowledgments")
      .select("warning_id, read_acknowledged, liability_acknowledged")
      .eq("user_id", employeeId)
      .in("warning_id", warnings.map(w => w.id));

    // Group by machine
    const machineWarnings = new Map<string, { total: number; acknowledged: number }>();
    
    warnings.forEach(w => {
      const current = machineWarnings.get(w.machine_id) || { total: 0, acknowledged: 0 };
      current.total++;
      
      const ack = acks?.find(a => a.warning_id === w.id);
      if (ack?.read_acknowledged && ack?.liability_acknowledged) {
        current.acknowledged++;
      }
      
      machineWarnings.set(w.machine_id, current);
    });

    const result: WarningAcknowledgment[] = [];
    machineWarnings.forEach((value, key) => {
      result.push({
        machine_id: key,
        warning_count: value.total,
        acknowledged_count: value.acknowledged,
      });
    });

    setWarningAcks(result);
  };

  const calculateCertificationStatus = (logs: SafetyLog[], access: string[], warningAckData: WarningAcknowledgment[]) => {
    const statuses: CertificationStatus[] = [];

    access.forEach((machineId) => {
      const machine = machines.find((m) => m.id === machineId);
      if (!machine) return;

      const machineLogs = logs.filter((l) => l.machine_id === machineId);
      const lastLog = machineLogs[0];

      let lastCheck: Date | null = null;
      let isOverdue = true;
      let status: "safe" | "failed" | "none" = "none";

      if (lastLog) {
        lastCheck = new Date(lastLog.timestamp);
        const cutoffDate = subDays(new Date(), machine.recertification_days);
        isOverdue = !isAfter(lastCheck, cutoffDate);
        status = lastLog.status === "safe" ? "safe" : "failed";
      }

      const warningAck = warningAckData.find(w => w.machine_id === machineId);
      const warningsAccepted = warningAck 
        ? warningAck.acknowledged_count === warningAck.warning_count && warningAck.warning_count > 0
        : false;
      const warningProgress = warningAck 
        ? `${warningAck.acknowledged_count}/${warningAck.warning_count}` 
        : "0/0";

      statuses.push({
        machineId,
        machineName: machine.name,
        lastCheck,
        isOverdue,
        status,
        warningsAccepted,
        warningProgress,
      });
    });

    setCertificationStatus(statuses);
  };

  const handleViewEmployee = async (employee: Employee) => {
    setSelectedEmployee(employee);
    const [, accessData] = await Promise.all([
      fetchEmployeeLogs(employee.user_id),
      fetchEmployeeAccess(employee.user_id).then(() => employeeAccess),
    ]);
  };

  useEffect(() => {
    const loadWarningData = async () => {
      if (selectedEmployee && employeeAccess.length > 0) {
        await fetchWarningAcknowledgments(selectedEmployee.user_id, employeeAccess);
      }
    };
    loadWarningData();
  }, [selectedEmployee, employeeAccess]);

  useEffect(() => {
    if (selectedEmployee && employeeLogs.length >= 0 && employeeAccess.length > 0) {
      calculateCertificationStatus(employeeLogs, employeeAccess, warningAcks);
    }
  }, [employeeLogs, employeeAccess, machines, warningAcks]);

  const handleManageAccess = async (employee: Employee) => {
    setAccessEmployee(employee);
    await fetchEmployeeAccess(employee.user_id);
    setAccessDialogOpen(true);
  };

  const handleOpenWarning = (employee: Employee) => {
    setWarningEmployee(employee);
    setWarningMessage("");
    setWarningMachine(null);
    setWarningDialogOpen(true);
  };

  const handleSendWarning = async () => {
    if (!warningEmployee || !warningMessage.trim() || !user) return;
    setSendingWarning(true);

    const { error } = await supabase.from("employee_warnings").insert({
      employee_id: warningEmployee.user_id,
      admin_id: user.id,
      machine_id: warningMachine,
      message: warningMessage.trim(),
      warning_type: "manual",
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send warning",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Warning Sent",
        description: `Warning sent to ${warningEmployee.full_name}`,
      });
      setWarningDialogOpen(false);
    }
    setSendingWarning(false);
  };

  const toggleMachineAccess = async (machineId: string) => {
    if (!accessEmployee) return;

    const hasAccess = employeeAccess.includes(machineId);

    if (hasAccess) {
      const { error } = await supabase
        .from("machine_access")
        .delete()
        .eq("user_id", accessEmployee.user_id)
        .eq("machine_id", machineId);

      if (!error) {
        setEmployeeAccess(employeeAccess.filter((id) => id !== machineId));
        toast({ title: "Access removed" });
      }
    } else {
      const { error } = await supabase.from("machine_access").insert({
        user_id: accessEmployee.user_id,
        machine_id: machineId,
        granted_by: user?.id,
      });

      if (!error) {
        setEmployeeAccess([...employeeAccess, machineId]);
        toast({ title: "Access granted" });
      }
    }
  };

  const getMachineName = (machineId: string) => {
    return machines.find((m) => m.id === machineId)?.name || "Unknown";
  };

  const getOverdueCount = () => {
    return certificationStatus.filter((s) => s.isOverdue || s.status === "failed").length;
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

      <main className="pt-20 md:pt-24 pb-8 px-4 max-w-6xl mx-auto">
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
          <h1 className="text-3xl md:text-4xl font-black">Employees</h1>
          <p className="text-lg text-muted-foreground mt-2">
            View employee progress and manage machine access.
          </p>
        </div>

        {/* Search */}
        <MachineSearch
          onSearch={setSearchQuery}
          placeholder="Search employees by name or ID..."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">All Employees ({filteredEmployees.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="card-industrial p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{employee.full_name}</h3>
                      {employee.employee_id && (
                        <p className="text-sm text-muted-foreground">
                          ID: {employee.employee_id}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewEmployee(employee)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageAccess(employee)}
                      >
                        <Truck className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenWarning(employee)}
                        className="text-warning"
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Panel */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">
              {selectedEmployee
                ? `${selectedEmployee.full_name}'s Profile`
                : "Select an Employee"}
            </h2>

            {selectedEmployee ? (
              <div className="space-y-6">
                {/* Certification Status */}
                {certificationStatus.length > 0 && (
                  <div className="card-industrial p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">Certification Status</h3>
                      {getOverdueCount() > 0 && (
                        <span className="px-2 py-1 bg-destructive/20 text-destructive text-sm font-bold rounded">
                          {getOverdueCount()} Overdue
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {certificationStatus.map((cert) => (
                        <div
                          key={cert.machineId}
                          className={`p-3 rounded-sm ${
                            cert.isOverdue || cert.status === "failed"
                              ? "bg-destructive/10"
                              : "bg-success/10"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{cert.machineName}</span>
                            <div className="flex items-center gap-2">
                              {cert.lastCheck ? (
                                <span className="text-sm text-muted-foreground">
                                  {format(cert.lastCheck, "MMM d, yyyy")}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Never</span>
                              )}
                              {cert.isOverdue || cert.status === "failed" ? (
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                              ) : (
                                <CheckCircle className="h-5 w-5 text-success" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                            <span className="text-sm text-muted-foreground">Warnings Accepted</span>
                            <span className={`text-sm font-bold ${cert.warningsAccepted ? "text-success" : "text-warning"}`}>
                              {cert.warningProgress} {cert.warningsAccepted ? "✓" : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity Log */}
                <div>
                  <h3 className="font-bold mb-3">Recent Activity</h3>
                  {employeeLogs.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {employeeLogs.map((log) => (
                        <div
                          key={log.id}
                          className="card-industrial p-4 flex items-center gap-4"
                        >
                          {log.status === "safe" ? (
                            <CheckCircle className="h-6 w-6 text-success shrink-0" />
                          ) : (
                            <XCircle className="h-6 w-6 text-destructive shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="font-bold">{getMachineName(log.machine_id)}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <div className="text-right">
                            {log.category && (
                              <span className="text-xs bg-muted px-2 py-1 rounded block mb-1">
                                {log.category}
                              </span>
                            )}
                            {log.correct_answers !== null && log.total_questions !== null && (
                              <span className="text-sm font-medium">
                                {log.correct_answers}/{log.total_questions}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card-industrial p-8 text-center text-muted-foreground">
                      No activity logs found
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card-industrial p-8 text-center text-muted-foreground">
                Click "View" on an employee to see their activity
              </div>
            )}
          </div>
        </div>

        {/* Machine Access Dialog */}
        <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                Machine Access for {accessEmployee?.full_name}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
              {machines.map((machine) => {
                const hasAccess = employeeAccess.includes(machine.id);
                return (
                  <button
                    key={machine.id}
                    onClick={() => toggleMachineAccess(machine.id)}
                    className={`w-full card-industrial p-4 flex items-center justify-between ${
                      hasAccess ? "selected" : ""
                    }`}
                  >
                    <span className="font-bold">{machine.name}</span>
                    {hasAccess ? (
                      <CheckCircle className="h-6 w-6 text-success" />
                    ) : (
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Warning Dialog */}
        <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-warning" />
                Send Warning to {warningEmployee?.full_name}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-lg">Related Machine (Optional)</Label>
                <select
                  value={warningMachine || ""}
                  onChange={(e) => setWarningMachine(e.target.value || null)}
                  className="w-full input-industrial"
                >
                  <option value="">Select a machine...</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-lg">Warning Message</Label>
                <Textarea
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  placeholder="Enter warning message..."
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
                  onClick={handleSendWarning}
                  disabled={sendingWarning || !warningMessage.trim()}
                  className="flex-1 btn-warning"
                >
                  <Send className="h-5 w-5 mr-2" />
                  {sendingWarning ? "Sending..." : "Send Warning"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
