import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, X, Bell } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface Warning {
  id: string;
  message: string;
  warning_type: string;
  created_at: string;
  read: boolean;
  machine_id: string | null;
}

interface WarningBannerProps {
  userId: string;
}

export function WarningBanner({ userId }: WarningBannerProps) {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchWarnings();
  }, [userId]);

  const fetchWarnings = async () => {
    const { data, error } = await supabase
      .from("employee_warnings")
      .select("*")
      .eq("employee_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setWarnings(data);
    }
  };

  const dismissWarning = async (warningId: string) => {
    await supabase
      .from("employee_warnings")
      .update({ read: true })
      .eq("id", warningId);

    setWarnings(warnings.filter((w) => w.id !== warningId));
  };

  if (warnings.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Collapsed Banner */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full card-industrial border-warning bg-warning/10 p-4 flex items-center justify-between hover:bg-warning/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-warning" />
            <span className="font-bold text-warning">
              You have {warnings.length} unread warning{warnings.length !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-muted-foreground">Click to view</span>
        </button>
      )}

      {/* Expanded Warnings */}
      {expanded && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Warnings from Admin
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(false)}
            >
              Collapse
            </Button>
          </div>

          {warnings.map((warning) => (
            <div
              key={warning.id}
              className="card-industrial border-warning bg-warning/10 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(warning.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <p className="text-lg font-medium">{warning.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dismissWarning(warning.id)}
                  className="shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
