import { createContext, useContext, useState, type ReactNode } from 'react';
import type { DecomposeResult } from '@/lib/decompose';
import type { DiscoverResult } from '@/lib/discover';

export type Step = 'discover' | 'analyze' | 'setup' | 'validate';

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

  return (
    <IdeaContext.Provider value={{
      idea, setIdea, currentStep, setCurrentStep, selectedInsight, setSelectedInsight,
      decomposeResult, setDecomposeResult, discoverResult, setDiscoverResult,
      analyzeFindings, setAnalyzeFindings, analyzeData, setAnalyzeData, setupData, setSetupData,
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
