
import React, { useEffect, useState, CSSProperties, useMemo, useCallback, Fragment, FunctionComponent, ReactNode, ComponentType, HTMLAttributes, ClassAttributes } from 'react';
import ReactMarkdown, { Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { ErrorMessage } from './ErrorMessage'; 
import { elaborateOnSection, analyzeSpecification, regenerateSection } from '../services/geminiService';
import { UserProfile } from '../services/firebaseService';

type SyntaxHighlighterStyle = { [key: string]: CSSProperties };

// Define ExtraProps if ReactMarkdown's types don't expose it or if you add custom props.
// For standard HTML attributes, they are usually included in React's HTMLAttributes.
interface ExtraProps {
  // Add any custom props passed by ReactMarkdown or remark/rehype plugins if necessary
  [key: string]: unknown;
}

interface CustomCodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  // Allow any other props that might be passed by ReactMarkdown or plugins
  [key: string]: any;
}


interface ParsedSection {
  id: string;
  title: string; 
  content: string; 
}

interface SpecDisplayProps {
  specContent: string;
  isLoading: boolean;
  onSaveSpec: () => void;
  onSpecContentChange: (newSpecContent: string) => void;
  isLoggedIn: boolean;
  currentSpecId: string | null;
  userProfile: UserProfile | null;
  generationsRemaining: number | null;
  onGenerationUsed: () => Promise<void>;
}

interface StructuredAnalysisItem {
  id: string;
  type: 'heading' | 'item' | 'unknown';
  rawLine: string;
  content: string; // For heading: the title; for item: the suggestion text
  sectionTitleRef?: string; // e.g., "1. PRD (Product Requirements Document)"
  relatedSectionObj?: ParsedSection;
  isActionable: boolean;
}


