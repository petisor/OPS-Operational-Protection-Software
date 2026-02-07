import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TextToSpeech } from "@/components/TextToSpeech";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import AdminMachines from "./pages/AdminMachines";
import AdminUpload from "./pages/AdminUpload";
import AdminEmployees from "./pages/AdminEmployees";
import InspectMachine from "./pages/InspectMachine";
import LearningEnvironment from "./pages/LearningEnvironment";
import MachineInstructions from "./pages/MachineInstructions";
import MachineWarnings from "./pages/MachineWarnings";
import MachineLearningQuiz from "./pages/MachineLearningQuiz";
import MachineChat from "./pages/MachineChat";
import MachineVisuals from "./pages/MachineVisuals";
import AdminWarnings from "./pages/AdminWarnings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/machines" element={<AdminMachines />} />
            <Route path="/admin/upload" element={<AdminUpload />} />
            <Route path="/admin/employees" element={<AdminEmployees />} />
            <Route path="/admin/machines/:machineId/content" element={<AdminWarnings />} />
            <Route path="/inspect/:machineId" element={<InspectMachine />} />
            <Route path="/learn/:machineId" element={<LearningEnvironment />} />
            <Route path="/learn/:machineId/instructions" element={<MachineInstructions />} />
            <Route path="/learn/:machineId/warnings" element={<MachineWarnings />} />
            <Route path="/learn/:machineId/quiz" element={<MachineLearningQuiz />} />
            <Route path="/learn/:machineId/chat" element={<MachineChat />} />
            <Route path="/learn/:machineId/visuals" element={<MachineVisuals />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <TextToSpeech />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
