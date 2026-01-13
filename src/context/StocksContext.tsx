import { createContext, useContext, useState, ReactNode } from 'react';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  pctChange: number;
  cap?: string;
  ytd?: string;
}

interface StocksContextType {
  stocks: StockData[];
  setStocks: (stocks: StockData[]) => void;
}

const StocksContext = createContext<StocksContextType | undefined>(undefined);

export function StocksProvider({ children }: { children: ReactNode }) {
  const [stocks, setStocks] = useState<StockData[]>([]);

  return (
    <StocksContext.Provider value={{ stocks, setStocks }}>
      {children}
    </StocksContext.Provider>
  );
}

export function useStocks() {
  const context = useContext(StocksContext);
  if (context === undefined) {
    throw new Error('useStocks must be used within a StocksProvider');
  }
  return context;
}
