import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, languages, Language } from "@/contexts/LanguageContext";

export function LanguageSelector() {
  const { language, setLanguage, currentLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-nav-foreground hover:bg-secondary/20"
          title="Select Language"
        >
          <span className="text-2xl">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 bg-card border-2 border-border z-50"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className={`min-h-[48px] text-lg cursor-pointer flex items-center gap-3 ${
              language === lang.code ? "bg-secondary" : ""
            }`}
            onClick={() => setLanguage(lang.code)}
          >
            <span className="text-2xl">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
