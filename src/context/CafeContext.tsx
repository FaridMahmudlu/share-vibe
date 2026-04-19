import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Global café/app configuration context
 * Reduces prop drilling and centralizes state
 */

export interface CafeContextType {
  // Café info
  activeCafeSlug: string;
  cafeName: string;
  accentColor: string;
  
  // Campaign
  campaignTarget: number;
  campaignReward: string;
  
  // Display
  handwritingFont: string;
  demoTable: string;
  
  // User
  currentUserUid: string | null;
  currentUserEmail: string | null;
  
  // Actions
  setCafeSlug: (slug: string) => void;
  setCafeName: (name: string) => void;
  setAccentColor: (color: string) => void;
  setCampaignTarget: (target: number) => void;
  setCampaignReward: (reward: string) => void;
  setHandwritingFont: (font: string) => void;
  setCurrentUser: (uid: string | null, email: string | null) => void;
}

const CafeContext = createContext<CafeContextType | undefined>(undefined);

interface CafeContextProviderProps {
  children: ReactNode;
  initialCafeSlug?: string;
  initialCafeName?: string;
  initialAccentColor?: string;
  initialCampaignTarget?: number;
  initialCampaignReward?: string;
  initialHandwritingFont?: string;
}

/**
 * Café Context Provider
 * Wrap your app with this to provide global café state
 */
export function CafeContextProvider({
  children,
  initialCafeSlug = '',
  initialCafeName = '',
  initialAccentColor = '#d48f6b',
  initialCampaignTarget = 20,
  initialCampaignReward = '',
  initialHandwritingFont = 'handlee',
}: CafeContextProviderProps) {
  const [activeCafeSlug, setActiveCafeSlug] = useState(initialCafeSlug);
  const [cafeName, setCafeName] = useState(initialCafeName);
  const [accentColor, setAccentColor] = useState(initialAccentColor);
  const [campaignTarget, setCampaignTarget] = useState(initialCampaignTarget);
  const [campaignReward, setCampaignReward] = useState(initialCampaignReward);
  const [handwritingFont, setHandwritingFont] = useState(initialHandwritingFont);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const setCafeSlug = useCallback((slug: string) => {
    setActiveCafeSlug(slug);
  }, []);

  const setCurrentUser = useCallback((uid: string | null, email: string | null) => {
    setCurrentUserUid(uid);
    setCurrentUserEmail(email);
  }, []);

  const value: CafeContextType = {
    activeCafeSlug,
    cafeName,
    accentColor,
    campaignTarget,
    campaignReward,
    handwritingFont,
    demoTable: 'demo-table',
    currentUserUid,
    currentUserEmail,
    setCafeSlug,
    setCafeName,
    setAccentColor,
    setCampaignTarget,
    setCampaignReward,
    setHandwritingFont,
    setCurrentUser,
  };

  return <CafeContext.Provider value={value}>{children}</CafeContext.Provider>;
}

/**
 * Hook to use café context
 * Throws error if used outside of CafeContextProvider
 */
export function useCafeContext(): CafeContextType {
  const context = useContext(CafeContext);
  if (context === undefined) {
    throw new Error('useCafeContext must be used within CafeContextProvider');
  }
  return context;
}

/**
 * Optional: Hook for selecting specific values from context (performance optimization)
 * Prevents unnecessary re-renders when only some values are needed
 */
export function useCafeContextSelector<T>(selector: (context: CafeContextType) => T): T {
  const context = useCafeContext();
  return selector(context);
}
