import { User, Settings, LogOut, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NavbarProps {
  userName?: string;
  isAdmin?: boolean;
}

export function Navbar({ userName = "Worker", isAdmin = false }: NavbarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <nav className="nav-industrial">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 md:h-10 md:w-10 text-primary" />
        <div className="flex flex-col">
          <span className="text-xl md:text-2xl font-black tracking-tight leading-none">
            OPS
          </span>
          <span className="text-xs text-muted-foreground hidden md:block">
            Operation Protection Software
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-lg"
              className="text-nav-foreground hover:bg-secondary/20 gap-2"
            >
              <User className="h-8 w-8" />
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 bg-card border-2 border-border z-50"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-lg font-bold">{userName}</p>
              <p className="text-sm text-muted-foreground">
                {isAdmin ? "Administrator" : "Worker"}
              </p>
            </div>
            <DropdownMenuItem
              className="min-h-[48px] text-lg cursor-pointer"
              onClick={() => navigate("/profile")}
            >
              <User className="mr-3 h-5 w-5" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-[48px] text-lg cursor-pointer"
              onClick={() => navigate("/settings")}
            >
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="min-h-[48px] text-lg cursor-pointer"
                  onClick={() => navigate("/admin")}
                >
                  <Shield className="mr-3 h-5 w-5" />
                  Admin Panel
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-[48px] text-lg cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
