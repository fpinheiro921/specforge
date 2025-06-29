
import React, { useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { IdeaInputForm, ModuleInfo } from './components/IdeaInputForm';
import { SpecDisplay } from './components/SpecDisplay';
import { ProcessAnimator } from './components/ProcessAnimator';
import { ErrorMessage } from './components/ErrorMessage';
import { HomeScreen } from './components/HomeScreen';
import { SavedSpecsModal, SavedSpec } from './components/SavedSpecsModal';
import { GoogleLogoIcon } from './components/GoogleLogoIcon';
import { BillingPage } from './components/BillingPage';
import { generateSpecFromIdea } from './services/geminiService';
import { 
  signInWithGoogle, 
  signOutUser, 
  saveSpecToFirestore, 
  getUserSpecs,
  deleteSpecFromFirestore,
  updateSpecInFirestore,
  getOrCreateUserProfile,
  incrementGenerationCount,
  UserProfile,
  FREE_GENERATION_LIMIT
} from './services/firebaseService';

type View = 'home' | 'app' | 'billing';

export const ALL_AVAILABLE_MODULES: ModuleInfo[] = [
  // Free Modules
  { id: 'prd', name: 'PRD (Product Requirements Document)', icon: 'description', isPremium: false },
  { id: 'tech_stack', name: 'Tech Stack Specification', icon: 'layers', isPremium: false },
  { id: 'project_structure', name: 'Project Structure', icon: 'account_tree', isPremium: false },
  { id: 'user_flow_textual', name: 'User Flow (textual)', icon: 'flowsheet', isPremium: false },
  // Premium Modules
  { id: 'schema_design', name: 'Schema Design', icon: 'schema', isPremium: true },
  { id: 'user_flow_chart', name: 'User Flow Flow-Chart', icon: 'insights', isPremium: true },
  { id: 'backend_structure', name: 'Backend Structure', icon: 'dns', isPremium: true },
  { id: 'implementation_plan', name: 'Implementation Plan', icon: 'event_note', isPremium: true },
  { id: 'project_rules', name: 'Project Rules & Coding Standards', icon: 'rule', isPremium: true },
  { id: 'security_guidelines', name: 'Security Guidelines', icon: 'security', isPremium: true },
  { id: 'styling_guidelines', name: 'Styling Guidelines', icon: 'palette', isPremium: true },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [ideaText, setIdeaText] = useState<string>('');
  const [generatedSpec, setGeneratedSpec] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiApiKeyIsSet, setGeminiApiKeyIsSet] = useState<boolean>(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(
    ALL_AVAILABLE_MODULES.map(m => m.id) 
  );
  
  const [savedSpecs, setSavedSpecs] = useState<SavedSpec[]>([]);
  const [showSavedSpecsModal, setShowSavedSpecsModal] = useState<boolean>(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authIsLoading, setAuthIsLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Current Spec State
  const [currentSpecId, setCurrentSpecId] = useState<string | null>(null);

  const generationsRemaining = userProfile ? FREE_GENERATION_LIMIT - userProfile.generationsUsedThisMonth : null;


  useEffect(() => {
    const geminiKeyExists = typeof process.env.API_KEY === 'string' && process.env.API_KEY.trim() !== '';
    setGeminiApiKeyIsSet(geminiKeyExists);
    if (!geminiKeyExists) {
       console.warn("Gemini API_KEY environment variable is not set. Spec generation will be disabled.");
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthIsLoading(true);
      
      const sessionTimeout = setTimeout(() => {
          console.error("Authentication timed out after 15 seconds. This might be a network or configuration issue.");
          if (authIsLoading) { // Only trigger if it's still loading
            setError("Authentication is taking too long. Please try again later or check your connection.");
            setCurrentUser(null);
            setUserProfile(null);
            setCurrentView('home');
            setAuthIsLoading(false);
          }
      }, 15000); // 15-second timeout

      try {
        if (user) {
          setCurrentUser(user);
          const profile = await getOrCreateUserProfile(user.uid);
          setUserProfile(profile);
          await loadSpecsFromFirestore(user.uid);
          setCurrentView('app');
        } else {
          setCurrentUser(null);
          setSavedSpecs([]);
          setUserProfile(null);
          setCurrentView('home');
        }
      } catch (e: any) {
        console.error("Failed to initialize user session:", e);
        setError(`Failed to load your profile or specs: ${e.message}`);
        setCurrentUser(null);
        setUserProfile(null);
        setCurrentView('home');
      } finally {
        clearTimeout(sessionTimeout);
        setAuthIsLoading(false);
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const loadSpecsFromFirestore = async (userId: string) => {
    if (!userId) return;
    try {
      const specs = await getUserSpecs(userId);
      setSavedSpecs(specs);
    } catch (e: any) {
      console.error("Failed to load specs from Firestore:", e);
      setError(`Could not load your saved specifications: ${e.message}`);
    }
  };

  const handleChunkReceived = useCallback((chunk: string) => {
    setGeneratedSpec(prevSpec => prevSpec + chunk);
  }, []);

  const handleGenerationUsed = useCallback(async () => {
    if (!currentUser) return;
    await incrementGenerationCount(currentUser.uid);
    const updatedProfile = await getOrCreateUserProfile(currentUser.uid);
    setUserProfile(updatedProfile);
  }, [currentUser]);

  const filterPremiumContent = (specContent: string, selectedModuleIds: string[]): string => {
    const premiumModules = ALL_AVAILABLE_MODULES.filter(m => m.isPremium && selectedModuleIds.includes(m.id));
    if (premiumModules.length === 0) {
      return specContent;
    }
  
    let filteredContent = specContent;
  
    for (const module of premiumModules) {
      const escapedModuleName = module.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sectionRegex = new RegExp(`(###\\s*\\d+\\.\\s*${escapedModuleName}[^\\n]*)([\\s\\S]*?)(?=\\n###\\s*\\d+\\.|$)`, 'g');
      
      const placeholder = `\n\n> ✨ **Premium Module**\n>\n> This section is available on our Pro and Team plans. Upgrade to unlock the full content for **${module.name}** and get access to advanced features like AI-Powered Spec Analysis.\n>\n> *Please visit the "Billing" page to see our upgrade options.*\n`;
      
      filteredContent = filteredContent.replace(sectionRegex, (match, heading) => {
        return heading + placeholder;
      });
    }
    
    return filteredContent;
  };
  
  const handleGenerateSpec = useCallback(async () => {
    if (!geminiApiKeyIsSet) {
      setError("The AI service is not configured correctly. Please try again later.");
      return;
    }
    if (selectedModules.length === 0) {
      setError("Please select at least one documentation module to generate.");
      return;
    }
    if (!currentUser) {
      setError("Please log in to generate a specification.");
      return;
    }
    if (generationsRemaining !== null && generationsRemaining <= 0) {
      setError("You have used all your free generations for this month. Please visit the Billing page to see upcoming plans for more.");
      setCurrentView('billing');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedSpec('');
    setCurrentSpecId(null);

    try {
      const fullSpec = await generateSpecFromIdea(ideaText, selectedModules, handleChunkReceived);
      
      let specToDisplay = fullSpec;
      if (userProfile?.plan === 'free') {
        console.log("User is on free plan. Filtering premium content.");
        specToDisplay = filterPremiumContent(fullSpec, selectedModules);
      }
      
      setGeneratedSpec(specToDisplay);
      
      await handleGenerationUsed();
    } catch (err) {
      console.error("Error generating spec:", err);
      if (err instanceof Error) {
        setError(`Failed to generate specification: ${err.message}. Please try again.`);
      } else {
        setError("An unknown error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [ideaText, geminiApiKeyIsSet, selectedModules, handleChunkReceived, currentUser, generationsRemaining, handleGenerationUsed, userProfile]);


  const navigateToApp = () => {
    setCurrentView('app');
  };

  const handleSaveSpec = async () => {
    if (!generatedSpec || isLoading || !currentUser) {
      alert("No spec generated, generation is in progress, or you are not logged in.");
      return;
    }

    const name = currentSpecId ? undefined : window.prompt("Enter a name for this new specification:", `Spec ${new Date().toLocaleDateString()}`);
    if (name === null) return;

    const specData = {
      name: name || savedSpecs.find(s => s.id === currentSpecId)?.name || 'Untitled Spec',
      ideaText,
      generatedSpec,
      selectedModules,
    };
    
    setIsLoading(true);
    try {
      if (currentSpecId) {
        await updateSpecInFirestore(currentSpecId, specData);
        alert(`Specification updated successfully!`);
      } else {
        const newId = await saveSpecToFirestore(currentUser.uid, specData);
        setCurrentSpecId(newId);
        alert(`Specification "${specData.name}" saved to the cloud!`);
      }
      await loadSpecsFromFirestore(currentUser.uid);
    } catch (e: any) {
      console.error("Failed to save spec to Firestore:", e);
      setError(`Could not save specification to the cloud: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  const handleLoadSpec = async (specToLoad: SavedSpec) => {
    if (specToLoad) {
      setIdeaText(specToLoad.ideaText);
      setGeneratedSpec(specToLoad.generatedSpec);
      setSelectedModules(Array.isArray(specToLoad.selectedModules) ? specToLoad.selectedModules : ALL_AVAILABLE_MODULES.map(m => m.id));
      setCurrentSpecId(specToLoad.id);
      setError(null);
      setIsLoading(false); 
      setShowSavedSpecsModal(false); 
      setCurrentView('app');
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
      alert(`Specification "${specToLoad.name}" loaded from the cloud.`);
    } else {
      alert("Error: Could not find the specification to load.");
      if(currentUser) loadSpecsFromFirestore(currentUser.uid);
    }
  };

  const handleDeleteSpec = async (specId: string) => {
    if (!currentUser) return;
    const specToDelete = savedSpecs.find(s => s.id === specId);
    if (specToDelete && window.confirm(`Are you sure you want to delete "${specToDelete.name}" from the cloud? This action cannot be undone.`)) {
      try {
        await deleteSpecFromFirestore(specId);
        setSavedSpecs(savedSpecs.filter(s => s.id !== specId));
        alert(`Specification "${specToDelete.name}" deleted from the cloud.`);
        if(currentSpecId === specId) {
            setIdeaText('');
            setGeneratedSpec('');
            setCurrentSpecId(null);
        }
      } catch (e: any) {
        console.error("Failed to delete spec from Firestore:", e);
        setError(`Could not delete specification from the cloud: ${e.message}`);
      }
    }
  };

  const handleSpecContentChange = useCallback((newSpecContent: string) => {
    setGeneratedSpec(newSpecContent);
  }, []);
  
  const handleLogin = async () => {
    setAuthIsLoading(true);
    setError(null);
    try {
      // The new signInWithGoogle uses a popup and will resolve/reject here.
      await signInWithGoogle();
      // onAuthStateChanged will handle the successful login state change automatically.
      // setAuthIsLoading(false) will be called within the onAuthStateChanged listener.
    } catch (error: any) {
      console.error("Login failed:", error);
      let errorMessage = `Login failed: ${error.message}.`;
      
      if (error.code === 'auth/popup-closed-by-user') {
          errorMessage = "Sign-in process was cancelled.";
      } else if (error.code === 'auth/popup-blocked') {
          errorMessage = "Sign-in popup was blocked by your browser. Please allow popups for this site and try again.";
      } else if (error.code === 'auth/unauthorized-domain') {
          const firebaseProjectUrl = `https://console.firebase.google.com/project/dulcet-opus-461713-n0/authentication/settings`;
          errorMessage = `Login failed: This application's domain (${window.location.hostname}) is not authorized for sign-in. To fix this, you MUST add "${window.location.hostname}" to the list of 'Authorized domains' in your Firebase project settings. You can access the settings page here: ${firebaseProjectUrl}`;
      }
      
      setError(errorMessage);
      setAuthIsLoading(false); // Reset loading state on explicit failure.
    }
  };
  
  const handleLogout = async () => {
    setError(null);
    try {
      await signOutUser();
      setIdeaText('');
      setGeneratedSpec('');
      setCurrentSpecId(null);
      setError(null);
    } catch (error: any) {
        console.error("Logout failed:", error);
        setError(`Logout failed: ${error.message}`);
    }
  };


  if (authIsLoading && currentView === 'home') {
     return (
        <div className="w-full h-screen flex flex-col items-center justify-center text-center bg-base">
             <div className="text-center py-10 text-text-muted">
                <svg className="animate-spin h-8 w-8 text-accent mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Connecting to SpecForge...</p>
            </div>
        </div>
    )
  }

  if (currentView === 'home') {
    return <HomeScreen onGetStarted={navigateToApp} onLogin={handleLogin} currentUser={currentUser} />;
  }
  
  const renderAppContent = () => {
    if (authIsLoading) {
        return (
            <div className="w-full h-96 flex items-center justify-center text-center">
                 <div className="text-center py-10 text-text-muted">
                    <svg className="animate-spin h-8 w-8 text-accent mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p>Authenticating & Loading Profile...</p>
                </div>
            </div>
        )
    }
    
    if (error) {
        return <ErrorMessage message={error} onRetry={currentUser ? undefined : handleLogin} />;
    }

    if (!currentUser) {
        return (
            <div className="w-full max-w-lg mx-auto text-center bg-panel p-10 rounded-lg shadow-xl">
                <span className="material-symbols-outlined text-5xl text-accent mb-4">login</span>
                <h2 className="text-2xl font-bold text-text-heading mb-3 font-display">Welcome to SpecForge</h2>
                <p className="text-text-body mb-6">Please log in to create, manage, and save your technical specifications to the cloud.</p>
                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full sm:w-auto bg-accent text-white font-semibold rounded-md px-8 py-3 hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out flex items-center justify-center mx-auto shadow-lg hover:shadow-xl hover:scale-[1.02]"
                >
                    <GoogleLogoIcon className="w-5 h-5 mr-3" />
                    Sign In with Google
                </button>
            </div>
        )
    }
    
    return (
      <>
        <IdeaInputForm
          ideaText={ideaText}
          setIdeaText={setIdeaText}
          onGenerate={handleGenerateSpec}
          isLoading={isLoading} 
          apiKeyMissing={!geminiApiKeyIsSet} 
          availableModules={ALL_AVAILABLE_MODULES}
          selectedModules={selectedModules}
          onSelectedModulesChange={setSelectedModules}
          isLoggedIn={!!currentUser}
          generationsRemaining={generationsRemaining}
        />

        {isLoading && <ProcessAnimator />}
        
        {error && <ErrorMessage message={error} onRetry={error.includes("generate") ? handleGenerateSpec : undefined} />}

        {(generatedSpec || (isLoading && !generatedSpec)) && !error && (
            <SpecDisplay 
              specContent={generatedSpec} 
              isLoading={isLoading}
              onSaveSpec={handleSaveSpec}
              onSpecContentChange={handleSpecContentChange}
              isLoggedIn={!!currentUser}
              currentSpecId={currentSpecId}
              userProfile={userProfile}
              generationsRemaining={generationsRemaining}
              onGenerationUsed={handleGenerationUsed}
          />
        )}
        {generatedSpec && error && (
              <SpecDisplay 
              specContent={generatedSpec} 
              isLoading={false} 
              onSaveSpec={handleSaveSpec}
              onSpecContentChange={handleSpecContentChange}
              isLoggedIn={!!currentUser}
              currentSpecId={currentSpecId}
              userProfile={userProfile}
              generationsRemaining={generationsRemaining}
              onGenerationUsed={handleGenerationUsed}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-base text-text-body flex flex-col items-center py-6 px-4 selection:bg-accent selection:text-white">
        <header className="w-full max-w-6xl mx-auto mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-9 h-9 bg-panel rounded-md flex items-center justify-center">
                <span className="material-symbols-outlined text-accent text-2xl">hub</span>
            </div>
            <h1 className="text-2xl font-bold text-text-heading font-display">
              Spec<span className="text-accent">Forge</span>
            </h1>
          </div>
          <div className="flex items-center space-x-3">
             {currentUser && (
                <>
                  {userProfile && (
                    <div className="hidden sm:flex items-center text-xs bg-panel px-3 py-1.5 rounded-md text-text-muted">
                        <span className="material-symbols-outlined mr-1.5 text-accent" style={{ fontSize: '16px' }}>local_fire_department</span>
                        <span>Generations Left: </span>
                        <span className="font-bold text-text-body ml-1">{Math.max(0, generationsRemaining ?? 0)} / {FREE_GENERATION_LIMIT}</span>
                    </div>
                  )}
                  <button
                      onClick={() => setCurrentView('app')}
                      className={`p-2 bg-panel hover:bg-accent/20 text-text-muted hover:text-accent focus:outline-none focus:ring-1 focus:ring-accent rounded-md transition-colors flex items-center justify-center text-sm ${currentView === 'app' ? 'text-accent bg-accent/10' : ''}`}
                      aria-label="Go to app"
                      title="Go to App"
                    >
                      <span className="material-symbols-outlined mr-1 sm:mr-1.5" style={{ fontSize: '20px' }}>apps</span> 
                      App
                  </button>
                  <button
                    onClick={() => setShowSavedSpecsModal(true)}
                    className="p-2 bg-panel hover:bg-accent/20 text-text-muted hover:text-accent focus:outline-none focus:ring-1 focus:ring-accent rounded-md transition-colors flex items-center justify-center text-sm"
                    aria-label="Open saved specifications"
                    title="My Cloud Specs"
                  >
                    <span className="material-symbols-outlined mr-1 sm:mr-1.5" style={{ fontSize: '20px' }}>cloud_done</span> 
                    My Specs
                  </button>
                  <button
                    onClick={() => setCurrentView('billing')}
                    className={`p-2 bg-panel hover:bg-accent/20 text-text-muted hover:text-accent focus:outline-none focus:ring-1 focus:ring-accent rounded-md transition-colors flex items-center justify-center text-sm ${currentView === 'billing' ? 'text-accent bg-accent/10' : ''}`}
                    aria-label="View billing and plans"
                    title="Billing & Plans"
                  >
                    <span className="material-symbols-outlined mr-1 sm:mr-1.5" style={{ fontSize: '20px' }}>credit_card</span> 
                    Billing
                  </button>
                </>
             )}
             {currentUser ? (
                <div className="flex items-center space-x-3">
                    <img src={currentUser.photoURL || undefined} alt="User" className="w-8 h-8 rounded-full" />
                    <button onClick={handleLogout} className="text-sm text-text-muted hover:text-accent transition-colors flex items-center space-x-1">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
                      <span>Logout</span>
                    </button>
                </div>
             ) : !authIsLoading && (
                <button
                    onClick={handleLogin}
                    className="bg-panel hover:bg-accent/20 text-text-body font-medium rounded-md px-4 py-2 text-sm transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   <GoogleLogoIcon className="w-4 h-4 mr-2" />
                   Sign In
                </button>
             )}
          </div>
        </header>

        <main className={`w-full ${currentView === 'billing' ? 'max-w-6xl' : 'max-w-4xl'} space-y-8`}>
            {currentView === 'app' && renderAppContent()}
            {currentView === 'billing' && (currentUser ? <BillingPage /> : renderAppContent())}
        </main>

        <footer className="mt-12 text-center text-text-muted text-sm w-full max-w-4xl mx-auto border-t border-panel pt-6">
          <p>&copy; {new Date().getFullYear()} SpecForge. All rights reserved.</p>
           {!geminiApiKeyIsSet && (
              <p className="text-danger-DEFAULT mt-2" role="alert">
                Warning: The application's AI service is not configured. AI features are disabled.
              </p>
            )}
        </footer>
      </div>
      {showSavedSpecsModal && currentUser && ( 
        <SavedSpecsModal
          savedSpecs={savedSpecs}
          onLoadSpec={handleLoadSpec}
          onDeleteSpec={handleDeleteSpec}
          onClose={() => setShowSavedSpecsModal(false)}
          isLoading={isLoading} 
        />
      )}
    </>
  );
};

export default App;
