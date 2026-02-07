import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Mail, IdCard, Shield, Building, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (isAdmin && user) {
      fetchEmployerId();
    }
  }, [isAdmin, user]);

  const fetchEmployerId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("employer_id")
      .eq("user_id", user.id)
      .single();
    
    if (data?.employer_id) {
      setEmployerId(data.employer_id);
    }
  };

  const copyEmployerId = () => {
    if (employerId) {
      navigator.clipboard.writeText(employerId);
      setCopied(true);
      toast({ title: "Copied!", description: "Employer ID copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
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

            {profile?.employee_id && !isAdmin && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-sm">
                <IdCard className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Employer ID</p>
                  <p className="text-lg font-semibold">{profile.employee_id}</p>
                </div>
              </div>
            )}

            {isAdmin && employerId && (
              <div className="flex items-center gap-4 p-4 bg-primary/10 border-2 border-primary rounded-sm">
                <Building className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Your Employer ID</p>
                  <p className="text-xl font-black tracking-wider">{employerId}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share this with your workers so they can link to your account
                  </p>
                </div>
                <Button variant="outline" size="icon" onClick={copyEmployerId}>
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </Button>
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
