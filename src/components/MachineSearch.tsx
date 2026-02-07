import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface MachineSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function MachineSearch({ onSearch, placeholder = "Search by name or ID..." }: MachineSearchProps) {
  const [query, setQuery] = useState("");

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="relative mb-6">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
      <Input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="input-industrial pl-14 text-lg"
      />
    </div>
  );
}
