import React, { createContext, useContext, useState, ReactNode } from "react";

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
    "common.saveChanges": "Save Changes",
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
    "common.complete": "Complete",
    "common.completed": "Completed",
    "common.search": "Search",
    "common.of": "of",
    "common.step": "Step",
    "common.goBack": "Go Back",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.goodMorning": "Good Morning",
    "dashboard.goodAfternoon": "Good Afternoon",
    "dashboard.goodEvening": "Good Evening",
    "dashboard.completeCheck": "Complete your equipment safety check before starting work.",
    "dashboard.selectEquipment": "Select Equipment for Inspection",
    "dashboard.noMachines": "No equipment has been assigned to you yet.",
    "dashboard.noMatch": "No machines match your search.",
    "dashboard.contactAdmin": "Contact your administrator to get equipment access.",
    "dashboard.searchPlaceholder": "Search machines by name or ID...",
    "dashboard.learn": "Learn",
    "dashboard.quickInspection": "Quick Inspection",
    "dashboard.backToMachines": "Back to Machines",
    "dashboard.backToCategories": "Back to Categories",
    "dashboard.backToDashboard": "Back to Dashboard",
    
    // Learning Environment
    "learn.title": "Learning Environment",
    "learn.completeAll": "Complete all sections to operate this machine",
    "learn.howToUse": "How to Use",
    "learn.howToUseDesc": "Step-by-step instructions on how to operate this machine safely and effectively.",
    "learn.warnings": "Warnings",
    "learn.warningsDesc": "Safety warnings and liability notices. You must acknowledge all warnings to proceed.",
    "learn.quiz": "Quiz",
    "learn.quizDesc": "Test your knowledge with safety and usage quizzes to get certified.",
    "learn.visualSupport": "Visual Support",
    "learn.visualSupportDesc": "Generate visual guides and illustrations based on the machine manual.",
    "learn.liveAssistance": "Live Assistance",
    "learn.liveAssistanceDesc": "Chat with an AI assistant trained on this machine's manual for instant help.",
    "learn.startHere": "Start Here",
    "learn.required": "Required",
    "learn.ready": "Ready",
    "learn.locked": "Locked",
    "learn.aiGenerated": "AI Generated",
    "learn.aiPowered": "AI Powered",
    "learn.backToLearn": "Back to Learning Environment",
    
    // Instructions
    "instructions.title": "How to Use",
    "instructions.noInstructions": "No Instructions Available",
    "instructions.notGenerated": "Instructions for this machine haven't been generated yet.",
    "instructions.addInstructions": "Add Instructions",
    "instructions.editInstructions": "Edit Instructions",
    "instructions.stepTitle": "Step title",
    "instructions.stepContent": "Step content - detailed instructions...",
    "instructions.addStep": "Add Step",
    "instructions.saving": "Saving...",
    
    // Warnings
    "warnings.title": "Safety Warnings",
    "warnings.noWarnings": "No Warnings Available",
    "warnings.notPublished": "Warnings for this machine haven't been published yet.",
    "warnings.warning": "Warning",
    "warnings.readUnderstood": "I have read and understood the safety warnings.",
    "warnings.acceptLiability": "I accept full liability for these known risks.",
    "warnings.completeAll": "Complete All Warnings",
    "warnings.nextWarning": "Next Warning",
    
    // Quiz
    "quiz.selectCategory": "Select Quiz Category",
    "quiz.safetyQuiz": "Safety Quiz",
    "quiz.safetyQuizDesc": "Test your knowledge of safety protocols and precautions.",
    "quiz.usageQuiz": "Usage Quiz",
    "quiz.usageQuizDesc": "Test your understanding of machine operation procedures.",
    "quiz.question": "Question",
    "quiz.trueBtn": "TRUE",
    "quiz.falseBtn": "FALSE",
    "quiz.correct": "Correct!",
    "quiz.incorrect": "Incorrect",
    "quiz.passed": "Passed",
    "quiz.failed": "Failed",
    
    // Auth
    "auth.signIn": "Sign In",
    "auth.signUp": "Sign Up",
    "auth.createAccount": "Create Account",
    "auth.email": "Email Address",
    "auth.password": "Password",
    "auth.fullName": "Full Name",
    "auth.employeeId": "Employee ID (Optional)",
    "auth.employerId": "Employer ID",
    "auth.askAdmin": "Ask your administrator for the Employer ID",
    "auth.accountType": "Account Type",
    "auth.worker": "Worker",
    "auth.admin": "Admin",
    "auth.pleaseWait": "Please wait...",
    "auth.noAccount": "Don't have an account? Sign Up",
    "auth.hasAccount": "Already have an account? Sign In",
    "auth.accountCreated": "Account created!",
    "auth.checkEmail": "Please check your email to verify your account.",
    
    // Safety Success
    "success.title": "Safety Check Complete",
    "success.certified": "You are now certified to operate this machine.",
    "success.employee": "Employee",
    "success.machine": "Machine",
    "success.timestamp": "Timestamp",
    "success.status": "Status",
    "success.safe": "SAFE TO OPERATE",
    
    // Do Not Operate
    "failed.title": "DO NOT OPERATE",
    "failed.subtitle": "Safety Check Failed",
    "failed.message": "You have not passed the safety quiz. Please review the safety materials and try again.",
    "failed.returnDashboard": "Return to Dashboard",
    
    // Chat
    "chat.title": "Live Assistance",
    "chat.placeholder": "Ask a question about this machine...",
    "chat.send": "Send",
    "chat.thinking": "Thinking...",
    "chat.greeting": "Hello! I'm your AI assistant for",
    "chat.greetingEnd": "How can I help you today?",
    
    // Admin
    "admin.title": "Admin Panel",
    "admin.manageMachines": "Manage Machines",
    "admin.manageEmployees": "Manage Employees",
    "admin.manageContent": "Manage Content",
    "admin.uploadManual": "Upload Manual",
    "admin.yourEmployerId": "Your Employer ID",
    "admin.shareCode": "Share this code with workers to join your organization",
    
    // Profile
    "profile.title": "My Profile",
    "profile.personalInfo": "Personal Information",
    "profile.employeeId": "Employee ID",
    "profile.notSet": "Not set",
    "profile.memberSince": "Member since",
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
    "common.saveChanges": "Wijzigingen Opslaan",
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
    "common.complete": "Voltooien",
    "common.completed": "Voltooid",
    "common.search": "Zoeken",
    "common.of": "van",
    "common.step": "Stap",
    "common.goBack": "Ga Terug",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.goodMorning": "Goedemorgen",
    "dashboard.goodAfternoon": "Goedemiddag",
    "dashboard.goodEvening": "Goedenavond",
    "dashboard.completeCheck": "Voltooi uw veiligheidscontrole voor apparatuur voordat u begint met werken.",
    "dashboard.selectEquipment": "Selecteer Apparatuur voor Inspectie",
    "dashboard.noMachines": "Er is nog geen apparatuur aan u toegewezen.",
    "dashboard.noMatch": "Geen machines gevonden.",
    "dashboard.contactAdmin": "Neem contact op met uw beheerder voor toegang tot apparatuur.",
    "dashboard.searchPlaceholder": "Zoek machines op naam of ID...",
    "dashboard.learn": "Leren",
    "dashboard.quickInspection": "Snelle Inspectie",
    "dashboard.backToMachines": "Terug naar Machines",
    "dashboard.backToCategories": "Terug naar Categorieën",
    "dashboard.backToDashboard": "Terug naar Dashboard",
    
    // Learning Environment
    "learn.title": "Leeromgeving",
    "learn.completeAll": "Voltooi alle secties om deze machine te bedienen",
    "learn.howToUse": "Hoe te Gebruiken",
    "learn.howToUseDesc": "Stapsgewijze instructies over hoe u deze machine veilig en effectief kunt bedienen.",
    "learn.warnings": "Waarschuwingen",
    "learn.warningsDesc": "Veiligheidswaarschuwingen en aansprakelijkheidsmededelingen. U moet alle waarschuwingen bevestigen om door te gaan.",
    "learn.quiz": "Quiz",
    "learn.quizDesc": "Test uw kennis met veiligheids- en gebruiksquizzen om gecertificeerd te worden.",
    "learn.visualSupport": "Visuele Ondersteuning",
    "learn.visualSupportDesc": "Genereer visuele gidsen en illustraties op basis van de machinehandleiding.",
    "learn.liveAssistance": "Live Assistentie",
    "learn.liveAssistanceDesc": "Chat met een AI-assistent die is getraind op de handleiding van deze machine voor directe hulp.",
    "learn.startHere": "Begin Hier",
    "learn.required": "Vereist",
    "learn.ready": "Gereed",
    "learn.locked": "Vergrendeld",
    "learn.aiGenerated": "AI Gegenereerd",
    "learn.aiPowered": "AI Aangedreven",
    "learn.backToLearn": "Terug naar Leeromgeving",
    
    // Instructions
    "instructions.title": "Hoe te Gebruiken",
    "instructions.noInstructions": "Geen Instructies Beschikbaar",
    "instructions.notGenerated": "Instructies voor deze machine zijn nog niet gegenereerd.",
    "instructions.addInstructions": "Instructies Toevoegen",
    "instructions.editInstructions": "Instructies Bewerken",
    "instructions.stepTitle": "Staptitel",
    "instructions.stepContent": "Stapinhoud - gedetailleerde instructies...",
    "instructions.addStep": "Stap Toevoegen",
    "instructions.saving": "Opslaan...",
    
    // Warnings
    "warnings.title": "Veiligheidswaarschuwingen",
    "warnings.noWarnings": "Geen Waarschuwingen Beschikbaar",
    "warnings.notPublished": "Waarschuwingen voor deze machine zijn nog niet gepubliceerd.",
    "warnings.warning": "Waarschuwing",
    "warnings.readUnderstood": "Ik heb de veiligheidswaarschuwingen gelezen en begrepen.",
    "warnings.acceptLiability": "Ik accepteer volledige aansprakelijkheid voor deze bekende risico's.",
    "warnings.completeAll": "Alle Waarschuwingen Voltooien",
    "warnings.nextWarning": "Volgende Waarschuwing",
    
    // Quiz
    "quiz.selectCategory": "Selecteer Quiz Categorie",
    "quiz.safetyQuiz": "Veiligheidsquiz",
    "quiz.safetyQuizDesc": "Test uw kennis van veiligheidsprotocollen en voorzorgsmaatregelen.",
    "quiz.usageQuiz": "Gebruiksquiz",
    "quiz.usageQuizDesc": "Test uw begrip van machine bedieningsprocedures.",
    "quiz.question": "Vraag",
    "quiz.trueBtn": "WAAR",
    "quiz.falseBtn": "ONWAAR",
    "quiz.correct": "Correct!",
    "quiz.incorrect": "Onjuist",
    "quiz.passed": "Geslaagd",
    "quiz.failed": "Niet Geslaagd",
    
    // Auth
    "auth.signIn": "Inloggen",
    "auth.signUp": "Registreren",
    "auth.createAccount": "Account Aanmaken",
    "auth.email": "E-mailadres",
    "auth.password": "Wachtwoord",
    "auth.fullName": "Volledige Naam",
    "auth.employeeId": "Werknemers-ID (Optioneel)",
    "auth.employerId": "Werkgever-ID",
    "auth.askAdmin": "Vraag uw beheerder om de Werkgever-ID",
    "auth.accountType": "Accounttype",
    "auth.worker": "Medewerker",
    "auth.admin": "Beheerder",
    "auth.pleaseWait": "Even geduld...",
    "auth.noAccount": "Geen account? Registreren",
    "auth.hasAccount": "Heeft u al een account? Inloggen",
    "auth.accountCreated": "Account aangemaakt!",
    "auth.checkEmail": "Controleer uw e-mail om uw account te verifiëren.",
    
    // Safety Success
    "success.title": "Veiligheidscontrole Voltooid",
    "success.certified": "U bent nu gecertificeerd om deze machine te bedienen.",
    "success.employee": "Medewerker",
    "success.machine": "Machine",
    "success.timestamp": "Tijdstempel",
    "success.status": "Status",
    "success.safe": "VEILIG OM TE BEDIENEN",
    
    // Do Not Operate
    "failed.title": "NIET BEDIENEN",
    "failed.subtitle": "Veiligheidscontrole Mislukt",
    "failed.message": "U bent niet geslaagd voor de veiligheidsquiz. Bekijk de veiligheidsmaterialen en probeer het opnieuw.",
    "failed.returnDashboard": "Terug naar Dashboard",
    
    // Chat
    "chat.title": "Live Assistentie",
    "chat.placeholder": "Stel een vraag over deze machine...",
    "chat.send": "Verzenden",
    "chat.thinking": "Nadenken...",
    "chat.greeting": "Hallo! Ik ben uw AI-assistent voor",
    "chat.greetingEnd": "Hoe kan ik u vandaag helpen?",
    
    // Admin
    "admin.title": "Beheerpaneel",
    "admin.manageMachines": "Machines Beheren",
    "admin.manageEmployees": "Medewerkers Beheren",
    "admin.manageContent": "Inhoud Beheren",
    "admin.uploadManual": "Handleiding Uploaden",
    "admin.yourEmployerId": "Uw Werkgever-ID",
    "admin.shareCode": "Deel deze code met medewerkers om lid te worden van uw organisatie",
    
    // Profile
    "profile.title": "Mijn Profiel",
    "profile.personalInfo": "Persoonlijke Informatie",
    "profile.employeeId": "Werknemers-ID",
    "profile.notSet": "Niet ingesteld",
    "profile.memberSince": "Lid sinds",
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
    "common.saveChanges": "Salvează Modificările",
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
    "common.complete": "Finalizează",
    "common.completed": "Finalizat",
    "common.search": "Caută",
    "common.of": "din",
    "common.step": "Pas",
    "common.goBack": "Înapoi",
    
    // Dashboard
    "dashboard.title": "Panou de Control",
    "dashboard.goodMorning": "Bună dimineața",
    "dashboard.goodAfternoon": "Bună ziua",
    "dashboard.goodEvening": "Bună seara",
    "dashboard.completeCheck": "Completați verificarea de siguranță a echipamentului înainte de a începe lucrul.",
    "dashboard.selectEquipment": "Selectați Echipamentul pentru Inspecție",
    "dashboard.noMachines": "Nu vi s-a atribuit încă niciun echipament.",
    "dashboard.noMatch": "Nicio mașină nu corespunde căutării.",
    "dashboard.contactAdmin": "Contactați administratorul pentru acces la echipament.",
    "dashboard.searchPlaceholder": "Căutați mașini după nume sau ID...",
    "dashboard.learn": "Învață",
    "dashboard.quickInspection": "Inspecție Rapidă",
    "dashboard.backToMachines": "Înapoi la Mașini",
    "dashboard.backToCategories": "Înapoi la Categorii",
    "dashboard.backToDashboard": "Înapoi la Panou",
    
    // Learning Environment
    "learn.title": "Mediu de Învățare",
    "learn.completeAll": "Completați toate secțiunile pentru a opera această mașină",
    "learn.howToUse": "Cum să Utilizați",
    "learn.howToUseDesc": "Instrucțiuni pas cu pas despre cum să operați această mașină în siguranță și eficient.",
    "learn.warnings": "Avertismente",
    "learn.warningsDesc": "Avertismente de siguranță și notificări de răspundere. Trebuie să confirmați toate avertismentele pentru a continua.",
    "learn.quiz": "Chestionar",
    "learn.quizDesc": "Testați-vă cunoștințele cu chestionare de siguranță și utilizare pentru a obține certificarea.",
    "learn.visualSupport": "Suport Vizual",
    "learn.visualSupportDesc": "Generați ghiduri vizuale și ilustrații bazate pe manualul mașinii.",
    "learn.liveAssistance": "Asistență Live",
    "learn.liveAssistanceDesc": "Discutați cu un asistent AI instruit pe manualul acestei mașini pentru ajutor instant.",
    "learn.startHere": "Începeți Aici",
    "learn.required": "Obligatoriu",
    "learn.ready": "Gata",
    "learn.locked": "Blocat",
    "learn.aiGenerated": "Generat de AI",
    "learn.aiPowered": "Alimentat de AI",
    "learn.backToLearn": "Înapoi la Mediul de Învățare",
    
    // Instructions
    "instructions.title": "Cum să Utilizați",
    "instructions.noInstructions": "Nicio Instrucțiune Disponibilă",
    "instructions.notGenerated": "Instrucțiunile pentru această mașină nu au fost generate încă.",
    "instructions.addInstructions": "Adaugă Instrucțiuni",
    "instructions.editInstructions": "Editează Instrucțiuni",
    "instructions.stepTitle": "Titlul pasului",
    "instructions.stepContent": "Conținutul pasului - instrucțiuni detaliate...",
    "instructions.addStep": "Adaugă Pas",
    "instructions.saving": "Se salvează...",
    
    // Warnings
    "warnings.title": "Avertismente de Siguranță",
    "warnings.noWarnings": "Niciun Avertisment Disponibil",
    "warnings.notPublished": "Avertismentele pentru această mașină nu au fost publicate încă.",
    "warnings.warning": "Avertisment",
    "warnings.readUnderstood": "Am citit și am înțeles avertismentele de siguranță.",
    "warnings.acceptLiability": "Accept întreaga răspundere pentru aceste riscuri cunoscute.",
    "warnings.completeAll": "Finalizează Toate Avertismentele",
    "warnings.nextWarning": "Următorul Avertisment",
    
    // Quiz
    "quiz.selectCategory": "Selectați Categoria Chestionarului",
    "quiz.safetyQuiz": "Chestionar de Siguranță",
    "quiz.safetyQuizDesc": "Testați-vă cunoștințele despre protocoalele și măsurile de siguranță.",
    "quiz.usageQuiz": "Chestionar de Utilizare",
    "quiz.usageQuizDesc": "Testați-vă înțelegerea procedurilor de operare a mașinii.",
    "quiz.question": "Întrebare",
    "quiz.trueBtn": "ADEVĂRAT",
    "quiz.falseBtn": "FALS",
    "quiz.correct": "Corect!",
    "quiz.incorrect": "Incorect",
    "quiz.passed": "Trecut",
    "quiz.failed": "Eșuat",
    
    // Auth
    "auth.signIn": "Autentificare",
    "auth.signUp": "Înregistrare",
    "auth.createAccount": "Creează Cont",
    "auth.email": "Adresă de Email",
    "auth.password": "Parolă",
    "auth.fullName": "Nume Complet",
    "auth.employeeId": "ID Angajat (Opțional)",
    "auth.employerId": "ID Angajator",
    "auth.askAdmin": "Cereți administratorului ID-ul Angajatorului",
    "auth.accountType": "Tip de Cont",
    "auth.worker": "Muncitor",
    "auth.admin": "Administrator",
    "auth.pleaseWait": "Vă rugăm așteptați...",
    "auth.noAccount": "Nu aveți cont? Înregistrați-vă",
    "auth.hasAccount": "Aveți deja cont? Autentificați-vă",
    "auth.accountCreated": "Cont creat!",
    "auth.checkEmail": "Verificați emailul pentru a confirma contul.",
    
    // Safety Success
    "success.title": "Verificare de Siguranță Completă",
    "success.certified": "Sunteți acum certificat să operați această mașină.",
    "success.employee": "Angajat",
    "success.machine": "Mașină",
    "success.timestamp": "Marcaj Temporal",
    "success.status": "Status",
    "success.safe": "SIGUR DE OPERAT",
    
    // Do Not Operate
    "failed.title": "NU OPERAȚI",
    "failed.subtitle": "Verificare de Siguranță Eșuată",
    "failed.message": "Nu ați trecut chestionarul de siguranță. Revizuiți materialele de siguranță și încercați din nou.",
    "failed.returnDashboard": "Înapoi la Panou",
    
    // Chat
    "chat.title": "Asistență Live",
    "chat.placeholder": "Puneți o întrebare despre această mașină...",
    "chat.send": "Trimite",
    "chat.thinking": "Se gândește...",
    "chat.greeting": "Bună! Sunt asistentul dvs. AI pentru",
    "chat.greetingEnd": "Cum vă pot ajuta astăzi?",
    
    // Admin
    "admin.title": "Panou de Administrare",
    "admin.manageMachines": "Gestionează Mașini",
    "admin.manageEmployees": "Gestionează Angajați",
    "admin.manageContent": "Gestionează Conținut",
    "admin.uploadManual": "Încarcă Manual",
    "admin.yourEmployerId": "ID-ul Dvs. de Angajator",
    "admin.shareCode": "Distribuiți acest cod angajaților pentru a se alătura organizației",
    
    // Profile
    "profile.title": "Profilul Meu",
    "profile.personalInfo": "Informații Personale",
    "profile.employeeId": "ID Angajat",
    "profile.notSet": "Nesetat",
    "profile.memberSince": "Membru din",
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
    "common.saveChanges": "Guardar Cambios",
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
    "common.complete": "Completar",
    "common.completed": "Completado",
    "common.search": "Buscar",
    "common.of": "de",
    "common.step": "Paso",
    "common.goBack": "Volver",
    
    // Dashboard
    "dashboard.title": "Panel de Control",
    "dashboard.goodMorning": "Buenos Días",
    "dashboard.goodAfternoon": "Buenas Tardes",
    "dashboard.goodEvening": "Buenas Noches",
    "dashboard.completeCheck": "Complete su verificación de seguridad del equipo antes de comenzar a trabajar.",
    "dashboard.selectEquipment": "Seleccione Equipo para Inspección",
    "dashboard.noMachines": "Aún no se le ha asignado ningún equipo.",
    "dashboard.noMatch": "Ninguna máquina coincide con su búsqueda.",
    "dashboard.contactAdmin": "Contacte a su administrador para obtener acceso al equipo.",
    "dashboard.searchPlaceholder": "Buscar máquinas por nombre o ID...",
    "dashboard.learn": "Aprender",
    "dashboard.quickInspection": "Inspección Rápida",
    "dashboard.backToMachines": "Volver a Máquinas",
    "dashboard.backToCategories": "Volver a Categorías",
    "dashboard.backToDashboard": "Volver al Panel",
    
    // Learning Environment
    "learn.title": "Entorno de Aprendizaje",
    "learn.completeAll": "Complete todas las secciones para operar esta máquina",
    "learn.howToUse": "Cómo Usar",
    "learn.howToUseDesc": "Instrucciones paso a paso sobre cómo operar esta máquina de forma segura y efectiva.",
    "learn.warnings": "Advertencias",
    "learn.warningsDesc": "Advertencias de seguridad y avisos de responsabilidad. Debe reconocer todas las advertencias para continuar.",
    "learn.quiz": "Cuestionario",
    "learn.quizDesc": "Pruebe sus conocimientos con cuestionarios de seguridad y uso para certificarse.",
    "learn.visualSupport": "Soporte Visual",
    "learn.visualSupportDesc": "Genere guías visuales e ilustraciones basadas en el manual de la máquina.",
    "learn.liveAssistance": "Asistencia en Vivo",
    "learn.liveAssistanceDesc": "Chatee con un asistente de IA entrenado en el manual de esta máquina para ayuda instantánea.",
    "learn.startHere": "Comience Aquí",
    "learn.required": "Requerido",
    "learn.ready": "Listo",
    "learn.locked": "Bloqueado",
    "learn.aiGenerated": "Generado por IA",
    "learn.aiPowered": "Potenciado por IA",
    "learn.backToLearn": "Volver al Entorno de Aprendizaje",
    
    // Instructions
    "instructions.title": "Cómo Usar",
    "instructions.noInstructions": "No Hay Instrucciones Disponibles",
    "instructions.notGenerated": "Las instrucciones para esta máquina aún no se han generado.",
    "instructions.addInstructions": "Añadir Instrucciones",
    "instructions.editInstructions": "Editar Instrucciones",
    "instructions.stepTitle": "Título del paso",
    "instructions.stepContent": "Contenido del paso - instrucciones detalladas...",
    "instructions.addStep": "Añadir Paso",
    "instructions.saving": "Guardando...",
    
    // Warnings
    "warnings.title": "Advertencias de Seguridad",
    "warnings.noWarnings": "No Hay Advertencias Disponibles",
    "warnings.notPublished": "Las advertencias para esta máquina aún no se han publicado.",
    "warnings.warning": "Advertencia",
    "warnings.readUnderstood": "He leído y entendido las advertencias de seguridad.",
    "warnings.acceptLiability": "Acepto la responsabilidad total por estos riesgos conocidos.",
    "warnings.completeAll": "Completar Todas las Advertencias",
    "warnings.nextWarning": "Siguiente Advertencia",
    
    // Quiz
    "quiz.selectCategory": "Seleccione Categoría del Cuestionario",
    "quiz.safetyQuiz": "Cuestionario de Seguridad",
    "quiz.safetyQuizDesc": "Pruebe sus conocimientos sobre protocolos y precauciones de seguridad.",
    "quiz.usageQuiz": "Cuestionario de Uso",
    "quiz.usageQuizDesc": "Pruebe su comprensión de los procedimientos de operación de la máquina.",
    "quiz.question": "Pregunta",
    "quiz.trueBtn": "VERDADERO",
    "quiz.falseBtn": "FALSO",
    "quiz.correct": "¡Correcto!",
    "quiz.incorrect": "Incorrecto",
    "quiz.passed": "Aprobado",
    "quiz.failed": "Reprobado",
    
    // Auth
    "auth.signIn": "Iniciar Sesión",
    "auth.signUp": "Registrarse",
    "auth.createAccount": "Crear Cuenta",
    "auth.email": "Correo Electrónico",
    "auth.password": "Contraseña",
    "auth.fullName": "Nombre Completo",
    "auth.employeeId": "ID de Empleado (Opcional)",
    "auth.employerId": "ID del Empleador",
    "auth.askAdmin": "Solicite a su administrador el ID del Empleador",
    "auth.accountType": "Tipo de Cuenta",
    "auth.worker": "Trabajador",
    "auth.admin": "Administrador",
    "auth.pleaseWait": "Por favor espere...",
    "auth.noAccount": "¿No tiene cuenta? Regístrese",
    "auth.hasAccount": "¿Ya tiene cuenta? Inicie sesión",
    "auth.accountCreated": "¡Cuenta creada!",
    "auth.checkEmail": "Revise su correo para verificar su cuenta.",
    
    // Safety Success
    "success.title": "Verificación de Seguridad Completa",
    "success.certified": "Ahora está certificado para operar esta máquina.",
    "success.employee": "Empleado",
    "success.machine": "Máquina",
    "success.timestamp": "Marca de Tiempo",
    "success.status": "Estado",
    "success.safe": "SEGURO PARA OPERAR",
    
    // Do Not Operate
    "failed.title": "NO OPERAR",
    "failed.subtitle": "Verificación de Seguridad Fallida",
    "failed.message": "No ha aprobado el cuestionario de seguridad. Revise los materiales de seguridad e intente de nuevo.",
    "failed.returnDashboard": "Volver al Panel",
    
    // Chat
    "chat.title": "Asistencia en Vivo",
    "chat.placeholder": "Haga una pregunta sobre esta máquina...",
    "chat.send": "Enviar",
    "chat.thinking": "Pensando...",
    "chat.greeting": "¡Hola! Soy su asistente de IA para",
    "chat.greetingEnd": "¿Cómo puedo ayudarle hoy?",
    
    // Admin
    "admin.title": "Panel de Administración",
    "admin.manageMachines": "Gestionar Máquinas",
    "admin.manageEmployees": "Gestionar Empleados",
    "admin.manageContent": "Gestionar Contenido",
    "admin.uploadManual": "Subir Manual",
    "admin.yourEmployerId": "Su ID de Empleador",
    "admin.shareCode": "Comparta este código con los trabajadores para unirse a su organización",
    
    // Profile
    "profile.title": "Mi Perfil",
    "profile.personalInfo": "Información Personal",
    "profile.employeeId": "ID de Empleado",
    "profile.notSet": "No establecido",
    "profile.memberSince": "Miembro desde",
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
    "common.saveChanges": "Änderungen Speichern",
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
    "common.complete": "Abschließen",
    "common.completed": "Abgeschlossen",
    "common.search": "Suchen",
    "common.of": "von",
    "common.step": "Schritt",
    "common.goBack": "Zurückgehen",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.goodMorning": "Guten Morgen",
    "dashboard.goodAfternoon": "Guten Tag",
    "dashboard.goodEvening": "Guten Abend",
    "dashboard.completeCheck": "Schließen Sie Ihre Gerätesicherheitsprüfung ab, bevor Sie mit der Arbeit beginnen.",
    "dashboard.selectEquipment": "Wählen Sie Ausrüstung für die Inspektion",
    "dashboard.noMachines": "Ihnen wurde noch keine Ausrüstung zugewiesen.",
    "dashboard.noMatch": "Keine Maschinen entsprechen Ihrer Suche.",
    "dashboard.contactAdmin": "Kontaktieren Sie Ihren Administrator für Gerätezugang.",
    "dashboard.searchPlaceholder": "Maschinen nach Name oder ID suchen...",
    "dashboard.learn": "Lernen",
    "dashboard.quickInspection": "Schnellinspektion",
    "dashboard.backToMachines": "Zurück zu Maschinen",
    "dashboard.backToCategories": "Zurück zu Kategorien",
    "dashboard.backToDashboard": "Zurück zum Dashboard",
    
    // Learning Environment
    "learn.title": "Lernumgebung",
    "learn.completeAll": "Schließen Sie alle Abschnitte ab, um diese Maschine zu bedienen",
    "learn.howToUse": "Bedienung",
    "learn.howToUseDesc": "Schritt-für-Schritt-Anleitung zur sicheren und effektiven Bedienung dieser Maschine.",
    "learn.warnings": "Warnungen",
    "learn.warningsDesc": "Sicherheitswarnungen und Haftungshinweise. Sie müssen alle Warnungen bestätigen, um fortzufahren.",
    "learn.quiz": "Quiz",
    "learn.quizDesc": "Testen Sie Ihr Wissen mit Sicherheits- und Bedienungsquizzen zur Zertifizierung.",
    "learn.visualSupport": "Visuelle Unterstützung",
    "learn.visualSupportDesc": "Erstellen Sie visuelle Anleitungen und Illustrationen basierend auf dem Maschinenhandbuch.",
    "learn.liveAssistance": "Live-Unterstützung",
    "learn.liveAssistanceDesc": "Chatten Sie mit einem KI-Assistenten, der auf das Handbuch dieser Maschine trainiert ist.",
    "learn.startHere": "Hier Starten",
    "learn.required": "Erforderlich",
    "learn.ready": "Bereit",
    "learn.locked": "Gesperrt",
    "learn.aiGenerated": "KI-Generiert",
    "learn.aiPowered": "KI-Unterstützt",
    "learn.backToLearn": "Zurück zur Lernumgebung",
    
    // Instructions
    "instructions.title": "Bedienung",
    "instructions.noInstructions": "Keine Anweisungen Verfügbar",
    "instructions.notGenerated": "Anweisungen für diese Maschine wurden noch nicht erstellt.",
    "instructions.addInstructions": "Anweisungen Hinzufügen",
    "instructions.editInstructions": "Anweisungen Bearbeiten",
    "instructions.stepTitle": "Schritttitel",
    "instructions.stepContent": "Schrittinhalt - detaillierte Anweisungen...",
    "instructions.addStep": "Schritt Hinzufügen",
    "instructions.saving": "Speichern...",
    
    // Warnings
    "warnings.title": "Sicherheitswarnungen",
    "warnings.noWarnings": "Keine Warnungen Verfügbar",
    "warnings.notPublished": "Warnungen für diese Maschine wurden noch nicht veröffentlicht.",
    "warnings.warning": "Warnung",
    "warnings.readUnderstood": "Ich habe die Sicherheitswarnungen gelesen und verstanden.",
    "warnings.acceptLiability": "Ich übernehme die volle Haftung für diese bekannten Risiken.",
    "warnings.completeAll": "Alle Warnungen Abschließen",
    "warnings.nextWarning": "Nächste Warnung",
    
    // Quiz
    "quiz.selectCategory": "Quiz-Kategorie Auswählen",
    "quiz.safetyQuiz": "Sicherheitsquiz",
    "quiz.safetyQuizDesc": "Testen Sie Ihr Wissen über Sicherheitsprotokolle und Vorsichtsmaßnahmen.",
    "quiz.usageQuiz": "Bedienungsquiz",
    "quiz.usageQuizDesc": "Testen Sie Ihr Verständnis der Maschinenbedienungsverfahren.",
    "quiz.question": "Frage",
    "quiz.trueBtn": "WAHR",
    "quiz.falseBtn": "FALSCH",
    "quiz.correct": "Richtig!",
    "quiz.incorrect": "Falsch",
    "quiz.passed": "Bestanden",
    "quiz.failed": "Nicht Bestanden",
    
    // Auth
    "auth.signIn": "Anmelden",
    "auth.signUp": "Registrieren",
    "auth.createAccount": "Konto Erstellen",
    "auth.email": "E-Mail-Adresse",
    "auth.password": "Passwort",
    "auth.fullName": "Vollständiger Name",
    "auth.employeeId": "Mitarbeiter-ID (Optional)",
    "auth.employerId": "Arbeitgeber-ID",
    "auth.askAdmin": "Fragen Sie Ihren Administrator nach der Arbeitgeber-ID",
    "auth.accountType": "Kontotyp",
    "auth.worker": "Arbeiter",
    "auth.admin": "Administrator",
    "auth.pleaseWait": "Bitte warten...",
    "auth.noAccount": "Kein Konto? Registrieren",
    "auth.hasAccount": "Bereits ein Konto? Anmelden",
    "auth.accountCreated": "Konto erstellt!",
    "auth.checkEmail": "Überprüfen Sie Ihre E-Mail zur Kontobestätigung.",
    
    // Safety Success
    "success.title": "Sicherheitsüberprüfung Abgeschlossen",
    "success.certified": "Sie sind jetzt zertifiziert, diese Maschine zu bedienen.",
    "success.employee": "Mitarbeiter",
    "success.machine": "Maschine",
    "success.timestamp": "Zeitstempel",
    "success.status": "Status",
    "success.safe": "SICHER ZU BEDIENEN",
    
    // Do Not Operate
    "failed.title": "NICHT BEDIENEN",
    "failed.subtitle": "Sicherheitsüberprüfung Fehlgeschlagen",
    "failed.message": "Sie haben das Sicherheitsquiz nicht bestanden. Überprüfen Sie die Sicherheitsmaterialien und versuchen Sie es erneut.",
    "failed.returnDashboard": "Zurück zum Dashboard",
    
    // Chat
    "chat.title": "Live-Unterstützung",
    "chat.placeholder": "Stellen Sie eine Frage zu dieser Maschine...",
    "chat.send": "Senden",
    "chat.thinking": "Denkt nach...",
    "chat.greeting": "Hallo! Ich bin Ihr KI-Assistent für",
    "chat.greetingEnd": "Wie kann ich Ihnen heute helfen?",
    
    // Admin
    "admin.title": "Admin-Bereich",
    "admin.manageMachines": "Maschinen Verwalten",
    "admin.manageEmployees": "Mitarbeiter Verwalten",
    "admin.manageContent": "Inhalte Verwalten",
    "admin.uploadManual": "Handbuch Hochladen",
    "admin.yourEmployerId": "Ihre Arbeitgeber-ID",
    "admin.shareCode": "Teilen Sie diesen Code mit Mitarbeitern, um Ihrer Organisation beizutreten",
    
    // Profile
    "profile.title": "Mein Profil",
    "profile.personalInfo": "Persönliche Informationen",
    "profile.employeeId": "Mitarbeiter-ID",
    "profile.notSet": "Nicht festgelegt",
    "profile.memberSince": "Mitglied seit",
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
