import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, User, Lock, Mail, IdCard, UserCog, Eye, EyeOff, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

type AuthMode = "login" | "signup";
type UserRole = "admin" | "user";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        navigate("/");
      } else {
        // Validate employer_id for workers (must match an existing Admin Employer ID)
        if (selectedRole === "user") {
          const normalizedEmployerId = employerId.trim().toUpperCase();

          if (!normalizedEmployerId) {
            throw new Error("Employer ID is required for worker accounts");
          }

          const { data, error: verifyError } = await supabase.functions.invoke(
            "validate-employer-id",
            { body: { employerId: normalizedEmployerId } }
          );

          if (verifyError) {
            throw new Error("Failed to verify Employer ID");
          }

          if (!data?.valid) {
            throw new Error(
              "Invalid Employer ID. Please check with your administrator."
            );
          }
        }

        // Pass role and profile data via user metadata - the database trigger will create profile and role
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName,
              employee_id: selectedRole === "admin" ? employeeId || null : null,
              employer_id: selectedRole === "user" ? employerId.trim().toUpperCase() : null,
              role: selectedRole,
            },
          },
        });

        if (error) throw error;

        toast({
          title: t("auth.accountCreated"),
          description: t("auth.checkEmail"),
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Language Selector - Top Right */}
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-black">OPS</h1>
          <p className="text-muted-foreground text-lg mt-2">
            Operation Protection Software
          </p>
        </div>

        {/* Auth Card */}
        <div className="card-industrial p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-lg font-semibold">
                    {t("auth.fullName")}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-industrial pl-12"
                      placeholder="John Smith"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeId" className="text-lg font-semibold">
                    {selectedRole === "admin" ? t("auth.employeeId") : t("auth.employerId")}
                  </Label>
                  <div className="relative">
                    {selectedRole === "admin" ? (
                      <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    )}
                    <Input
                      id="employeeId"
                      type="text"
                      value={selectedRole === "admin" ? employeeId : employerId}
                      onChange={(e) => selectedRole === "admin" 
                        ? setEmployeeId(e.target.value) 
                        : setEmployerId(e.target.value.toUpperCase())
                      }
                      className="input-industrial pl-12"
                      placeholder={selectedRole === "admin" ? "EMP-12345" : "Enter your employer's ID"}
                      required={selectedRole === "user"}
                    />
                  </div>
                  {selectedRole === "user" && (
                    <p className="text-sm text-muted-foreground">
                      {t("auth.askAdmin")}
                    </p>
                  )}
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <Label className="text-lg font-semibold">{t("auth.accountType")}</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("user")}
                      className={`p-4 flex flex-col items-center gap-2 border-2 rounded-sm transition-all duration-200 ${
                        selectedRole === "user" 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "bg-card border-border hover:border-primary/50"
                      }`}
                    >
                      <User className={`h-8 w-8 ${selectedRole === "user" ? "text-primary-foreground" : ""}`} />
                      <span className="font-bold">{t("auth.worker")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole("admin")}
                      className={`p-4 flex flex-col items-center gap-2 border-2 rounded-sm transition-all duration-200 ${
                        selectedRole === "admin" 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "bg-card border-border hover:border-primary/50"
                      }`}
                    >
                      <UserCog className={`h-8 w-8 ${selectedRole === "admin" ? "text-primary-foreground" : ""}`} />
                      <span className="font-bold">{t("auth.admin")}</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-lg font-semibold">
                {t("auth.email")}
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-industrial pl-12"
                  placeholder="worker@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-lg font-semibold">
                {t("auth.password")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-industrial pl-12 pr-12"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="full"
              variant="default"
              className="mt-6"
              disabled={loading}
            >
              {loading
                ? t("auth.pleaseWait")
                : mode === "login"
                ? t("auth.signIn")
                : t("auth.createAccount")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-lg text-primary hover:underline font-semibold"
            >
              {mode === "login"
                ? t("auth.noAccount")
                : t("auth.hasAccount")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
