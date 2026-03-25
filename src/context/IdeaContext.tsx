import { createContext, useContext, useState, type ReactNode } from 'react';
import type { DecomposeResult } from '@/lib/decompose';
import type { DiscoverResult } from '@/lib/discover';
import type { ValidateResult } from '@/lib/validate';

export type Step = 'discover' | 'analyze' | 'setup' | 'validate';

export type PrefetchStatus = 'idle' | 'running' | 'done';

export interface AnalyzeFinding {
  id: string;
  text: string;
  section: string;
  type: string;
}

interface IdeaState {
  idea: string;
  setIdea: (idea: string) => void;
  currentStep: Step;
  setCurrentStep: (step: Step) => void;
  selectedInsight: string | null;
  setSelectedInsight: (insight: string | null) => void;
  decomposeResult: DecomposeResult | null;
  setDecomposeResult: (result: DecomposeResult | null) => void;
  discoverResult: DiscoverResult | null;
  setDiscoverResult: (result: DiscoverResult | null) => void;
  analyzeFindings: AnalyzeFinding[];
  setAnalyzeFindings: (findings: AnalyzeFinding[]) => void;
  analyzeData: Record<string, any>;
  setAnalyzeData: (data: Record<string, any>) => void;
  setupData: Record<string, any>;
  setSetupData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  validateData: ValidateResult | null;
  setValidateData: (data: ValidateResult | null) => void;
  prefetchStatus: PrefetchStatus;
  setPrefetchStatus: (status: PrefetchStatus) => void;
  hydrateProject: (project: {
    idea: string;
    currentStep?: Step;
    decomposeResult?: DecomposeResult | null;
    discoverResult?: DiscoverResult | null;
    analyzeData?: Record<string, any>;
    setupData?: Record<string, any>;
    validateData?: ValidateResult | null;
  }) => void;
  resetProject: () => void;
}

const IdeaContext = createContext<IdeaState | null>(null);

export function IdeaProvider({ children }: { children: ReactNode }) {
  const [idea, setIdea] = useState('');
  const [currentStep, setCurrentStep] = useState<Step>('discover');
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [decomposeResult, setDecomposeResult] = useState<DecomposeResult | null>(null);
  const [discoverResult, setDiscoverResult] = useState<DiscoverResult | null>(null);
  const [analyzeFindings, setAnalyzeFindings] = useState<AnalyzeFinding[]>([]);
  const [analyzeData, setAnalyzeData] = useState<Record<string, any>>({});
  const [setupData, setSetupData] = useState<Record<string, any>>({});
  const [validateData, setValidateData] = useState<ValidateResult | null>(null);
  const [prefetchStatus, setPrefetchStatus] = useState<PrefetchStatus>('idle');

  const resetProject = () => {
    setIdea('');
    setCurrentStep('discover');
    setSelectedInsight(null);
    setDecomposeResult(null);
    setDiscoverResult(null);
    setAnalyzeFindings([]);
    setAnalyzeData({});
    setSetupData({});
    setValidateData(null);
    setPrefetchStatus('idle');
  };

  const hydrateProject = (project: {
    idea: string;
    currentStep?: Step;
    decomposeResult?: DecomposeResult | null;
    discoverResult?: DiscoverResult | null;
    analyzeData?: Record<string, any>;
    setupData?: Record<string, any>;
    validateData?: ValidateResult | null;
  }) => {
    setIdea(project.idea);
    setCurrentStep(project.currentStep || 'discover');
    setSelectedInsight(null);
    setDecomposeResult(project.decomposeResult || null);
    setDiscoverResult(project.discoverResult || null);
    setAnalyzeFindings([]);
    setAnalyzeData(project.analyzeData || {});
    setSetupData(project.setupData || {});
    setValidateData(project.validateData || null);
    setPrefetchStatus('idle');
  };

  return (
    <IdeaContext.Provider value={{
      idea, setIdea, currentStep, setCurrentStep, selectedInsight, setSelectedInsight,
      decomposeResult, setDecomposeResult, discoverResult, setDiscoverResult,
      analyzeFindings, setAnalyzeFindings, analyzeData, setAnalyzeData, setupData, setSetupData,
      validateData, setValidateData, prefetchStatus, setPrefetchStatus, hydrateProject, resetProject,
    }}>
      {children}
    </IdeaContext.Provider>
  );
}

export function useIdea() {
  const ctx = useContext(IdeaContext);
  if (!ctx) throw new Error('useIdea must be used within IdeaProvider');
  return ctx;
}
