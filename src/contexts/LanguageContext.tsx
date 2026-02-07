import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "nl" | "ro" | "es" | "de";

interface LanguageConfig {
  code: Language;
  name: string;
  flag: string;
}

export const languages: LanguageConfig[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  currentLanguage: LanguageConfig;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.myProfile": "My Profile",
    "nav.settings": "Settings",
    "nav.adminPanel": "Admin Panel",
    "nav.logout": "Logout",
    "nav.administrator": "Administrator",
    "nav.worker": "Worker",
    
    // Common
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.submit": "Submit",
    "common.confirm": "Confirm",
    "common.yes": "Yes",
    "common.no": "No",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welcome",
    "dashboard.yourMachines": "Your Machines",
    "dashboard.noMachines": "No machines assigned",
    
    // Safety
    "safety.warnings": "Warnings",
    "safety.instructions": "Instructions",
    "safety.quiz": "Quiz",
    "safety.passed": "Passed",
    "safety.failed": "Failed",
    "safety.startQuiz": "Start Quiz",
    "safety.continueQuiz": "Continue Quiz",
    
    // Auth
    "auth.signIn": "Sign In",
    "auth.signUp": "Sign Up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.fullName": "Full Name",
    "auth.employerId": "Employer ID",
  },
  nl: {
    // Navigation
    "nav.myProfile": "Mijn Profiel",
    "nav.settings": "Instellingen",
    "nav.adminPanel": "Beheer",
    "nav.logout": "Uitloggen",
    "nav.administrator": "Beheerder",
    "nav.worker": "Medewerker",
    
    // Common
    "common.loading": "Laden...",
    "common.save": "Opslaan",
    "common.cancel": "Annuleren",
    "common.delete": "Verwijderen",
    "common.edit": "Bewerken",
    "common.add": "Toevoegen",
    "common.back": "Terug",
    "common.next": "Volgende",
    "common.previous": "Vorige",
    "common.submit": "Verzenden",
    "common.confirm": "Bevestigen",
    "common.yes": "Ja",
    "common.no": "Nee",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welkom",
    "dashboard.yourMachines": "Uw Machines",
    "dashboard.noMachines": "Geen machines toegewezen",
    
    // Safety
    "safety.warnings": "Waarschuwingen",
    "safety.instructions": "Instructies",
    "safety.quiz": "Quiz",
    "safety.passed": "Geslaagd",
    "safety.failed": "Niet geslaagd",
    "safety.startQuiz": "Start Quiz",
    "safety.continueQuiz": "Ga door met Quiz",
    
    // Auth
    "auth.signIn": "Inloggen",
    "auth.signUp": "Registreren",
    "auth.email": "E-mail",
    "auth.password": "Wachtwoord",
    "auth.fullName": "Volledige Naam",
    "auth.employerId": "Werkgever ID",
  },
  ro: {
    // Navigation
    "nav.myProfile": "Profilul Meu",
    "nav.settings": "Setări",
    "nav.adminPanel": "Panou Admin",
    "nav.logout": "Deconectare",
    "nav.administrator": "Administrator",
    "nav.worker": "Muncitor",
    
    // Common
    "common.loading": "Se încarcă...",
    "common.save": "Salvează",
    "common.cancel": "Anulează",
    "common.delete": "Șterge",
    "common.edit": "Editează",
    "common.add": "Adaugă",
    "common.back": "Înapoi",
    "common.next": "Următorul",
    "common.previous": "Anterior",
    "common.submit": "Trimite",
    "common.confirm": "Confirmă",
    "common.yes": "Da",
    "common.no": "Nu",
    
    // Dashboard
    "dashboard.title": "Panou de Control",
    "dashboard.welcome": "Bun venit",
    "dashboard.yourMachines": "Mașinile Tale",
    "dashboard.noMachines": "Nicio mașină atribuită",
    
    // Safety
    "safety.warnings": "Avertismente",
    "safety.instructions": "Instrucțiuni",
    "safety.quiz": "Chestionar",
    "safety.passed": "Trecut",
    "safety.failed": "Eșuat",
    "safety.startQuiz": "Începe Chestionarul",
    "safety.continueQuiz": "Continuă Chestionarul",
    
    // Auth
    "auth.signIn": "Autentificare",
    "auth.signUp": "Înregistrare",
    "auth.email": "Email",
    "auth.password": "Parolă",
    "auth.fullName": "Nume Complet",
    "auth.employerId": "ID Angajator",
  },
  es: {
    // Navigation
    "nav.myProfile": "Mi Perfil",
    "nav.settings": "Configuración",
    "nav.adminPanel": "Panel de Admin",
    "nav.logout": "Cerrar Sesión",
    "nav.administrator": "Administrador",
    "nav.worker": "Trabajador",
    
    // Common
    "common.loading": "Cargando...",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.add": "Añadir",
    "common.back": "Atrás",
    "common.next": "Siguiente",
    "common.previous": "Anterior",
    "common.submit": "Enviar",
    "common.confirm": "Confirmar",
    "common.yes": "Sí",
    "common.no": "No",
    
    // Dashboard
    "dashboard.title": "Panel de Control",
    "dashboard.welcome": "Bienvenido",
    "dashboard.yourMachines": "Tus Máquinas",
    "dashboard.noMachines": "Sin máquinas asignadas",
    
    // Safety
    "safety.warnings": "Advertencias",
    "safety.instructions": "Instrucciones",
    "safety.quiz": "Cuestionario",
    "safety.passed": "Aprobado",
    "safety.failed": "Reprobado",
    "safety.startQuiz": "Iniciar Cuestionario",
    "safety.continueQuiz": "Continuar Cuestionario",
    
    // Auth
    "auth.signIn": "Iniciar Sesión",
    "auth.signUp": "Registrarse",
    "auth.email": "Correo Electrónico",
    "auth.password": "Contraseña",
    "auth.fullName": "Nombre Completo",
    "auth.employerId": "ID del Empleador",
  },
  de: {
    // Navigation
    "nav.myProfile": "Mein Profil",
    "nav.settings": "Einstellungen",
    "nav.adminPanel": "Admin-Bereich",
    "nav.logout": "Abmelden",
    "nav.administrator": "Administrator",
    "nav.worker": "Arbeiter",
    
    // Common
    "common.loading": "Laden...",
    "common.save": "Speichern",
    "common.cancel": "Abbrechen",
    "common.delete": "Löschen",
    "common.edit": "Bearbeiten",
    "common.add": "Hinzufügen",
    "common.back": "Zurück",
    "common.next": "Weiter",
    "common.previous": "Vorherige",
    "common.submit": "Absenden",
    "common.confirm": "Bestätigen",
    "common.yes": "Ja",
    "common.no": "Nein",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Willkommen",
    "dashboard.yourMachines": "Ihre Maschinen",
    "dashboard.noMachines": "Keine Maschinen zugewiesen",
    
    // Safety
    "safety.warnings": "Warnungen",
    "safety.instructions": "Anweisungen",
    "safety.quiz": "Quiz",
    "safety.passed": "Bestanden",
    "safety.failed": "Nicht bestanden",
    "safety.startQuiz": "Quiz Starten",
    "safety.continueQuiz": "Quiz Fortsetzen",
    
    // Auth
    "auth.signIn": "Anmelden",
    "auth.signUp": "Registrieren",
    "auth.email": "E-Mail",
    "auth.password": "Passwort",
    "auth.fullName": "Vollständiger Name",
    "auth.employerId": "Arbeitgeber-ID",
  },
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const currentLanguage = languages.find((l) => l.code === language) || languages[0];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, currentLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