export const SpecDisplay: React.FC<SpecDisplayProps> = ({ specContent, isLoading, onSaveSpec, onSpecContentChange, isLoggedIn, currentSpecId, userProfile, generationsRemaining, onGenerationUsed }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [parsedSections, setParsedSections] = useState<ParsedSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // State for Elaboration Modal
  const [isElaborateModalOpen, setIsElaborateModalOpen] = useState(false);
  const [currentSectionForElaboration, setCurrentSectionForElaboration] = useState<ParsedSection | null>(null);
  const [elaborationQuestion, setElaborationQuestion] = useState('');
  const [elaborationAnswer, setElaborationAnswer] = useState('');
  const [isElaborating, setIsElaborating] = useState(false);
  const [elaborationError, setElaborationError] = useState<string | null>(null);
  const [isElaborationCopied, setIsElaborationCopied] = useState(false);

  // State for Spec Analysis Modal
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [specAnalysisResult, setSpecAnalysisResult] = useState(''); // Raw Markdown from AI
  const [structuredAnalysisItems, setStructuredAnalysisItems] = useState<StructuredAnalysisItem[]>([]);
  const [isAnalyzingSpec, setIsAnalyzingSpec] = useState(false);
  const [specAnalysisError, setSpecAnalysisError] = useState<string | null>(null);
  const [isAnalysisCopied, setIsAnalysisCopied] = useState(false);

  // State for Regenerate Section Modal
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [currentSectionForRegeneration, setCurrentSectionForRegeneration] = useState<ParsedSection | null>(null);
  const [regenerationInstructions, setRegenerationInstructions] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);


  useEffect(() => {
    if (isLoading) {
      setIsVisible(true); 
    } else if (specContent) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isLoading, specContent]);

  useEffect(() => {
    if (!specContent) {
      setParsedSections([]);
      setActiveSectionId(null);
      return;
    }

    const sectionsArray: ParsedSection[] = [];
    const headingRegex = /^(### \d+\..*?)$/gm;
    
    let match;
    const rawTitles: {titleLine: string, index: number}[] = [];

    while ((match = headingRegex.exec(specContent)) !== null) {
        rawTitles.push({titleLine: match[1], index: match.index});
    }

    if (rawTitles.length === 0) {
        if (specContent.trim()) {
            sectionsArray.push({
                id: 'full-document',
                title: 'Full Document',
                content: specContent,
            });
        }
    } else {
        if (rawTitles[0].index > 0) {
            const preambleContent = specContent.substring(0, rawTitles[0].index).trim();
            if (preambleContent) {
                sectionsArray.push({
                    id: 'overview',
                    title: 'Overview',
                    content: preambleContent,
                });
            }
        }

        for (let i = 0; i < rawTitles.length; i++) {
            const currentTitleLine = rawTitles[i].titleLine; 
            const cleanTitle = currentTitleLine.replace(/^###\s*/, '').trim(); 
            
            const sectionContentStartIndex = rawTitles[i].index;
            const sectionContentEndIndex = (i + 1 < rawTitles.length) ? rawTitles[i+1].index : specContent.length;
            
            const sectionFullContent = specContent.substring(sectionContentStartIndex, sectionContentEndIndex).trim();
            
            sectionsArray.push({
                id: cleanTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^\w().-]+/g, '') || `section-${i}`,
                title: cleanTitle,
                content: sectionFullContent,
            });
        }
    }

    setParsedSections(sectionsArray);
    if (sectionsArray.length > 0) {
        const currentActiveStillValid = sectionsArray.some(s => s.id === activeSectionId);
        if (!activeSectionId || !currentActiveStillValid || (isLoading && activeSectionId !== sectionsArray[0].id) ) { 
             setActiveSectionId(sectionsArray[0].id);
        }
    } else {
        setActiveSectionId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specContent, isLoading]); 

  const activeSection = useMemo(() => {
    return parsedSections.find(sec => sec.id === activeSectionId);
  }, [parsedSections, activeSectionId]);

  const handleCopy = async () => {
    if (!specContent) return;
    try {
      await navigator.clipboard.writeText(specContent); 
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    if (!specContent) return;
    const blob = new Blob([specContent], { type: 'text/markdown;charset=utf-8' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'generated-spec.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenElaborateModal = (section: ParsedSection) => {
    setCurrentSectionForElaboration(section);
    setElaborationQuestion('');
    setElaborationAnswer('');
    setElaborationError(null);
    setIsElaborationCopied(false);
    setIsElaborateModalOpen(true);
  };

  const handleCloseElaborateModal = () => {
    setIsElaborateModalOpen(false);
  };

  const handleSendElaborationQuestion = async () => {
    if (!elaborationQuestion.trim() || !currentSectionForElaboration) return;

    if (generationsRemaining !== null && generationsRemaining <= 0) {
        setElaborationError("You have used all your generations for this month. See the Billing page for more options.");
        return;
    }

    setIsElaborating(true);
    setElaborationAnswer('');
    setElaborationError(null);
    setIsElaborationCopied(false);
    try {
      const answer = await elaborateOnSection(currentSectionForElaboration.content, elaborationQuestion);
      setElaborationAnswer(answer);
      await onGenerationUsed();
    } catch (err: any) {
      console.error("Error elaborating:", err);
      setElaborationError(err.message || "Failed to get elaboration.");
    } finally {
      setIsElaborating(false);
    }
  };
  
  const handleCopyElaboration = async () => {
    if (!elaborationAnswer) return;
    try {
      await navigator.clipboard.writeText(elaborationAnswer);
      setIsElaborationCopied(true);
      setTimeout(() => setIsElaborationCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy elaboration: ', err);
    }
  };

  const handleOpenAnalysisModal = () => {
    if (!specContent || isLoading || isAnalyzingSpec) return;
    setSpecAnalysisResult('');
    setStructuredAnalysisItems([]);
    setSpecAnalysisError(null);
    setIsAnalysisCopied(false);
    setIsAnalysisModalOpen(true);
    handleAnalyzeSpec(); 
  };

  const handleCloseAnalysisModal = () => {
    setIsAnalysisModalOpen(false);
  };

  const parseAndStructureAnalysis = useCallback((analysisText: string, currentParsedSections: ParsedSection[]): StructuredAnalysisItem[] => {
    const lines = analysisText.split('\n');
    const items: StructuredAnalysisItem[] = [];
    const sectionRefRegex = /\(Refers to section: ['"]?(.*?)['"]?\)/;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      let item: Partial<StructuredAnalysisItem> = { id: `analysis-line-${index}`, rawLine: line, isActionable: false };

      if (trimmedLine.startsWith('### ')) {
        item.type = 'heading';
        item.content = trimmedLine.substring(4).trim();
      } else if (trimmedLine.startsWith('- ')) {
        item.type = 'item';
        const match = trimmedLine.match(sectionRefRegex);
        if (match && match[1]) {
          item.sectionTitleRef = match[1].trim();
          item.content = trimmedLine.substring(2, match.index).trim(); // Text before the reference
          item.relatedSectionObj = currentParsedSections.find(s => s.title === item.sectionTitleRef);
          if (item.relatedSectionObj) {
            item.isActionable = true;
          }
        } else {
          item.content = trimmedLine.substring(2).trim();
        }
      } else if (trimmedLine) {
        item.type = 'unknown'; // Could be paragraph text between items/headings
        item.content = trimmedLine;
      } else {
        return; // Skip empty lines
      }
      items.push(item as StructuredAnalysisItem);
    });
    return items;
  }, []);

  const handleAnalyzeSpec = useCallback(async () => {
    setIsAnalyzingSpec(true);
    setSpecAnalysisError(null);
    setStructuredAnalysisItems([]);
    try {
      const analysis = await analyzeSpecification(specContent);
      setSpecAnalysisResult(analysis);
      setStructuredAnalysisItems(parseAndStructureAnalysis(analysis, parsedSections));
      // Note: We are not decrementing generation count here as it's a premium feature.
      // In a real scenario with paid plans, this would check and consume a credit if the user has the right plan.
    } catch (err: any) {
      console.error("Error analyzing spec:", err);
      setSpecAnalysisError(err.message || "Failed to get specification analysis.");
    } finally {
      setIsAnalyzingSpec(false);
    }
  }, [specContent, parseAndStructureAnalysis, parsedSections]);


  const handleCopyAnalysis = async () => {
    if (!specAnalysisResult) return;
    try {
      await navigator.clipboard.writeText(specAnalysisResult);
      setIsAnalysisCopied(true);
      setTimeout(() => setIsAnalysisCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy analysis: ', err);
    }
  };

  const handleOpenRegenerateModal = (section: ParsedSection) => {
    setCurrentSectionForRegeneration(section);
    setRegenerationInstructions('');
    setRegenerationError(null);
    setIsRegenerateModalOpen(true);
  };

  const handleCloseRegenerateModal = () => {
    setIsRegenerateModalOpen(false);
  };

  const handleSendRegenerationRequest = async () => {
    if (!currentSectionForRegeneration) return;
    
    if (generationsRemaining !== null && generationsRemaining <= 0) {
        setRegenerationError("You have used all your generations for this month. See the Billing page for more options.");
        return;
    }
    
    setIsRegenerating(true);
    setRegenerationError(null);
    try {
      const newSectionContent = await regenerateSection(
        currentSectionForRegeneration.title,
        currentSectionForRegeneration.content,
        regenerationInstructions
      );
      
      onSpecContentChange(specContent.replace(currentSectionForRegeneration.content, newSectionContent)); 
      await onGenerationUsed();
      
      handleCloseRegenerateModal();

    } catch (err: any) {
      console.error("Error regenerating section:", err);
      setRegenerationError(err.message || "Failed to regenerate section.");
    } finally {
      setIsRegenerating(false);
    }
  };
  
  const handleInitiateRefinementFromAnalysis = (sectionToRefine: ParsedSection, suggestedInstruction: string) => {
    setCurrentSectionForRegeneration(sectionToRefine);
    setRegenerationInstructions(suggestedInstruction); // Pre-fill with AI's suggestion
    setRegenerationError(null);
    
    setIsAnalysisModalOpen(false); // Close analysis modal
    setIsRegenerateModalOpen(true); // Open regenerate modal
  };


  const markdownComponents = useMemo(() => ({
      code({ node, inline, className, children, ...props }: CustomCodeProps) {
        const match = /language-(\w+)/.exec(className || '');
        return !inline && match ? (
          <SyntaxHighlighter
            style={atomOneDark as SyntaxHighlighterStyle}
            language={match[1]}
            PreTag="div"
            className="rounded-md shadow-md"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
  }), []);
  
  const renderSkeleton = () => (
    <div className="space-y-4 animate-pulse p-6 sm:p-8">
      <div className="h-8 bg-panel/50 rounded w-1/3"></div>
      <div className="h-4 bg-panel/50 rounded w-full"></div>
      <div className="h-4 bg-panel/50 rounded w-5/6"></div>
      <div className="h-4 bg-panel/50 rounded w-full"></div>
      <div className="mt-6 h-20 bg-panel/50 rounded"></div>
       <div className="h-4 bg-panel/50 rounded w-4/6"></div>
    </div>
  );
  
  if (!isVisible && !isLoading) {
    return null;
  }
  
  const renderStructuredAnalysisItems = () => {
    let currentCategory = "";
    return structuredAnalysisItems.map((item) => {
      let headingElement = null;
      if (item.type === 'heading' && item.content !== currentCategory) {
        currentCategory = item.content;
        // Use ReactMarkdown for headings to ensure consistent styling if headings themselves contain markdown
        headingElement = (
            <div className="prose-custom prose-sm max-w-none">
              <ReactMarkdown 
                  components={{ 
                      p: ({children}) => <>{children}</>, // Avoid wrapping h3 in p
                      h3: ({node, ...props}) => <h3 className="text-text-heading mt-4 mb-2 font-semibold text-lg" {...props} /> 
                  }} 
                  remarkPlugins={[remarkGfm]}
              >
                  {`### ${item.content}`}
              </ReactMarkdown>
            </div>
        );
      }

      return (
        <React.Fragment key={item.id}>
          {headingElement}
          {item.type === 'item' && (
            <div className="analysis-item group mb-1 pl-1 relative py-1 border-l-2 border-transparent hover:border-accent/30 hover:bg-base/20 rounded-r-md">
              <div className="prose-custom prose-sm max-w-none text-sm ml-3">
                <ReactMarkdown
                  children={item.content}
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                />
              </div>
              {item.isActionable && item.relatedSectionObj && (
                <button
                  onClick={() => handleInitiateRefinementFromAnalysis(item.relatedSectionObj!, item.content)}
                  className="absolute top-1/2 -translate-y-1/2 right-2 text-xs bg-accent/80 text-white font-medium rounded-md px-2 py-1 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-base focus:ring-accent transition-all duration-150 ease-in-out opacity-0 group-hover:opacity-100 flex items-center"
                  title={`Refine section: ${item.relatedSectionObj.title}`}
                >
                  <span className="material-symbols-outlined mr-1" style={{ fontSize: '14px' }}>edit_note</span>
                  Refine
                </button>
              )}
              {!item.isActionable && item.sectionTitleRef && !item.relatedSectionObj && (
                <p className="text-xs text-danger-DEFAULT ml-3 mt-0.5">(Could not link to section: '{item.sectionTitleRef}')</p>
              )}
            </div>
          )}
          {item.type === 'unknown' && item.content && (
             <div className="prose-custom prose-sm max-w-none text-sm ml-3 my-1">
               <ReactMarkdown 
                  children={item.content} 
                  remarkPlugins={[remarkGfm]} 
                  components={markdownComponents} 
              />
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  const saveButtonDisabled = !specContent || isLoading || !isLoggedIn;
  const saveButtonText = currentSpecId ? 'Update Spec' : 'Save to Cloud';
  const saveButtonTitle = !isLoggedIn 
    ? "Log in to save your spec" 
    : currentSpecId 
    ? "Update this spec in the cloud"
    : "Save this new spec to the cloud";
  
  const isFreePlan = userProfile?.plan === 'free';
  const analyzeButtonDisabled = !specContent || isLoading || isAnalyzingSpec || !isLoggedIn || isFreePlan;
  const analyzeButtonTitle = !isLoggedIn 
      ? "Log in to analyze spec" 
      : isFreePlan
      ? "AI Analysis is a Pro/Team feature. See Billing."
      : "Analyze Full Spec with AI";


  return (
    <>
      <div className={`bg-panel rounded-lg shadow-xl transition-opacity duration-500 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-wrap justify-between items-center p-4 border-b border-base gap-2">
          <h2 className="text-lg font-bold text-text-heading flex items-center font-display">
              <span className="material-symbols-outlined mr-2">menu_book</span>
              Generated Specification
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={onSaveSpec}
              disabled={saveButtonDisabled}
              className="p-2 bg-accent/20 text-accent hover:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-accent rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-xs sm:text-sm"
              aria-label={saveButtonTitle}
              title={saveButtonTitle}
            >
              <span className="material-symbols-outlined mr-1 sm:mr-1.5" style={{ fontSize: '18px' }}>
                {currentSpecId ? 'save_as' : 'cloud_upload'}
              </span>
              {saveButtonText}
            </button>
            <button
              onClick={handleOpenAnalysisModal}
              disabled={analyzeButtonDisabled}
              className="p-2 bg-accent/20 text-accent hover:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-accent rounded-md disabled:opacity-50 transition-colors flex items-center justify-center text-xs sm:text-sm"
              aria-label="Analyze full specification"
              title={analyzeButtonTitle}
            >
              <span className="material-symbols-outlined mr-1 sm:mr-1.5" style={{ fontSize: '18px' }}>magic_button</span>
              Analyze Spec
            </button>
            <button
              onClick={handleCopy}
              disabled={!specContent || isLoading}
              className="p-2 bg-base text-text-muted hover:text-text-body focus:outline-none focus:ring-1 focus:ring-accent rounded-md disabled:opacity-50 transition-colors flex items-center justify-center"
              aria-label={isCopied ? "Copied full spec" : "Copy full spec to clipboard"}
              title={isCopied ? "Copied!" : "Copy Full Spec"}
            >
              {isCopied ? 
                <span className="material-symbols-outlined text-accent" style={{ fontSize: '20px' }}>check_circle</span> : 
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>content_copy</span>
              }
            </button>
            <button
              onClick={handleDownload}
              disabled={!specContent || isLoading}
              className="p-2 bg-base text-text-muted hover:text-text-body focus:outline-none focus:ring-1 focus:ring-accent rounded-md disabled:opacity-50 transition-colors flex items-center justify-center"
              aria-label="Download full spec as Markdown"
              title="Download Full Spec"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row min-h-[400px] max-h-[calc(100vh-250px)] sm:max-h-[70vh]">
          {parsedSections.length > 0 && (
            <aside className="w-full md:w-1/3 lg:w-1/4 bg-base p-1 md:p-3 custom-scrollbar overflow-y-auto border-r border-panel md:border-r-0 md:border-b md:border-panel">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider px-3 pt-2 pb-1 hidden md:block">Sections</h3>
              <nav className="space-y-1">
                {parsedSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveSectionId(section.id);
                    }}
                    className={`block px-3 py-2.5 text-sm rounded-md transition-colors
                                ${activeSectionId === section.id 
                                  ? 'bg-accent text-white font-semibold shadow-md' 
                                  : 'text-text-muted hover:bg-panel hover:text-text-body'}`}
                    aria-current={activeSectionId === section.id ? 'page' : undefined}
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </aside>
          )}

          <div id="spec-content-area" className={`flex-1 overflow-y-auto custom-scrollbar bg-panel/30 md:bg-base shadow-inner ${parsedSections.length === 0 && !isLoading ? 'flex items-center justify-center' : ''}`}>
            {isLoading && (!activeSection || !specContent) ? (
              renderSkeleton()
            ) : activeSection && specContent ? (
              <div className="p-6 sm:p-8 prose-custom">
                {activeSection && !isLoading && (
                  <div className="mb-6 flex flex-wrap justify-end gap-2 -mt-2">
                    <button
                      onClick={() => handleOpenRegenerateModal(activeSection)}
                      className="bg-accent/70 text-white font-medium rounded-md px-3 py-1.5 text-xs hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base focus:ring-accent transition-all duration-150 ease-in-out flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isLoggedIn ? `Regenerate "${activeSection.title}" with AI` : "Log in to regenerate section"}
                      disabled={!isLoggedIn}
                    >
                      <span className="material-symbols-outlined mr-1" style={{ fontSize: '16px' }}>autorenew</span>
                      Regenerate
                    </button>
                    <button
                      onClick={() => handleOpenElaborateModal(activeSection)}
                      className="bg-accent/80 text-white font-medium rounded-md px-3 py-1.5 text-xs hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base focus:ring-accent transition-all duration-150 ease-in-out flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isLoggedIn ? `Ask a follow-up question about "${activeSection.title}"` : "Log in to elaborate"}
                      disabled={!isLoggedIn}
                    >
                      <span className="material-symbols-outlined mr-1" style={{ fontSize: '16px' }}>question_answer</span>
                      Elaborate
                    </button>
                  </div>
                )}
                <ReactMarkdown
                  children={activeSection.content}
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                />
              </div>
            ) : !isLoading && !specContent && parsedSections.length === 0 ? (
              <div className="text-center text-text-muted py-10 px-4">
                  <span className="material-symbols-outlined text-4xl mb-2">draft</span>
                  <p>{isLoggedIn ? "No specification content to display yet." : "Log in to get started."}</p>
                  <p className="text-sm">{isLoggedIn ? "Generate a spec using the form above." : "You can create and save specs once you are logged in."}</p>
              </div>
            ) : (
              <div className="text-center text-text-muted py-10 px-4">
                  <span className="material-symbols-outlined text-4xl mb-2">segment</span>
                  <p>Select a section from the sidebar to view its content.</p>
                  {parsedSections.length > 0 && <p className="text-sm">Or, if you've just generated a spec, the first section should load shortly.</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Elaboration Modal */}
      {isElaborateModalOpen && currentSectionForElaboration && (
        <div 
            className="fixed inset-0 bg-base/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300"
            onClick={handleCloseElaborateModal}
        >
          <div 
            className="bg-panel rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0 transform transition-all duration-300 scale-95 opacity-0 animate-modalFadeInScaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-base">
              <h3 className="text-xl font-bold text-text-heading font-display">
                Elaborate on: <span className="text-accent">{currentSectionForElaboration.title}</span>
              </h3>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label htmlFor="elaboration-question" className="block text-sm font-medium text-text-muted mb-1">Your Question/Request:</label>
                <textarea
                  id="elaboration-question"
                  value={elaborationQuestion}
                  onChange={(e) => setElaborationQuestion(e.target.value)}
                  placeholder="e.g., Can you expand on the security aspects? or What are alternative approaches for...?"
                  className="w-full h-24 p-3 bg-base border border-[#30363d] rounded-md focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none text-text-body placeholder-text-muted transition-colors custom-scrollbar text-sm"
                  disabled={isElaborating}
                />
              </div>
              <button
                onClick={handleSendElaborationQuestion}
                disabled={isElaborating || !elaborationQuestion.trim() || (generationsRemaining !== null && generationsRemaining <=0)}
                className="w-full bg-accent text-white font-semibold rounded-md px-6 py-2.5 hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm"
              >
                {isElaborating && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isElaborating ? 'Thinking...' : 'Ask AI for Elaboration'}
              </button>

              {elaborationError && <ErrorMessage message={elaborationError} />}

              {elaborationAnswer && !isElaborating && (
                <div className="mt-3 border-t border-base pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-text-heading">AI Elaboration:</h4>
                    <button
                        onClick={handleCopyElaboration}
                        className="p-1.5 bg-base text-text-muted hover:text-text-body focus:outline-none focus:ring-1 focus:ring-accent rounded-md disabled:opacity-50 transition-colors flex items-center justify-center text-xs"
                        title={isElaborationCopied ? "Copied!" : "Copy Elaboration"}
                    >
                        {isElaborationCopied ? 
                        <span className="material-symbols-outlined text-accent" style={{ fontSize: '16px' }}>check_circle</span> : 
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
                        }
                        <span className="ml-1">{isElaborationCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-base/50 rounded-md prose-custom prose-sm max-w-none custom-scrollbar overflow-y-auto max-h-60">
                     <ReactMarkdown children={elaborationAnswer} remarkPlugins={[remarkGfm]} components={markdownComponents} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-base/30 border-t border-base text-right">
              <button
                onClick={handleCloseElaborateModal}
                className="text-sm bg-panel hover:bg-panel/70 text-text-body font-medium rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel focus:ring-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Section Modal */}
      {isRegenerateModalOpen && currentSectionForRegeneration && (
        <div 
            className="fixed inset-0 bg-base/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300"
            onClick={handleCloseRegenerateModal}
        >
          <div 
            className="bg-panel rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0 transform transition-all duration-300 scale-95 opacity-0 animate-modalFadeInScaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-base">
              <h3 className="text-xl font-bold text-text-heading font-display">
                Regenerate Section: <span className="text-accent">{currentSectionForRegeneration.title}</span>
              </h3>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label htmlFor="regeneration-instructions" className="block text-sm font-medium text-text-muted mb-1">Instructions for AI (pre-filled if refining from analysis):</label>
                <textarea
                  id="regeneration-instructions"
                  value={regenerationInstructions}
                  onChange={(e) => setRegenerationInstructions(e.target.value)}
                  placeholder="e.g., Make this section more concise. or Focus more on the technical implementation details."
                  className="w-full h-24 p-3 bg-base border border-[#30363d] rounded-md focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none text-text-body placeholder-text-muted transition-colors custom-scrollbar text-sm"
                  disabled={isRegenerating}
                />
              </div>
              <button
                onClick={handleSendRegenerationRequest}
                disabled={isRegenerating || (generationsRemaining !== null && generationsRemaining <= 0)}
                className="w-full bg-accent text-white font-semibold rounded-md px-6 py-2.5 hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm"
              >
                {isRegenerating && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isRegenerating ? 'Regenerating...' : 'Regenerate Section with AI'}
              </button>

              {regenerationError && <ErrorMessage message={regenerationError} />}
              
            </div>

            <div className="p-4 bg-base/30 border-t border-base text-right">
              <button
                onClick={handleCloseRegenerateModal}
                className="text-sm bg-panel hover:bg-panel/70 text-text-body font-medium rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel focus:ring-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Specification Analysis Modal */}
      {isAnalysisModalOpen && (
        <div 
            className="fixed inset-0 bg-base/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300"
            onClick={handleCloseAnalysisModal}
        >
          <div 
            className="bg-panel rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0 transform transition-all duration-300 scale-95 opacity-0 animate-modalFadeInScaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-base">
              <h3 className="text-xl font-bold text-text-heading flex items-center font-display">
                <span className="material-symbols-outlined mr-2 text-accent">magic_button</span>
                AI-Powered Specification Analysis
              </h3>
            </div>
            
            <div className="p-6 space-y-1 overflow-y-auto custom-scrollbar flex-1">
              {isAnalyzingSpec && (
                <div className="text-center py-10">
                  <svg className="animate-spin h-10 w-10 text-accent mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-text-muted">The AI is analyzing your specification... this may take a moment.</p>
                </div>
              )}

              {specAnalysisError && !isAnalyzingSpec && <ErrorMessage message={specAnalysisError} />}

              {structuredAnalysisItems.length > 0 && !isAnalyzingSpec && !specAnalysisError && (
                <div className="mt-1">
                  <div className="flex justify-between items-center mb-2 -mt-2">
                    <h4 className="font-semibold text-text-heading">AI Analysis & Suggestions:</h4>
                    <button
                        onClick={handleCopyAnalysis}
                        className="p-1.5 bg-base text-text-muted hover:text-text-body focus:outline-none focus:ring-1 focus:ring-accent rounded-md disabled:opacity-50 transition-colors flex items-center justify-center text-xs"
                        title={isAnalysisCopied ? "Copied!" : "Copy Full Analysis Text"}
                    >
                        {isAnalysisCopied ? 
                        <span className="material-symbols-outlined text-accent" style={{ fontSize: '16px' }}>check_circle</span> : 
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
                        }
                        <span className="ml-1">{isAnalysisCopied ? "Copied" : "Copy All"}</span>
                    </button>
                  </div>
                  <div className="p-1 bg-base/50 rounded-md max-h-[calc(80vh-180px)] overflow-y-auto custom-scrollbar">
                     {renderStructuredAnalysisItems()}
                  </div>
                </div>
              )}
              
              {!isAnalyzingSpec && !specAnalysisError && specAnalysisResult && structuredAnalysisItems.length === 0 && (
                <p className="text-text-muted text-center py-5">The AI provided an analysis, but no specific actionable items linked to sections were identified. You can still copy the full analysis text.</p>
              )}
            </div>

            <div className="p-4 bg-base/30 border-t border-base text-right">
              <button
                onClick={handleCloseAnalysisModal}
                className="text-sm bg-panel hover:bg-panel/70 text-text-body font-medium rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel focus:ring-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};