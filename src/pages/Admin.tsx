import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Truck, Upload, Users, ArrowLeft } from "lucide-react";

export default function Admin() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [user, isAdmin, loading, navigate]);

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
            onClick={() => navigate("/")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl md:text-4xl font-black">Admin Panel</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Manage machines, employees, and safety records.
          </p>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate("/admin/machines")}
            className="card-industrial p-8 flex flex-col items-center gap-4 hover:border-primary transition-colors"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold">View Machines</h2>
            <p className="text-muted-foreground text-center">
              View, edit, or delete equipment
            </p>
          </button>

          <button
            onClick={() => navigate("/admin/upload")}
            className="card-industrial p-8 flex flex-col items-center gap-4 hover:border-primary transition-colors"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Add Machine</h2>
            <p className="text-muted-foreground text-center">
              Upload manual & create new machine
            </p>
          </button>

          <button
            onClick={() => navigate("/admin/employees")}
            className="card-industrial p-8 flex flex-col items-center gap-4 hover:border-primary transition-colors"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold">View Employees</h2>
            <p className="text-muted-foreground text-center">
              View employees & their progress
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}
