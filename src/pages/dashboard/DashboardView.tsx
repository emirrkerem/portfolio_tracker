import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useStocks } from '../../context/StocksContext';
import { API_URL } from '../../config';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  pctChange: number;
  cap?: string;
  ytd?: string;
  logo?: string;
  currency?: string;
}

const parseCapValue = (val: string | undefined): number => {
  if (!val || val === 'N/A') return -Infinity;
  const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
  if (val.includes('T')) return num * 1e12;
  if (val.includes('B')) return num * 1e9;
  if (val.includes('M')) return num * 1e6;
  return num;
};

const MARKET_OVERVIEW = [
  { symbol: 'QQQ', name: 'Invesco QQQ', price: 0, change: 0, pctChange: 0, displaySymbol: 'QQQ' },
  { symbol: 'SPY', name: 'SPDR S&P 500', price: 0, change: 0, pctChange: 0, displaySymbol: 'SPY' },
  { symbol: 'BTC-USD', name: 'Bitcoin', price: 0, change: 0, pctChange: 0, displaySymbol: 'BTC' },
  { symbol: 'GC=F', name: 'Gold', price: 0, change: 0, pctChange: 0, displaySymbol: 'GOLD' },
  { symbol: 'SI=F', name: 'Silver', price: 0, change: 0, pctChange: 0, displaySymbol: 'SILVER' },
  { symbol: 'TRY=X', name: 'USD/TRY', price: 0, change: 0, pctChange: 0, displaySymbol: 'USDTRY' },
  { symbol: '^VIX', name: 'Volatility Index', price: 0, change: 0, pctChange: 0, displaySymbol: 'VIX' },
];

const ETF_LIST = [
  { symbol: 'QQQ', name: 'Invesco QQQ' },
  { symbol: 'SPY', name: 'SPDR S&P 500' },
  { symbol: 'XLK', name: 'Technology Select Sector' },
  { symbol: 'XLE', name: 'Energy Select Sector' },
  { symbol: 'IBIT', name: 'iShares Bitcoin Trust' },
  { symbol: 'ETHA', name: 'iShares Ethereum Trust' },
  { symbol: 'GLD', name: 'SPDR Gold Shares' },
  { symbol: 'SLV', name: 'iShares Silver Trust' },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond' },
  { symbol: 'SCHG', name: 'Schwab U.S. Large-Cap Growth ETF' },
  { symbol: 'AAAU', name: 'Goldman Sachs Physical Gold ETF' },
  { symbol: 'NDAQ', name: 'Nasdaq, Inc.' },
];

const LEVERAGED_LIST = [
  { symbol: 'TQQQ', name: 'ProShares UltraPro QQQ' },
  { symbol: 'SQQQ', name: 'ProShares UltraPro Short QQQ' },
  { symbol: 'SOXL', name: 'Direxion Daily Semiconductor Bull 3X' },
  { symbol: 'SOXS', name: 'Direxion Daily Semiconductor Bear 3X' },
  { symbol: 'NVDL', name: 'GraniteShares 2x Long NVDA' },
  { symbol: 'TSLL', name: 'Direxion Daily TSLA Bull 2X' },
  { symbol: 'MSTX', name: 'Defiance Daily Target 1.75X Long MSTR' },
  { symbol: 'CONL', name: 'GraniteShares 2x Long COIN' },
  { symbol: 'AMDL', name: 'GraniteShares 2x Long AMD' },
  { symbol: 'AMZU', name: 'Direxion Daily AMZN Bull 2X' },
  { symbol: 'NVDX', name: 'T-Rex 2X Long NVIDIA' },
  { symbol: 'ORCX', name: 'Leveraged Oracle' },
  { symbol: 'BITX', name: '2x Bitcoin Strategy ETF' },
  { symbol: 'BITI', name: 'Short Bitcoin Strategy ETF' },
];

const COIN_LIST = [
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'ETH-USD', name: 'Ethereum' },
  { symbol: 'SOL-USD', name: 'Solana' },
  { symbol: 'BNB-USD', name: 'Binance Coin' },
  { symbol: 'XRP-USD', name: 'XRP' },
  { symbol: 'DOGE-USD', name: 'Dogecoin' },
  { symbol: 'ADA-USD', name: 'Cardano' },
  { symbol: 'AVAX-USD', name: 'Avalanche' },
  { symbol: 'TRX-USD', name: 'TRON' },
  { symbol: 'DOT-USD', name: 'Polkadot' },
  { symbol: 'LINK-USD', name: 'Chainlink' },
  { symbol: 'MATIC-USD', name: 'Polygon' },
  { symbol: 'LTC-USD', name: 'Litecoin' },
  { symbol: 'SHIB-USD', name: 'Shiba Inu' },
  { symbol: 'BCH-USD', name: 'Bitcoin Cash' },
];

