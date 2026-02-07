import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  User,
  CheckCircle,
  XCircle,
  Plus,
  Truck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  employee_id: string | null;
}

interface Machine {
  id: string;
  name: string;
}

interface SafetyLog {
  id: string;
  machine_id: string;
  status: string;
  timestamp: string;
}

interface MachineAccess {
  machine_id: string;
}

export default function AdminEmployees() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeLogs, setEmployeeLogs] = useState<SafetyLog[]>([]);
  const [employeeAccess, setEmployeeAccess] = useState<string[]>([]);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [accessEmployee, setAccessEmployee] = useState<Employee | null>(null);

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

  const fetchEmployees = async () => {
    // Get all profiles with user role
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    if (!error && profiles) {
      setEmployees(profiles);
    }
  };

  const fetchMachines = async () => {
    const { data, error } = await supabase
      .from("machines")
      .select("id, name")
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
      .limit(20);

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

  const handleViewEmployee = async (employee: Employee) => {
    setSelectedEmployee(employee);
    await fetchEmployeeLogs(employee.user_id);
  };

  const handleManageAccess = async (employee: Employee) => {
    setAccessEmployee(employee);
    await fetchEmployeeAccess(employee.user_id);
    setAccessDialogOpen(true);
  };

  const toggleMachineAccess = async (machineId: string) => {
    if (!accessEmployee) return;

    const hasAccess = employeeAccess.includes(machineId);

    if (hasAccess) {
      // Remove access
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
      // Grant access
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
          <h1 className="text-3xl md:text-4xl font-black">Employees</h1>
          <p className="text-lg text-muted-foreground mt-2">
            View employee progress and manage machine access.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">All Employees</h2>
            {employees.map((employee) => (
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
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Activity Log */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">
              {selectedEmployee
                ? `${selectedEmployee.full_name}'s Activity`
                : "Select an Employee"}
            </h2>

            {selectedEmployee ? (
              employeeLogs.length > 0 ? (
                <div className="space-y-3">
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
                      <div>
                        <p className="font-bold">{getMachineName(log.machine_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-industrial p-8 text-center text-muted-foreground">
                  No activity logs found
                </div>
              )
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

            <div className="mt-4 space-y-3">
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
      </main>
    </div>
  );
}
