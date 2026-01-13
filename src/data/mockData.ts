// src/data/mockData.ts

// Mock data for the main portfolio chart
export const portfolioChartData = [
  { date: '2023-01-01', value: 10000 },
  { date: '2023-01-02', value: 10500 },
  { date: '2023-01-03', value: 10200 },
  { date: '2023-01-04', value: 10800 },
  { date: '2023-01-05', value: 11500 },
  { date: '2023-01-06', value: 11300 },
  { date: '2023-01-07', value: 11700 },
  { date: '2023-01-08', value: 12000 },
];

// Mock data for user's stock holdings
export const holdingsData = [
  { symbol: 'AAPL', name: 'Apple Inc.', quantity: 50, avgPrice: 150.00, currentPrice: 175.28 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', quantity: 25, avgPrice: 2800.00, currentPrice: 2750.00 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 30, avgPrice: 300.00, currentPrice: 340.50 },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', quantity: 20, avgPrice: 130.00, currentPrice: 135.80 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', quantity: 15, avgPrice: 250.00, currentPrice: 260.10 },
];

// Mock data for the portfolio summary
export const portfolioSummaryData = {
  totalValue: 125579.50,
  dayChange: 523.40,
  dayChangePercent: 0.42,
  totalGain: 15579.50,
  totalGainPercent: 14.16,
};

// Mock data for the watchlist
export const watchlistData = [
  { symbol: 'THYAO', name: 'Türk Hava Yolları', price: 245.50, change: 5.20, changePercent: 2.16 },
  { symbol: 'EREGL', name: 'Ereğli Demir Çelik', price: 42.80, change: -0.50, changePercent: -1.15 },
  { symbol: 'TUPRS', name: 'Tüpraş', price: 140.20, change: 1.80, changePercent: 1.30 },
  { symbol: 'PETKM', name: 'Petkim', price: 20.10, change: 0.25, changePercent: 1.26 },
  { symbol: 'BIMAS', name: 'Bim Mağazalar', price: 310.75, change: -2.25, changePercent: -0.72 },
];