export default function DashboardView() {
  const navigate = useNavigate();
  // Context'ten searchTerm'i almaya çalışıyoruz (Transfer işlemi)
  // Not: StocksContext dosyasını güncellemeniz gerekebilir.
  const { stocks: contextStocks, setStocks: setStocksContext, searchTerm: contextSearchTerm } = useStocks() as any;
  const [activeTab, setActiveTab] = useState<'stocks' | 'etf' | 'leveraged' | 'coin'>('stocks');
  const [stocks, setStocks] = useState<StockData[]>(contextStocks && contextStocks.length > 0 ? contextStocks : []);
  const [marketOverview, setMarketOverview] = useState(MARKET_OVERVIEW);
  const [etfs, setEtfs] = useState<StockData[]>([]);
  const [leveragedStocks, setLeveragedStocks] = useState<StockData[]>([]);
  const [coins, setCoins] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(!(contextStocks && contextStocks.length > 0));
  // Eğer context'te searchTerm yoksa yerel state kullan (Fallback)
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' | undefined }>({ key: 'cap', direction: 'desc' });
  const [flashStates, setFlashStates] = useState<{ [key: string]: 'up' | 'down' | null }>({});
  const prevPricesRef = useRef<{ [key: string]: number }>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const stockListRef = useRef<StockData[]>(contextStocks && contextStocks.length > 0 ? contextStocks : []); // Listeyi hafızada tutmak için
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddInput] = useState(false); // Manuel ekleme kutusunu göster/gizle

  // İzleme Listesi State'i
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('borsa_watchlist');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleWatchlist = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let newWatchlist;
    if (watchlist.includes(symbol)) {
      newWatchlist = watchlist.filter(s => s !== symbol);
    } else {
      newWatchlist = [...watchlist, symbol];
      // Logo çekme isteği gönder (Arka planda)
      fetch(`${API_URL}/api/logo/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      }).catch(err => console.error("Logo fetch error:", err));
    }
    setWatchlist(newWatchlist);
    localStorage.setItem('borsa_watchlist', JSON.stringify(newWatchlist));
    window.dispatchEvent(new Event('watchlist-updated'));
  };

  // Dışarıdan yapılan değişiklikleri dinle
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('borsa_watchlist');
      if (saved) {
        setWatchlist(JSON.parse(saved));
      }
    };
    window.addEventListener('watchlist-updated', handleStorageChange);
    return () => window.removeEventListener('watchlist-updated', handleStorageChange);
  }, []);
  
  // Null check ekleyerek güvenli hale getiriyoruz
  const searchTerm = String((contextSearchTerm !== undefined && contextSearchTerm !== null) ? contextSearchTerm : localSearchTerm);

  // Stocks değiştiğinde context'i de güncelle
  useEffect(() => {
    setStocksContext(stocks);
  }, [stocks, setStocksContext]);

  // Market Overview Fiyatlarını Çek
  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const symbols = MARKET_OVERVIEW.map(item => item.symbol);
        // Sembolleri encode et (özellikle ^ ve = karakterleri için)
        const query = symbols.map(s => encodeURIComponent(s)).join(',');
        const response = await fetch(`${API_URL}/api/market?symbols=${query}`);
        const data = await response.json();

        if (Array.isArray(data)) {
          setMarketOverview(prev => prev.map(item => {
            const marketData = data.find((d: any) => d.symbol === item.symbol);
            if (marketData) {
              return { 
                ...item, 
                price: marketData.price,
                change: marketData.change,
                pctChange: marketData.pctChange
              };
            }
            return item;
          }));
        }
      } catch (error) {
        console.error("Market overview data error:", error);
      }
    };

    fetchOverviewData();
    const interval = setInterval(fetchOverviewData, 60000); // 1 dakika
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMarketData = async (updatePricesOnly = false) => {
      try {
        let currentList = stockListRef.current;

        // 1. Eğer liste henüz yoksa veya bu bir ilk yüklemeyse, API'den Top 25 listesini çek
        if ((!updatePricesOnly && currentList.length === 0)) {
          setLoading(true);
          const listRes = await fetch(`${API_URL}/api/top25`);
          const listData = await listRes.json();
          
          if (Array.isArray(listData)) {
            currentList = listData.map((s: any) => ({
              symbol: s.symbol,
              name: s.name,
              price: 0,
              change: 0,
              pctChange: 0,
              cap: 'N/A',
              ytd: 'N/A'
            }));
            stockListRef.current = currentList;
            setStocks(currentList);
          }
        }
        
        if (currentList.length === 0) return; // Liste çekilemediyse dur

        // Python API'den verileri çek (Chunking ile URL limitini aşmadan)
        const chunkSize = 10; // Daha kararlı veri çekimi için düşürüldü
        const symbols = currentList.map(s => s.symbol);
        const chunks = [];
        
        for (let i = 0; i < symbols.length; i += chunkSize) {
          chunks.push(symbols.slice(i, i + chunkSize));
        }

        const allMarketData: any[] = [];

        // Tüm parçaları paralel değil seri çekelim (Sunucuyu yormamak için) veya Promise.all ile
        // Python yfinance multithreaded olduğu için Promise.all daha iyi olabilir.
        const promises = chunks.map(chunk => 
          fetch(`${API_URL}/api/market?symbols=${chunk.join(',')}`)
            .then(res => res.json())
            .catch(err => {
              console.error("Veri çekme hatası:", err);
              return [];
            })
        );

        const results = await Promise.all(promises);
        
        results.forEach(data => {
          if (Array.isArray(data)) {
            allMarketData.push(...data);
          }
        });

        // State güncelleme - Functional Update kullanarak önceki verileri koru
        setStocks(prevStocks => {
          // Eğer önceki veri varsa onu kullan, yoksa currentList (0'lı liste)
          const baseList = prevStocks.length > 0 ? prevStocks : currentList;
          
          return baseList.map(stock => {
            const marketData = allMarketData.find((d: any) => d.symbol === stock.symbol);
            if (marketData) {
              return {
                ...stock,
                price: marketData.price,
                change: marketData.change,
                pctChange: marketData.pctChange,
                cap: marketData.cap,
                ytd: marketData.ytd
              };
            }
            // Yeni veri yoksa (veya çekilemediyse) eskisini koru, 0 yapma
            return stock;
          });
        });
        
        if (!updatePricesOnly) {
          setLoading(false);
        }

      } catch (error) {
        console.error('Piyasa verileri çekilemedi:', error);
        setLoading(false);
      }
    };

    // İlk yükleme
    if (stockListRef.current.length === 0) {
      fetchMarketData(false);
    } else {
      // Veri zaten varsa sadece fiyatları güncelle (Loading göstermeden)
      fetchMarketData(true);
    }
    
    // Her 2 dakikada bir sadece fiyatları güncelle (anlık güncelleme için)
    const priceUpdateInterval = setInterval(() => {
      console.log('Fiyatlar güncelleniyor...');
      fetchMarketData(true); // Sadece fiyat güncellemesi
    }, 2 * 60 * 1000); // 2 dakika
    
    // Cleanup
    return () => {
      clearInterval(priceUpdateInterval);
    };
  }, []);

  // ETF Verilerini Çek
  useEffect(() => {
    if (activeTab === 'etf' && etfs.length === 0) {
      const fetchEtfs = async () => {
        setLoading(true);
        try {
          // Başlangıç listesi
          const initialEtfs = ETF_LIST.map(e => ({
            symbol: e.symbol,
            name: e.name,
            price: 0,
            change: 0,
            pctChange: 0,
            cap: 'N/A',
            ytd: 'N/A'
          }));
          setEtfs(initialEtfs);

          const symbols = initialEtfs.map(s => s.symbol);
          const chunkSize = 10;
          const chunks = [];
          for (let i = 0; i < symbols.length; i += chunkSize) {
            chunks.push(symbols.slice(i, i + chunkSize));
          }

          const promises = chunks.map(chunk => 
            fetch(`${API_URL}/api/market?symbols=${chunk.join(',')}`)
              .then(res => res.json())
              .catch(() => [])
          );

          const results = await Promise.all(promises);
          const allData: any[] = [];
          results.forEach(res => { if (Array.isArray(res)) allData.push(...res); });

          if (allData.length > 0) {
            setEtfs(prev => prev.map(etf => {
              const marketData = allData.find((d: any) => d.symbol === etf.symbol);
              if (marketData) {
                return {
                  ...etf,
                  price: marketData.price,
                  change: marketData.change,
                  pctChange: marketData.pctChange,
                  cap: marketData.cap,
                  ytd: marketData.ytd
                };
              }
              return etf;
            }));
          }
        } catch (error) {
          console.error("ETF verisi çekilemedi:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchEtfs();
    }
  }, [activeTab, etfs.length]);

  // Leveraged Stocks Verilerini Çek
  useEffect(() => {
    if (activeTab === 'leveraged' && leveragedStocks.length === 0) {
      const fetchLeveraged = async () => {
        setLoading(true);
        try {
          // Başlangıç listesi
          const initialList = LEVERAGED_LIST.map(e => ({
            symbol: e.symbol,
            name: e.name,
            price: 0,
            change: 0,
            pctChange: 0,
            cap: 'N/A',
            ytd: 'N/A'
          }));
          setLeveragedStocks(initialList);

          const symbols = initialList.map(s => s.symbol);
          const chunkSize = 10;
          const chunks = [];
          for (let i = 0; i < symbols.length; i += chunkSize) {
            chunks.push(symbols.slice(i, i + chunkSize));
          }

          const promises = chunks.map(chunk => 
            fetch(`${API_URL}/api/market?symbols=${chunk.join(',')}`)
              .then(res => res.json())
              .catch(() => [])
          );

          const results = await Promise.all(promises);
          const allData: any[] = [];
          results.forEach(res => { if (Array.isArray(res)) allData.push(...res); });

          if (allData.length > 0) {
            setLeveragedStocks(prev => prev.map(item => {
              const marketData = allData.find((d: any) => d.symbol === item.symbol);
              if (marketData) {
                return {
                  ...item,
                  price: marketData.price,
                  change: marketData.change,
                  pctChange: marketData.pctChange,
                  cap: marketData.cap,
                  ytd: marketData.ytd
                };
              }
              return item;
            }));
          }
        } catch (error) {
          console.error("Leveraged verisi çekilemedi:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchLeveraged();
    }
  }, [activeTab, leveragedStocks.length]);

  // Coin Verilerini Çek
  useEffect(() => {
    if (activeTab === 'coin' && coins.length === 0) {
      const fetchCoins = async () => {
        setLoading(true);
        try {
          // Başlangıç listesi
          const initialCoins = COIN_LIST.map(e => ({
            symbol: e.symbol,
            name: e.name,
            price: 0,
            change: 0,
            pctChange: 0,
            cap: 'N/A',
            ytd: 'N/A'
          }));
          setCoins(initialCoins);

          const symbols = initialCoins.map(s => s.symbol);
          const chunkSize = 10;
          const chunks = [];
          for (let i = 0; i < symbols.length; i += chunkSize) {
            chunks.push(symbols.slice(i, i + chunkSize));
          }

          const promises = chunks.map(chunk => 
            fetch(`${API_URL}/api/market?symbols=${chunk.join(',')}`)
              .then(res => res.json())
              .catch(() => [])
          );

          const results = await Promise.all(promises);
          const allData: any[] = [];
          results.forEach(res => { if (Array.isArray(res)) allData.push(...res); });

          if (allData.length > 0) {
            setCoins(prev => prev.map(coin => {
              const marketData = allData.find((d: any) => d.symbol === coin.symbol);
              if (marketData) {
                return {
                  ...coin,
                  price: marketData.price,
                  change: marketData.change,
                  pctChange: marketData.pctChange,
                  cap: marketData.cap,
                  ytd: marketData.ytd
                };
              }
              return coin;
            }));
          }
        } catch (error) {
          console.error("Coin verisi çekilemedi:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchCoins();
    }
  }, [activeTab, coins.length]);

  // Fiyat değişimlerini izle ve flash efekti tetikle
  useEffect(() => {
    const newFlashStates: { [key: string]: 'up' | 'down' | null } = {};
    let hasChanges = false;

    const currentList = activeTab === 'stocks' ? stocks : (activeTab === 'etf' ? etfs : (activeTab === 'leveraged' ? leveragedStocks : coins));

    currentList.forEach(stock => {
      const prevPrice = prevPricesRef.current[stock.symbol];
      // Sadece önceki fiyat varsa ve değişmişse flash yap (ilk yüklemede yapma)
      if (prevPrice !== undefined && prevPrice !== stock.price) {
        if (stock.price > prevPrice) {
          newFlashStates[stock.symbol] = 'up';
          hasChanges = true;
        } else if (stock.price < prevPrice) {
          newFlashStates[stock.symbol] = 'down';
          hasChanges = true;
        }
      }
      prevPricesRef.current[stock.symbol] = stock.price;
    });

    if (hasChanges) {
      setFlashStates(prev => ({ ...prev, ...newFlashStates }));
      
      // 1 saniye sonra flash efektini kaldır (fade out için)
      setTimeout(() => {
        setFlashStates(prev => {
          const next = { ...prev };
          Object.keys(newFlashStates).forEach(key => {
            delete next[key];
          });
          return next;
        });
      }, 1000);
    }
  }, [stocks, etfs, leveragedStocks, coins, activeTab]);

  // Arama Terimi Değiştiğinde API'den Ara (Debounce ile)
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/search?q=${searchTerm}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSearchResults(data);
        }
      } catch (e) { console.error("Arama hatası:", e); } 
      finally { setIsSearching(false); }
    }, 500); // 500ms bekle

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Güvenli Formatlama Fonksiyonları (Çökme Önleyici)
  const formatPrice = (price: number | undefined | null, currency?: string): string => {
    if (price === undefined || price === null || isNaN(price)) return currency === 'TRY' ? '₺0.0000' : '$0.00';
    const formatted = price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency === 'TRY' ? `₺${price.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : `$${formatted}`;
  };

  const formatChange = (change: number | undefined | null): string => {
    if (change === undefined || change === null || isNaN(change)) return '0.00';
    return change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
  };

  const formatPctChange = (pct: number | undefined | null): string => {
    if (pct === undefined || pct === null || isNaN(pct)) return '0.00%';
    return pct >= 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`;
  };

  const handleRequestSort = (property: string) => {
    let direction: 'asc' | 'desc' | undefined = 'asc';
    if (sortConfig.key === property && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === property && sortConfig.direction === 'desc') {
      direction = undefined;
    }
    setSortConfig({ key: direction ? property : null, direction });
  };

  // Yeni Hisse Ekleme Fonksiyonu
  const handleAddStock = async (symbolToAdd: string) => {
    const upperSymbol = symbolToAdd.toUpperCase().trim();
    
    // Zaten listede var mı?
    if (stocks.some(s => s.symbol === upperSymbol)) {
      setSnackbarMessage('Bu hisse zaten listede ekli.');
      setSnackbarOpen(true);
      // Context kullanıldığı için buradan temizleyemeyebiliriz, 
      // ama yerel ise temizleriz.
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/market?symbols=${upperSymbol}`);
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const newStockData = data[0];
        const newStock: StockData = {
          symbol: newStockData.symbol,
          name: newStockData.symbol, // İsim API'den gelmiyor, sembolü kullanıyoruz
          price: newStockData.price,
          change: newStockData.change,
          pctChange: newStockData.pctChange,
          cap: newStockData.cap,
          ytd: newStockData.ytd
        };
        
        // Listeye ekle (En başa)
        const newList = [newStock, ...stocks];
        setStocks(newList);
        stockListRef.current = newList; // Ref'i de güncelle
        
        setSnackbarMessage(`${upperSymbol} listeye eklendi.`);
        setSnackbarOpen(true);
        setSearchResults([]); // Sonuçları temizle
      } else {
        setSnackbarMessage('Hisse bulunamadı veya veri çekilemedi.');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Hisse ekleme hatası:", error);
      setSnackbarMessage('Hata oluştu.');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Arama filtresi
  const filteredStocks = useMemo(() => {
    const sourceList = activeTab === 'stocks' ? stocks : (activeTab === 'etf' ? etfs : (activeTab === 'leveraged' ? leveragedStocks : coins));
    if (!Array.isArray(sourceList)) return []; // Liste değilse boş dön
    let result = sourceList.filter(stock => 
      stock && ( // Stock objesi var mı kontrol et
        (stock.symbol || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
        (stock.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
      )
    );

    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        if (!a || !b) return 0; // Güvenlik kontrolü
        let aValue: any = a[sortConfig.key as keyof StockData];
        let bValue: any = b[sortConfig.key as keyof StockData];

        if (sortConfig.key === 'cap') {
          aValue = parseCapValue(a.cap);
          bValue = parseCapValue(b.cap);
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue);
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [stocks, etfs, leveragedStocks, coins, activeTab, searchTerm, sortConfig]);

  return (
    <Box sx={{ 
      width: '100%', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#000000', 
      color: 'white',
      pt: '64px' // Navbar yüksekliği
    }}>
      
      <Box sx={{ display: 'flex', flex: 1, width: '100%' }}>
        {/* Sol Panel: Tablo */}
        <Box sx={{ 
          flex: 1, 
          minWidth: '600px', 
          display: 'flex', 
          flexDirection: 'column',
        }}>
          {/* Sticky Header: Stocks/Overview Butonları */}
          <Box sx={{
            position: 'sticky',
            top: '64px', // Navbar'ın hemen altına yapışsın
            zIndex: 100,
            backgroundColor: '#000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pt: 2, // Navbar ile arasında boşluk
            pb: 2
          }}>
            {/* Üst Çizgi - Kenarlardan boşluklu */}
            <Box sx={{ width: 'calc(100% - 48px)', height: '1px', bgcolor: 'rgba(255, 255, 255, 0.12)' }} />
            
            <Box sx={{ display: 'flex', gap: 2, py: 1.5, alignItems: 'center' }}>
              <Button
                onClick={() => setActiveTab('stocks')}
                sx={{
                  color: activeTab === 'stocks' ? 'primary.main' : '#a0a0a0',
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === 'stocks' ? 'bold' : 'normal',
                  minWidth: 'auto',
                  px: 2,
                  '&:hover': { backgroundColor: 'transparent' }
                }}
              >
                Stocks
              </Button>
              <Button
                onClick={() => setActiveTab('etf')}
                sx={{
                  color: activeTab === 'etf' ? 'primary.main' : '#a0a0a0',
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === 'etf' ? 'bold' : 'normal',
                  minWidth: 'auto',
                  px: 2,
                  '&:hover': { backgroundColor: 'transparent' }
                }}
              >
                ETF
              </Button>

              <Button
                onClick={() => setActiveTab('leveraged')}
                sx={{
                  color: activeTab === 'leveraged' ? 'primary.main' : '#a0a0a0',
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === 'leveraged' ? 'bold' : 'normal',
                  minWidth: 'auto',
                  px: 2,
                  '&:hover': { backgroundColor: 'transparent' }
                }}
              >
                Leveraged Stocks
              </Button>
              <Button
                onClick={() => setActiveTab('coin')}
                sx={{
                  color: activeTab === 'coin' ? 'primary.main' : '#a0a0a0',
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === 'coin' ? 'bold' : 'normal',
                  minWidth: 'auto',
                  px: 2,
                  '&:hover': { backgroundColor: 'transparent' }
                }}
              >
                Coin
              </Button>
            </Box>
            
            {/* Manuel Arama Kutusu (Sadece butona basınca açılır) */}
            {showAddInput && (
              <Box sx={{ width: 'calc(100% - 48px)', maxWidth: '500px', mb: 2 }}>
                <TextField
                  fullWidth
                  autoFocus
                  variant="outlined"
                  placeholder="Şirket adı veya sembolü (Örn: Palantir, PLTR)..."
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.05)',
                    borderRadius: 1,
                    '& fieldset': { border: 'none' },
                    input: { color: 'white' }
                  }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#a0a0a0' }} /></InputAdornment>,
                  }}
                />
              </Box>
            )}

            {/* Alt Çizgi - Kenarlardan boşluklu */}
            <Box sx={{ width: 'calc(100% - 48px)', height: '1px', bgcolor: 'rgba(255, 255, 255, 0.12)' }} />
          </Box>

          {/* Tablo Başlıkları (Ortak) */}
            <Table size="small" aria-label="market table" sx={{ m: 0, ml: 0, pl: 0, width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    color: '#a0a0a0', 
                    pl: '69px', 
                    borderLeft: 'none', 
                    backgroundColor: '#000000',
                    position: 'sticky',
                    top: '150px', // Navbar (64) + Sticky Header (~86)
                    zIndex: 90
                  }}>
                    <Box 
                      sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                      onClick={() => handleRequestSort('symbol')}
                    >
                      SYMBOL
                      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                        <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'symbol' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                        <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'symbol' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ 
                    fontWeight: 'bold', 
                    color: '#a0a0a0', 
                    pr: 2, 
                    backgroundColor: '#000000',
                    position: 'sticky',
                    top: '150px',
                    zIndex: 90
                  }}>
                    <Box 
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' }} 
                      onClick={() => handleRequestSort('price')}
                    >
                      PRICE
                      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                        <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'price' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                        <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'price' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ 
                    fontWeight: 'bold', 
                    color: '#a0a0a0', 
                    pr: 2, 
                    backgroundColor: '#000000',
                    position: 'sticky',
                    top: '150px',
                    zIndex: 90
                  }}>
                    <Box 
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' }} 
                      onClick={() => handleRequestSort('change')}
                    >
                      CHANGE
                      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                        <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'change' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                        <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'change' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ 
                    fontWeight: 'bold', 
                    color: '#a0a0a0', 
                    pr: 2, 
                    backgroundColor: '#000000',
                    position: 'sticky',
                    top: '150px',
                    zIndex: 90
                  }}>
                    <Box 
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' }} 
                      onClick={() => handleRequestSort('pctChange')}
                    >
                      %CHANGE
                      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                        <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'pctChange' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                        <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'pctChange' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ 
                    fontWeight: 'bold', 
                    color: '#a0a0a0', 
                    pr: 2, 
                    backgroundColor: '#000000',
                    position: 'sticky',
                    top: '150px',
                    zIndex: 90
                  }}>
                    <Box 
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' }} 
                      onClick={() => handleRequestSort('cap')}
                    >
                      CAP
                      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                        <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'cap' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                        <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'cap' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ 
                    fontWeight: 'bold', 
                    color: '#a0a0a0', 
                    pr: 2, 
                    backgroundColor: '#000000',
                    position: 'sticky',
                    top: '150px',
                    zIndex: 90
                  }}>
                    <Box 
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' }} 
                      onClick={() => handleRequestSort('ytd')}
                    >
                      YTD
                      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                        <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'ytd' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                        <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'ytd' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ 
                    fontWeight: 'bold', 
                    color: '#a0a0a0', 
                    pr: 2, 
                    backgroundColor: '#000000',
                    position: 'sticky',
                    top: '150px',
                    zIndex: 90
                  }}>
                    WATCH
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ filter: loading ? 'blur(4px)' : 'none', transition: 'filter 0.3s', opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
                {/* Arama Yapılıyor Göstergesi */}
                {searchTerm && isSearching && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 2, textAlign: 'center', color: '#a0a0a0' }}>
                      <CircularProgress size={20} sx={{ mr: 1, verticalAlign: 'middle' }} /> Aranıyor...
                    </TableCell>
                  </TableRow>
                )}

                {/* API Arama Sonuçları (Listede olmayanlar için) */}
                {searchTerm && !isSearching && searchResults.length > 0 && (
                  <>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 1, bgcolor: 'rgba(255,255,255,0.05)', color: '#a0a0a0', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        ARAMA SONUÇLARI (Listeye Eklemek İçin Tıklayın)
                      </TableCell>
                    </TableRow>
                    {searchResults.map((result) => (
                      // Eğer zaten listede varsa gösterme (Aktif tab listesinde)
                      !(activeTab === 'stocks' ? stocks : (activeTab === 'etf' ? etfs : (activeTab === 'leveraged' ? leveragedStocks : coins))).some(s => s && s.symbol === result.symbol) && (
                        <TableRow 
                          hover 
                          key={result.symbol}
                          onClick={() => handleAddStock(result.symbol)}
                          sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0, 200, 83, 0.1)' } }}
                        >
                          <TableCell colSpan={7} sx={{ color: 'white', py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Box sx={{ position: 'relative' }}>
                                <Avatar 
                                  src={`${API_URL}/logos/${result.symbol}.png`} 
                                  alt={result.symbol}
                                  sx={{ 
                                    width: 32, 
                                    height: 32,
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    color: '#fff'
                                  }}
                                  imgProps={{ 
                                    loading: "lazy",
                                    onError: (e) => { (e.target as HTMLImageElement).style.display = 'none'; }
                                  }}
                                >
                                  {result.symbol.substring(0, 2)}
                                </Avatar>
                                <AddCircleOutlineIcon sx={{ color: 'primary.main', position: 'absolute', bottom: -4, right: -4, fontSize: 16, bgcolor: '#000000', borderRadius: '50%' }} />
                              </Box>
                              <Box>
                                <Typography sx={{ fontWeight: 'bold' }}>{result.symbol}</Typography>
                                <Typography variant="caption" sx={{ color: '#a0a0a0' }}>{result.name} ({result.exch})</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )
                    ))}
                  </>
                )}

                {/* Hiçbir Sonuç Bulunamadıysa */}
                {searchTerm && !isSearching && filteredStocks.length === 0 && searchResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 4, textAlign: 'center', color: '#a0a0a0' }}>
                      "{searchTerm}" için sonuç bulunamadı.
                    </TableCell>
                  </TableRow>
                )}

                {filteredStocks.map((stock) => (
                  <TableRow
                    hover
                    key={stock.symbol}
                    onClick={() => navigate(`/market/${stock.symbol}`)}
                    sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      cursor: 'pointer',
                      transition: 'background-color 1s ease', // Renk değişimini yumuşat
                      backgroundColor: flashStates[stock.symbol] === 'up' 
                        ? 'rgba(0, 200, 83, 0.2)' // Yeşil flash
                        : flashStates[stock.symbol] === 'down' 
                          ? 'rgba(255, 82, 82, 0.2)' // Kırmızı flash
                          : 'inherit'
                    }}
                  >
                    <TableCell component="th" scope="row" sx={{ pl: '69px', borderLeft: 'none', color: 'white' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          src={`${API_URL}/logos/${stock.symbol}.png`} 
                          alt={stock.symbol}
                          sx={{ 
                            width: 32, 
                            height: 32,
                            bgcolor: 'rgba(255,255,255,0.1)',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#fff'
                          }}
                          imgProps={{ 
                            loading: "lazy",
                            onError: (e) => { (e.target as HTMLImageElement).style.display = 'none'; } // Resim yoksa gizle, harf görünsün
                          }}
                        >
                          {stock.symbol.substring(0, 2)}
                        </Avatar>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{stock.symbol}</Typography>
                          <Typography variant="caption" sx={{ color: '#a0a0a0' }}>{stock.name}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 2, color: 'white' }}>{formatPrice(stock.price, stock.currency)}</TableCell>
                    <TableCell align="right" sx={{ color: stock.change >= 0 ? 'success.main' : 'error.main', pr: 2 }}>
                      {formatChange(stock.change)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: stock.pctChange >= 0 ? 'success.main' : 'error.main', pr: 2 }}>
                      {formatPctChange(stock.pctChange)}
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 2, color: 'white' }}>{stock.cap || 'N/A'}</TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        pr: 2, 
                        color: (stock.ytd && parseFloat(stock.ytd.replace('%', '')) > 0) 
                          ? 'success.main' 
                          : (stock.ytd && parseFloat(stock.ytd.replace('%', '')) < 0) 
                            ? 'error.main' 
                            : 'white' 
                      }}
                    >
                      {stock.ytd || 'N/A'}
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 2 }}>
                      <Tooltip title={watchlist.includes(stock.symbol) ? "İzleme Listesinden Çıkar" : "İzleme Listesine Ekle"}>
                        <IconButton 
                          onClick={(e) => toggleWatchlist(stock.symbol, e)}
                          size="small"
                          sx={{ 
                            color: watchlist.includes(stock.symbol) ? '#2979ff' : '#a0a0a0',
                            '&:hover': { color: '#2979ff', bgcolor: 'rgba(41, 121, 255, 0.08)' }
                          }}
                        >
                          {watchlist.includes(stock.symbol) ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </Box>

        {/* Dikey Ayırıcı Çizgi */}
        <Box sx={{ 
          width: '1px', 
          bgcolor: 'rgba(255, 255, 255, 0.12)',
          my: 4, // Üstten ve alttan boşluk bırakarak diğer çizgilerle birleşmesini engelle
          mx: 2  // Her iki yandan boşluk bırak
        }} />
        
        {/* Sağ taraf için boş alan */}
        <Box sx={{ width: '400px', minWidth: '400px', p: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {/* Navbar (64px) + 176px = 240px aşağıdan başla */}
          <Box sx={{ mt: '176px', px: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'white' }}>Market Overview</Typography>
            <List sx={{ width: '100%', maxWidth: 360 }}>
              {marketOverview.map((asset) => (
                <ListItem 
                  key={asset.symbol} 
                  sx={{ px: 0, py: 1, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                  onClick={() => navigate(`/market/${asset.symbol}`)}
                >
                  <ListItemAvatar>
                    <Avatar 
                      src={`${API_URL}/logos/${asset.symbol}.png`}
                      alt={asset.symbol}
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.1)', 
                        color: 'white', 
                        fontWeight: 'bold',
                        width: 40, 
                        height: 40,
                        fontSize: '0.9rem'
                      }}
                      imgProps={{ 
                        onError: (e) => { (e.target as HTMLImageElement).style.display = 'none'; }
                      }}
                    >
                      {((asset as any).displaySymbol || asset.symbol).substring(0, 2)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={(asset as any).displaySymbol || asset.symbol}
                    secondary={asset.name}
                    primaryTypographyProps={{ fontWeight: 'bold', color: 'white' }}
                    secondaryTypographyProps={{ color: '#a0a0a0' }}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Typography variant="body1" fontWeight="bold" color="white">
                      ${asset.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" sx={{ color: (asset as any).change >= 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                      {(asset as any).change > 0 ? '+' : ''}{(asset as any).change.toFixed(2)} ({(asset as any).pctChange.toFixed(2)}%)
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        </Box>
      </Box>

      {/* Bildirim Snackbar */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%', bgcolor: '#2e7d32', color: 'white' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}