import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { API_URL } from '../../config';

const BENCHMARKS = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'Nasdaq 100' },
  { symbol: 'DIA', name: 'Dow Jones' },
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'GC=F', name: 'Gold' }
];

export default function ComparisonView() {
  const [portfolioData, setPortfolioData] = useState<any[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<any[]>([]);
  const [benchmarkType, setBenchmarkType] = useState<'INDEX' | 'FRIEND'>('INDEX');
  const [selectedBenchmark, setSelectedBenchmark] = useState('SPY');
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [friends, setFriends] = useState<any[]>([]);
  const [customSymbol, setCustomSymbol] = useState('');
  const [viewMode, setViewMode] = useState<'return' | 'profit'>('return');
  const [selectedRange, setSelectedRange] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [hoveredData, setHoveredData] = useState<any | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // 1. Portföy Verisini Çek
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
        const headers = { 'X-User-ID': String(user.id || '1') };
        const res = await fetch(`${API_URL}/api/portfolio/history`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
          setPortfolioData(data);
        }
        
        // Arkadaşları da çek
        const friendsRes = await fetch(`${API_URL}/api/friends`, { headers });
        const friendsData = await friendsRes.json();
        if (Array.isArray(friendsData)) setFriends(friendsData);

      } catch (err) {
        console.error("Portföy verisi hatası:", err);
      }
    };
    fetchPortfolio();
  }, []);

  // 2. Benchmark Verisini Çek (Portföy verisi gelince)
  useEffect(() => {
    if (portfolioData.length === 0) {
        setLoading(false);
        return;
    }

    const fetchBenchmark = async () => {
      setLoading(true);
      try {
        if (benchmarkType === 'INDEX') {
            const startDate = portfolioData[0].date;
            const endDate = new Date().toISOString().split('T')[0];
            const res = await fetch(`${API_URL}/api/stock?symbol=${selectedBenchmark}&start=${startDate}&end=${endDate}&interval=1d`);
            const data = await res.json();
            if (Array.isArray(data)) setBenchmarkData(data);
        } else if (benchmarkType === 'FRIEND' && selectedFriendId) {
            const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
            const headers = { 'X-User-ID': String(user.id || '1') };
            const res = await fetch(`${API_URL}/api/friends/portfolio/${selectedFriendId}`, { headers });
            const data = await res.json();
            // Arkadaş verisi {date, value, invested} formatında gelir, bunu {date, price} formatına çevirelim
            if (Array.isArray(data)) {
                const formatted = data.map(d => ({ date: d.date, price: d.value })); // Fiyat yerine toplam değer kullanıyoruz
                setBenchmarkData(formatted);
            }
        }
      } catch (err) {
        console.error("Benchmark verisi hatası:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBenchmark();
  }, [portfolioData, selectedBenchmark, benchmarkType, selectedFriendId]);

  // Arama Sonuçlarını Getir
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customSymbol.length >= 1) {
        fetch(`${API_URL}/api/search?q=${customSymbol}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setSearchResults(data);
              setShowResults(true);
            }
          })
          .catch(err => console.error(err));
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customSymbol]);

  // 3. Verileri Birleştir ve Yüzdelik/Kar Hesapla
  const fullChartData = useMemo(() => {
    if (portfolioData.length === 0 || benchmarkData.length === 0) return [];

    // Gelecek tarihli verileri filtrele (Hatalı işlem girişlerini önlemek için)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const validPortfolioData = portfolioData.filter(d => new Date(d.date) <= today);

    if (validPortfolioData.length === 0) return [];

    // Benchmark verisini tarih bazlı map'e çevir (Hızlı erişim için)
    const benchmarkMap = new Map();
    benchmarkData.forEach(item => {
        const dateStr = item.date.split('T')[0];
        benchmarkMap.set(dateStr, item.price);
    });

    // Simülasyon Değişkenleri (Kar $ hesabı için)
    let benchmarkUnits = 0; 
    let prevInvested = 0;
    let lastValidBPrice = benchmarkData[0].price; 
    
    // TWR Değişkenleri (Getiri % hesabı için)
    let cumulativePortfolioTwr = 1.0;
    const startBenchmarkPrice = benchmarkData[0].price;

    return validPortfolioData.map((pItem, i) => {
        // Tarih formatını eşle (YYYY-MM-DD) - Saat bilgisini yoksay
        const dateStr = pItem.date.split(' ')[0];
        let bPrice = benchmarkMap.get(dateStr);
        
        // Eğer o gün piyasa kapalıysa (fiyat yoksa), son bilinen fiyatı kullan
        if (bPrice) {
            lastValidBPrice = bPrice;
        } else {
            bPrice = lastValidBPrice;
        }

        // --- 1. Kar ($) Hesabı (Simülasyon / ROI Mantığı) ---
        const cashFlow = pItem.invested - prevInvested;
        
        // Simülasyon: Para girdiyse o günkü fiyattan varlık al
        if (bPrice > 0) {
            const unitsChange = cashFlow / bPrice;
            benchmarkUnits += unitsChange;
        }
        
        prevInvested = pItem.invested;

        // Benchmark Portföyünün Toplam Değeri (Adet * Güncel Fiyat)
        const benchmarkValue = benchmarkUnits * bPrice;
        
        // Karşılaştırma: Toplam Kar/Zarar Tutarı ($)
        const invested = pItem.invested;
        
        const portfolioProfit = pItem.value - invested;
        const benchmarkProfit = benchmarkValue - invested;

        // --- 2. Getiri (%) Hesabı (TWR Mantığı) ---
        // Portföy TWR: Nakit akışlarını arındırarak hesaplanır
        if (i > 0) {
            const prev = validPortfolioData[i-1];
            const flow = pItem.invested - prev.invested;
            if (prev.value > 0) {
                const periodReturn = (pItem.value - flow - prev.value) / prev.value;
                cumulativePortfolioTwr *= (1 + periodReturn);
            }
        }
        const portfolioPct = (cumulativePortfolioTwr - 1) * 100;

        // EĞER ARKADAŞ KIYASLAMASIYSA:
        // Arkadaşın verisi zaten portföy değeri olarak geliyor (price = value).
        // Bu yüzden direkt değeri kullanabiliriz, simülasyona gerek yok.
        const finalBenchmarkProfit = benchmarkType === 'FRIEND' ? (bPrice - startBenchmarkPrice) : benchmarkProfit;

        // Benchmark TWR: Sadece fiyat değişimi (Nakit akışı etkisi yoktur)
        const benchmarkPct = startBenchmarkPrice > 0 ? ((bPrice - startBenchmarkPrice) / startBenchmarkPrice) * 100 : 0;

        // Güvenli değerler (NaN kontrolü)
        const safePortfolioPct = isNaN(portfolioPct) ? 0 : portfolioPct;
        const safePortfolioProfit = isNaN(portfolioProfit) ? 0 : portfolioProfit;
        const safeBenchmarkPct = isNaN(benchmarkPct) ? 0 : benchmarkPct;
        const safeBenchmarkProfit = isNaN(finalBenchmarkProfit) ? 0 : finalBenchmarkProfit;

        return {
            date: pItem.date,
            portfolio: viewMode === 'return' ? safePortfolioPct : safePortfolioProfit,
            benchmark: viewMode === 'return' ? safeBenchmarkPct : safeBenchmarkProfit,
            // Hesaplamalar için ham veriler
            portfolioProfit: safePortfolioProfit,
            benchmarkProfit: safeBenchmarkProfit,
            portfolioPct: safePortfolioPct,
            benchmarkPct: safeBenchmarkPct,
            portfolioValue: pItem.value,
            benchmarkValue: benchmarkValue
        };
    });
  }, [portfolioData, benchmarkData, viewMode, benchmarkType]);

  // Tarih Aralığına Göre Filtreleme
  const chartData = useMemo(() => {
    if (!fullChartData || fullChartData.length === 0) return [];
    if (selectedRange === 'ALL') return fullChartData;

    // Son veri tarihini al
    const lastItem = fullChartData[fullChartData.length - 1];
    const lastDate = new Date(lastItem.date);
    let startDate = new Date(lastDate);

    switch (selectedRange) {
        case '1H': startDate.setDate(lastDate.getDate() - 7); break; // 1 Hafta (7 Gün)
        case '1A': startDate.setMonth(lastDate.getMonth() - 1); break;
        case '3A': startDate.setMonth(lastDate.getMonth() - 3); break;
        case '6A': startDate.setMonth(lastDate.getMonth() - 6); break;
        case 'YTD': startDate = new Date(lastDate.getFullYear(), 0, 1); break;
        case '1Y': startDate.setFullYear(lastDate.getFullYear() - 1); break;
        case '5Y': startDate.setFullYear(lastDate.getFullYear() - 5); break;
        default: return fullChartData;
    }
    
    return fullChartData.filter(item => new Date(item.date) >= startDate);
  }, [fullChartData, selectedRange]);

  const handleBenchmarkChange = (_: React.MouseEvent<HTMLElement>, newBenchmark: string) => {
    if (newBenchmark !== null) {
      setSelectedBenchmark(newBenchmark);
      setBenchmarkType('INDEX');
      setCustomSymbol('');
    }
  };

  const handleCustomSymbolSubmit = () => {
    if (customSymbol.trim()) {
      setSelectedBenchmark(customSymbol.toUpperCase().trim());
      setBenchmarkType('INDEX');
    }
  };

  const handleResultClick = (symbol: string) => {
    setSelectedBenchmark(symbol);
    setBenchmarkType('INDEX');
    setCustomSymbol(symbol);
    setSearchResults([]);
    setShowResults(false);
  };

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: 'return' | 'profit') => {
    if (newMode !== null) {
      // Arkadaş modundaysa ve profit seçilmeye çalışılıyorsa engelle
      if (benchmarkType === 'FRIEND' && newMode === 'profit') return;
      setViewMode(newMode);
    }
  };

  // Gradient Offset Hesaplama (Yeşil/Kırmızı ayrımı için)
  const gradientOffset = () => {
    if (chartData.length === 0) return 0;
    
    // NaN veya geçersiz değerleri filtrele
    const values = chartData.map((i) => i.portfolio).filter(v => v !== null && v !== undefined && !isNaN(v));
    
    if (values.length === 0) return 0;

    const dataMax = Math.max(...values);
    const dataMin = Math.min(...values);
  
    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
  
    return dataMax / (dataMax - dataMin);
  };
  
  const off = gradientOffset();
  const lastDataPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const displayData = hoveredData || lastDataPoint;
  const benchmarkColor = '#2196f3';

  let benchmarkName = selectedBenchmark;
  if (benchmarkType === 'INDEX') {
      benchmarkName = BENCHMARKS.find(b => b.symbol === selectedBenchmark)?.name || selectedBenchmark;
  } else {
      const friend = friends.find(f => String(f.id) === selectedFriendId);
      benchmarkName = friend ? `${friend.username}'in Portföyü` : 'Arkadaş';
  }

  const handleMouseMove = (e: any) => {
    if (e.activePayload && e.activePayload.length > 0) {
      setHoveredData(e.activePayload[0].payload);
    }
  };

  const handleMouseLeave = () => {
    setHoveredData(null);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box sx={{ bgcolor: 'rgba(20,20,20,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', p: 2, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1 }}>
            {new Date(label).toLocaleDateString('tr-TR')}
          </Typography>
          {payload.map((entry: any, index: number) => {
            let color = entry.color;
            // Portföy rengi kar/zarar durumuna göre
            if (entry.name === 'Portföyüm') {
                const isProfit = (data.portfolioProfit ?? 0) >= 0;
                color = isProfit ? '#00e676' : '#ff1744';
            } else {
                // Benchmark rengi sabit
                color = benchmarkColor;
            }

            // Arkadaş kıyaslamasında dolar değerlerini gizle
            const isFriendBenchmark = benchmarkType === 'FRIEND' && entry.name !== 'Portföyüm';
            const displayValue = isFriendBenchmark && viewMode === 'profit' 
                ? '******' 
                : (viewMode === 'return' 
                    ? `%${entry.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                    : `$${entry.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

            return (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                <Typography variant="body2" sx={{ color: 'white' }}>
                  {entry.name}: <Box component="span" sx={{ fontWeight: 'bold' }}>{displayValue}</Box>
                </Typography>
              </Box>
            );
          })}
        </Box>
      );
    }
    return null;
  };

  if (loading && portfolioData.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ 
      p: 4, 
      pt: '90px', 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)', 
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Typography variant="h4" fontWeight="800" sx={{ mb: 4, letterSpacing: '-1px' }}>
        Portföy Karşılaştırma
      </Typography>

      {/* Controls Section */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 4, 
        bgcolor: 'rgba(255,255,255,0.03)', 
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        position: 'relative',
        overflow: 'visible',
        display: 'flex',
        flexDirection: { xs: 'column', xl: 'row' },
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 3,
        zIndex: 20
      }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #2979ff, #00e676)', opacity: 0.6, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: { xs: '100%', xl: 'auto' }, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.05)', p: 0.5, borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)' }}>
                <Button 
                    onClick={() => setBenchmarkType('INDEX')}
                    sx={{ 
                        borderRadius: 2.5, 
                        px: 3, 
                        py: 1, 
                        textTransform: 'none', 
                        fontWeight: 'bold',
                        color: benchmarkType === 'INDEX' ? 'white' : '#888',
                        bgcolor: benchmarkType === 'INDEX' ? 'rgba(255,255,255,0.1)' : 'transparent',
                        '&:hover': { bgcolor: benchmarkType === 'INDEX' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' }
                    }}
                >
                    Piyasa Endeksi
                </Button>
                <Button 
                    onClick={() => {
                        setBenchmarkType('FRIEND');
                        setViewMode('return');
                    }}
                    sx={{ 
                        borderRadius: 2.5, 
                        px: 3, 
                        py: 1, 
                        textTransform: 'none', 
                        fontWeight: 'bold',
                        color: benchmarkType === 'FRIEND' ? 'white' : '#888',
                        bgcolor: benchmarkType === 'FRIEND' ? 'rgba(255,255,255,0.1)' : 'transparent',
                        '&:hover': { bgcolor: benchmarkType === 'FRIEND' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' }
                    }}
                >
                    Arkadaş
                </Button>
            </Box>

            {benchmarkType === 'FRIEND' && (
                <Select
                    value={selectedFriendId}
                    onChange={(e) => setSelectedFriendId(e.target.value)}
                    displayEmpty
                    size="small"
                    variant="standard"
                    disableUnderline
                    sx={{ 
                        color: 'white', 
                        minWidth: 200, 
                        bgcolor: 'rgba(255,255,255,0.05)', 
                        px: 2, 
                        py: 1, 
                        borderRadius: 2,
                        border: '1px solid rgba(255,255,255,0.1)',
                        '& .MuiSelect-icon': { color: 'white' }
                    }}
                >
                    <MenuItem value="" disabled>Arkadaş Seçiniz</MenuItem>
                    {friends.map(f => (
                        <MenuItem key={f.id} value={String(f.id)}>{f.username}</MenuItem>
                    ))}
                </Select>
            )}
        </Box>

        {benchmarkType === 'INDEX' && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', xl: 'auto' }, justifyContent: { xs: 'flex-start', xl: 'flex-end' } }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {BENCHMARKS.map((b) => {
                    const isSelected = selectedBenchmark === b.symbol;
                    return (
                        <Box 
                            key={b.symbol} 
                            onClick={(e) => handleBenchmarkChange(e as any, b.symbol)}
                            sx={{ 
                                px: 2, py: 1, 
                                borderRadius: 2, 
                                cursor: 'pointer', 
                                fontSize: '0.85rem', 
                                fontWeight: 'bold',
                                bgcolor: isSelected ? 'rgba(41, 121, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                                color: isSelected ? '#2979ff' : '#888',
                                border: '1px solid',
                                borderColor: isSelected ? 'rgba(41, 121, 255, 0.3)' : 'rgba(255,255,255,0.05)',
                                transition: 'all 0.2s',
                                '&:hover': { 
                                    bgcolor: isSelected ? 'rgba(41, 121, 255, 0.25)' : 'rgba(255,255,255,0.08)',
                                    color: isSelected ? '#2979ff' : 'white'
                                }
                            }}
                        >
                            {b.name}
                        </Box>
                    );
                })}
            </Box>

            <ClickAwayListener onClickAway={() => setShowResults(false)}>
                <Box sx={{ position: 'relative' }}>
                    <Box sx={{ display: 'flex', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', height: 40 }}>
                        <TextField
                        placeholder="Sembol Ara..."
                        variant="standard"
                        value={customSymbol}
                        onChange={(e) => setCustomSymbol(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCustomSymbolSubmit()}
                        onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                        InputProps={{
                            disableUnderline: true,
                            sx: { color: 'white', px: 2, height: '100%', fontSize: '0.9rem' }
                        }}
                        sx={{ width: 140 }}
                        />
                        <Button 
                        onClick={handleCustomSymbolSubmit}
                        sx={{ 
                            color: '#a0a0a0', 
                            minWidth: 'auto', 
                            px: 2, 
                            borderLeft: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: 0, 
                            '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.05)' } 
                        }}
                        >
                        Ara
                        </Button>
                    </Box>
                    {showResults && searchResults.length > 0 && (
                        <Paper sx={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            mt: 1,
                            bgcolor: '#1e1e1e',
                            color: 'white',
                            zIndex: 9999,
                            maxHeight: 300,
                            overflowY: 'auto',
                            borderRadius: 2,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <List disablePadding>
                                {searchResults.map((item) => (
                                    <ListItemButton 
                                        key={item.symbol} 
                                        onClick={() => handleResultClick(item.symbol)}
                                        sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                                    >
                                        <ListItemText 
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {item.symbol}
                                                    <Box component="span" sx={{ 
                                                        fontSize: '0.65rem', 
                                                        px: 0.8, 
                                                        py: 0.2,
                                                        borderRadius: 1,
                                                        bgcolor: item.type === 'ETF' ? 'rgba(255, 152, 0, 0.15)' : 'rgba(33, 150, 243, 0.15)',
                                                        color: item.type === 'ETF' ? '#ff9800' : '#2196f3',
                                                        border: '1px solid',
                                                        borderColor: item.type === 'ETF' ? 'rgba(255, 152, 0, 0.3)' : 'rgba(33, 150, 243, 0.3)'
                                                    }}>
                                                        {item.type === 'EQUITY' ? 'STOCK' : item.type}
                                                    </Box>
                                                </Box>
                                            }
                                            secondary={item.name}
                                            primaryTypographyProps={{ fontWeight: 'bold', component: 'div' }}
                                            secondaryTypographyProps={{ sx: { color: '#a0a0a0' } }}
                                        />
                                    </ListItemButton>
                                ))}
                            </List>
                        </Paper>
                    )}
                </Box>
            </ClickAwayListener>
        </Box>
        )}
      </Paper>

      <Paper sx={{ 
        width: '100%', 
        flex: 1, // Dinamik Yükseklik: Kalan tüm alanı doldur
        minHeight: 300, // Çok küçülmesini engelle
        p: 3, 
        bgcolor: 'black', 
        borderRadius: 2, 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        display: 'flex', 
        flexDirection: 'column',
        mb: 2 
      }}>
        {/* Grafik Başlığı ve Mod Seçimi */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', gap: 6 }}>
                <Box>
                    <Typography variant="subtitle2" sx={{ color: '#a0a0a0', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: (displayData?.portfolioProfit ?? 0) >= 0 ? '#00C805' : '#FF3B30' }} />
                        Portföyüm
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                        <Typography sx={{ 
                            fontFamily: 'Roboto, sans-serif',
                            fontStyle: 'normal',
                            fontWeight: 800,
                            color: viewMode === 'return' ? ((displayData?.portfolioPct ?? 0) >= 0 ? '#00C805' : '#FF3B30') : ((displayData?.portfolioProfit ?? 0) >= 0 ? '#00C805' : '#FF3B30'),
                            fontSize: '40px',
                            lineHeight: '50px'
                        }}>
                            {viewMode === 'return' 
                                ? `${(displayData?.portfolioPct ?? 0) >= 0 ? '+' : ''}${(displayData?.portfolioPct ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                                : `${(displayData?.portfolioProfit ?? 0) >= 0 ? '+' : ''}${(displayData?.portfolioProfit ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                        </Typography>
                        <Typography sx={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
                            ${(displayData?.portfolioValue ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                    </Box>
                </Box>

                <Box>
                    <Typography variant="subtitle2" sx={{ color: '#a0a0a0', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: benchmarkColor }} />
                        {benchmarkName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                        <Typography sx={{ 
                            fontFamily: 'Roboto, sans-serif',
                            fontStyle: 'normal',
                            fontWeight: 800,
                            color: viewMode === 'return' ? ((displayData?.benchmarkPct ?? 0) >= 0 ? '#00C805' : '#FF3B30') : ((displayData?.benchmarkProfit ?? 0) >= 0 ? '#00C805' : '#FF3B30'),
                            fontSize: '40px',
                            lineHeight: '50px'
                        }}>
                            {viewMode === 'return' 
                                ? `${(displayData?.benchmarkPct ?? 0) >= 0 ? '+' : ''}${(displayData?.benchmarkPct ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                                : (benchmarkType === 'FRIEND' ? '******' : `${(displayData?.benchmarkProfit ?? 0) >= 0 ? '+' : ''}${(displayData?.benchmarkProfit ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
                            }
                        </Typography>
                        <Typography sx={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
                            {benchmarkType === 'FRIEND' ? '******' : `$${(displayData?.benchmarkValue ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </Typography>
                    </Box>
                </Box>
            </Box>
            <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
                sx={{ 
                    bgcolor: 'rgba(255,255,255,0.05)',
                    borderRadius: 2,
                    p: 0.5,
                    '& .MuiToggleButton-root': { 
                        color: '#a0a0a0',
                        border: 'none',
                        textTransform: 'none',
                        px: 2,
                        py: 0.5,
                        borderRadius: 1.5,
                        fontWeight: 'bold',
                        '&.Mui-selected': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }
                    }
                }}
            >
                <ToggleButton value="profit" disabled={benchmarkType === 'FRIEND'}>Kar ($)</ToggleButton>
                <ToggleButton value="return">Getiri (%)</ToggleButton>
            </ToggleButtonGroup>
        </Box>

        <Box sx={{ width: '100%', height: 500, minHeight: 400 }}>
          {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
                data={chartData} 
                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
            <defs>
              <linearGradient id="splitColorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset={off} stopColor="#00e676" stopOpacity={0.1} />
                <stop offset={off} stopColor="#ff1744" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="splitStrokePortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset={off} stopColor="#00e676" stopOpacity={1} />
                <stop offset={off} stopColor="#ff1744" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={benchmarkColor} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={benchmarkColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip 
                content={<CustomTooltip />}
                cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
            
            <Area 
              name="Portföyüm" 
              type="linear" 
              dataKey="portfolio" 
              stroke="url(#splitStrokePortfolio)" 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#splitColorPortfolio)" 
              isAnimationActive={false}
              connectNulls
            />
            <Area 
              name={benchmarkName} 
              type="linear" 
              dataKey="benchmark" 
              stroke={benchmarkColor} 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#colorBenchmark)" 
              isAnimationActive={false}
            />
          </AreaChart>
          </ResponsiveContainer>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
              <Typography>Grafik verisi bulunamadı. Lütfen portföyünüze işlem ekleyin.</Typography>
            </Box>
          )}
        </Box>

        {/* Range Selector */}
        <Box sx={{
            mt: 3, 
            display: 'flex', 
            justifyContent: 'center',
            gap: 1,
            p: 0.5,
            bgcolor: 'rgba(255,255,255,0.03)',
            borderRadius: 3,
            width: 'fit-content',
            mx: 'auto'
        }}>
            {['1H', '1A', '3A', '6A', 'YTD', '1Y', '5Y', 'ALL'].map((range) => (
            <Typography
                key={range}
                onClick={() => setSelectedRange(range)}
                sx={{
                cursor: 'pointer', 
                fontSize: '0.8rem', 
                fontWeight: 'bold',
                color: selectedRange === range ? 'white' : '#666',
                bgcolor: selectedRange === range ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderRadius: 2, 
                px: 2,
                py: 0.8,
                transition: 'all 0.2s',
                '&:hover': {
                    color: 'white',
                    bgcolor: selectedRange !== range ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'
                }
                }}
            >
                {range}
            </Typography>
            ))}
        </Box>
      </Paper>
    </Box>
  );
}
