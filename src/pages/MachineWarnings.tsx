import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslateContentBatch } from "@/hooks/useTranslateContent";
import { ArrowLeft, AlertTriangle, ChevronRight, CheckCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Machine {
  id: string;
  name: string;
}

interface Warning {
  id: string;
  title: string;
  content: string;
  severity: string;
  order_index: number;
}

interface Acknowledgment {
  warning_id: string;
  read_acknowledged: boolean;
  liability_acknowledged: boolean;
}

export default function MachineWarnings() {
  const { machineId } = useParams<{ machineId: string }>();
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [acknowledgments, setAcknowledgments] = useState<Map<string, Acknowledgment>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

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
    if (!machineId || !user) return;

    setLoadingData(true);

    // Fetch machine
    const { data: machineData } = await supabase
      .from("machines")
      .select("id, name")
      .eq("id", machineId)
      .single();

    if (!machineData) {
      navigate("/");
      return;
    }

    setMachine(machineData);

    // Fetch approved warnings
    const { data: warningsData } = await supabase
      .from("machine_warnings")
      .select("*")
      .eq("machine_id", machineId)
      .eq("is_approved", true)
      .order("order_index");

    setWarnings(warningsData || []);

    // Fetch existing acknowledgments
    if (warningsData && warningsData.length > 0) {
      const warningIds = warningsData.map((w) => w.id);
      const { data: ackData } = await supabase
        .from("user_warning_acknowledgments")
        .select("*")
        .eq("user_id", user.id)
        .in("warning_id", warningIds);

      const ackMap = new Map<string, Acknowledgment>();
      ackData?.forEach((ack) => {
        ackMap.set(ack.warning_id, {
          warning_id: ack.warning_id,
          read_acknowledged: ack.read_acknowledged,
          liability_acknowledged: ack.liability_acknowledged,
        });
      });
      setAcknowledgments(ackMap);

      // Find first incomplete warning
      const firstIncomplete = warningsData.findIndex((w) => {
        const ack = ackMap.get(w.id);
        return !ack || !ack.read_acknowledged || !ack.liability_acknowledged;
      });
      setCurrentIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    }

    setLoadingData(false);
  };

  const handleCheckboxChange = async (type: "read" | "liability", checked: boolean) => {
    if (!user || warnings.length === 0) return;

    const currentWarning = warnings[currentIndex];
    const currentAck = acknowledgments.get(currentWarning.id) || {
      warning_id: currentWarning.id,
      read_acknowledged: false,
      liability_acknowledged: false,
    };

    const updatedAck = {
      ...currentAck,
      [type === "read" ? "read_acknowledged" : "liability_acknowledged"]: checked,
    };

    // Update local state
    const newAcks = new Map(acknowledgments);
    newAcks.set(currentWarning.id, updatedAck);
    setAcknowledgments(newAcks);

    // Save to database
    await supabase.from("user_warning_acknowledgments").upsert(
      {
        user_id: user.id,
        warning_id: currentWarning.id,
        read_acknowledged: updatedAck.read_acknowledged,
        liability_acknowledged: updatedAck.liability_acknowledged,
        acknowledged_at: updatedAck.read_acknowledged && updatedAck.liability_acknowledged
          ? new Date().toISOString()
          : null,
      },
      { onConflict: "user_id,warning_id" }
    );
  };

  const handleNext = () => {
    if (currentIndex < warnings.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleComplete = async () => {
    if (!user || !machineId) return;

    // Update learning progress
    await supabase.from("user_learning_progress").upsert(
      {
        user_id: user.id,
        machine_id: machineId,
        warnings_completed: true,
        warnings_completed_at: new Date().toISOString(),
        quiz_unlocked: true,
      },
      { onConflict: "user_id,machine_id" }
    );

    navigate(`/learn/${machineId}`);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl font-bold">{t("common.loading")}</div>
      </div>
    );
  }

  if (warnings.length === 0) {
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
            {t("learn.backToLearn")}
          </Button>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">{t("warnings.noWarnings")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("warnings.notPublished")}
            </p>
            <Button onClick={() => navigate(`/learn/${machineId}`)}>
              {t("common.goBack")}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Translate warnings
  const { items: translatedWarnings, isTranslating } = useTranslateContentBatch(
    warnings,
    ["title", "content"]
  );

  const currentWarning = translatedWarnings[currentIndex] || warnings[currentIndex];
  const currentAck = acknowledgments.get(warnings[currentIndex]?.id);
  const canProceed = currentAck?.read_acknowledged && currentAck?.liability_acknowledged;
  const isLastWarning = currentIndex === warnings.length - 1;
  const progressPercent = ((currentIndex + 1) / warnings.length) * 100;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 border-red-500 text-red-500";
      case "high":
        return "bg-orange-500/10 border-orange-500 text-orange-500";
      case "medium":
        return "bg-amber-500/10 border-amber-500 text-amber-500";
      default:
        return "bg-yellow-500/10 border-yellow-500 text-yellow-500";
    }
  };

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
          {t("learn.backToLearn")}
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black mb-2">
            {t("warnings.title")}: {machine?.name}
          </h1>
          <div className="flex items-center gap-4">
            <Progress value={progressPercent} className="flex-1" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {currentIndex + 1} {t("common.of")} {warnings.length}
            </span>
          </div>
        </div>

        <Card className={`mb-6 border-2 ${getSeverityColor(currentWarning.severity)}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6" />
              <div className="flex-1">
                <span className="text-xs font-bold uppercase">
                  {currentWarning.severity} {t("warnings.warning")}
                </span>
                <div className="flex items-center gap-2">
                  {isTranslating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <CardTitle className="text-xl">{currentWarning.title}</CardTitle>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed whitespace-pre-wrap mb-6">
              {currentWarning.content}
            </p>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="read-checkbox"
                  checked={currentAck?.read_acknowledged || false}
                  onCheckedChange={(checked) => handleCheckboxChange("read", checked as boolean)}
                />
                <Label htmlFor="read-checkbox" className="text-base leading-relaxed cursor-pointer">
                  {t("warnings.readUnderstood")}
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="liability-checkbox"
                  checked={currentAck?.liability_acknowledged || false}
                  onCheckedChange={(checked) => handleCheckboxChange("liability", checked as boolean)}
                />
                <Label htmlFor="liability-checkbox" className="text-base leading-relaxed cursor-pointer">
                  {t("warnings.acceptLiability")}
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLastWarning ? (
          <Button
            onClick={handleComplete}
            className="w-full"
            disabled={!canProceed}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            {t("warnings.completeAll")}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            className="w-full"
            disabled={!canProceed}
          >
            {t("warnings.nextWarning")}
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        )}
      </main>
    </div>
  );
}
