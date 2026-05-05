import { createContext, useContext, useState, ReactNode } from 'react';

interface TutorContextType {
  context: string;
  setContext: (context: string) => void;
}

const TutorContext = createContext<TutorContextType | undefined>(undefined);

export function TutorProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState('General Study');
  return (
    <TutorContext.Provider value={{ context, setContext }}>
      {children}
    </TutorContext.Provider>
  );
}

export function useTutor() {
  const context = useContext(TutorContext);
  if (!context) {
    throw new Error('useTutor must be used within a TutorProvider');
  }
  return context;
}
