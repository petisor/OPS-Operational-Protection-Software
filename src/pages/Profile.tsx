import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, User, Mail, IdCard, Shield } from "lucide-react";

export default function Profile() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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
            onClick={() => navigate("/")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl md:text-4xl font-black">My Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="card-industrial p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
              <p className="text-lg text-muted-foreground">
                {isAdmin ? "Administrator" : "Worker"}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-sm">
              <Mail className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="text-lg font-semibold">{user?.email}</p>
              </div>
            </div>

            {profile?.employee_id && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-sm">
                <IdCard className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Employee ID</p>
                  <p className="text-lg font-semibold">{profile.employee_id}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 p-4 bg-muted rounded-sm">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Account Type</p>
                <p className="text-lg font-semibold">
                  {isAdmin ? "Administrator" : "Standard Worker"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
