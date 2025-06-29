
import React from 'react';

export interface SavedSpec {
  id: string; // Firestore document ID
  name: string;
  ideaText: string;
  generatedSpec: string;
  selectedModules: string[];
  savedAt: string; // ISO string date
}

interface SavedSpecsModalProps {
  savedSpecs: SavedSpec[];
  onLoadSpec: (spec: SavedSpec) => void;
  onDeleteSpec: (specId: string) => void;
  onClose: () => void;
  isLoading?: boolean; 
}

export const SavedSpecsModal: React.FC<SavedSpecsModalProps> = ({
  savedSpecs,
  onLoadSpec,
  onDeleteSpec,
  onClose,
  isLoading,
}) => {
  const formatDate = (isoString: string) => {
    if (!isoString) return 'Date not available';
    return new Date(isoString).toLocaleString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div
      className="fixed inset-0 bg-base/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-specs-title"
    >
      <div
        className="bg-panel rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0 transform transition-all duration-300 scale-95 opacity-0 animate-modalFadeInScaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-base flex justify-between items-center">
          <h3 id="saved-specs-title" className="text-xl font-bold text-text-heading flex items-center font-display">
            <span className="material-symbols-outlined mr-2 text-accent">cloud_done</span>
            My Cloud Specifications
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-body focus:outline-none focus:ring-1 focus:ring-accent rounded-full"
            aria-label="Close saved specifications modal"
            disabled={isLoading}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {isLoading && savedSpecs.length === 0 && ( 
            <div className="text-center py-10 text-text-muted">
                <svg className="animate-spin h-8 w-8 text-accent mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Loading your specs from the cloud...</p>
            </div>
          )}
          {!isLoading && savedSpecs.length === 0 ? (
            <div className="text-center py-10 text-text-muted">
              <span className="material-symbols-outlined text-4xl mb-3">cloud_off</span>
              <p className="text-lg">No specifications saved to the cloud yet.</p>
              <p className="text-sm">Once you generate and save a spec, it will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {savedSpecs.map((spec) => ( 
                <li
                  key={spec.id}
                  className="bg-base/70 p-4 rounded-md shadow-sm border border-transparent hover:border-accent/50 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <h4 className="font-semibold text-text-heading text-md mb-0.5 group-hover:text-accent transition-colors">{spec.name}</h4>
                      <p className="text-xs text-text-muted">
                        Last Updated: {formatDate(spec.savedAt)}
                      </p>
                      <p className="text-xs text-text-muted mt-1 truncate max-w-xs sm:max-w-sm" title={spec.ideaText}>
                        Idea: {spec.ideaText.substring(0, 50)}{spec.ideaText.length > 50 ? '...' : ''}
                      </p>
                    </div>
                    <div className="flex space-x-2 mt-3 sm:mt-0 flex-shrink-0">
                      <button
                        onClick={() => onLoadSpec(spec)}
                        disabled={isLoading}
                        className="text-xs bg-accent/80 text-white font-medium rounded-md px-3 py-1.5 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base focus:ring-accent transition-colors disabled:opacity-50 flex items-center"
                        aria-label={`Load specification titled ${spec.name}`}
                      >
                        <span className="material-symbols-outlined mr-1" style={{fontSize: '16px'}}>file_open</span>
                        Load
                      </button>
                      <button
                        onClick={() => onDeleteSpec(spec.id)}
                        disabled={isLoading}
                        className="text-xs bg-danger-DEFAULT/20 text-danger-DEFAULT font-medium rounded-md px-3 py-1.5 hover:bg-danger-DEFAULT/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base focus:ring-danger-DEFAULT transition-colors disabled:opacity-50 flex items-center"
                        aria-label={`Delete specification titled ${spec.name}`}
                      >
                         <span className="material-symbols-outlined mr-1" style={{fontSize: '16px'}}>delete_sweep</span>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 bg-base/30 border-t border-base text-right">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-sm bg-panel hover:bg-panel/70 text-text-body font-medium rounded-md px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-panel focus:ring-accent transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};