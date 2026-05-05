import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface GameContextType {
  coins: number;
  unlockedItems: number[];
  theme: Theme;
  mastery: number;
  buyItem: (id: number, price: number) => boolean;
  setTheme: (theme: Theme) => void;
  addCoins: (amount: number) => void;
  addMastery: (amount: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const THEME_KEY = 'sq.theme';

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'system';
}

function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldDark = theme === 'dark' || (theme === 'system' && systemDark);
  root.classList.toggle('dark', shouldDark);
  root.style.colorScheme = shouldDark ? 'dark' : 'light';
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState(1200);
  const [unlockedItems, setUnlockedItems] = useState<number[]>([1]); // dark mode unlocked by default
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  const [mastery, setMastery] = useState(65);

  const buyItem = (id: number, price: number) => {
    if (coins >= price && !unlockedItems.includes(id)) {
      setCoins(prev => prev - price);
      setUnlockedItems(prev => [...prev, id]);
      return true;
    }
    return false;
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try { localStorage.setItem(THEME_KEY, newTheme); } catch {}
  };

  const addCoins = (amount: number) => setCoins(prev => prev + amount);
  const addMastery = (amount: number) => setMastery(prev => Math.min(100, prev + amount));

  // Apply theme + smooth transition class
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('theme-transition');
    applyTheme(theme);
    const t = setTimeout(() => root.classList.remove('theme-transition'), 300);
    return () => clearTimeout(t);
  }, [theme]);

  // Live-track system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, [theme]);

  return (
    <GameContext.Provider value={{ coins, unlockedItems, theme, mastery, buyItem, setTheme, addCoins, addMastery }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
