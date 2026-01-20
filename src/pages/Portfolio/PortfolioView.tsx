import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import CurrencyLiraIcon from '@mui/icons-material/CurrencyLira';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import WalletManager from '../../components/portfolio/WalletManager';
import PortfolioHistoryChart from '../../components/portfolio/PortfolioHistoryChart';
import { API_URL } from '../../config';

interface PortfolioItem {
  symbol: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
  totalCommission: number;
  currentPrice?: number;
  currentValue?: number;
  profit?: number;
  profitPercent?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function PortfolioView() {
  const navigate = useNavigate();

  // Cache Helper
  const getCachedData = (key: string, defaultVal: any) => {
    try {
      const cached = sessionStorage.getItem('portfolio_view_cache');
      if (cached) {
        const data = JSON.parse(cached);
        return data[key] !== undefined ? data[key] : defaultVal;
      }
    } catch (e) { console.error("Cache parse error", e); }
    return defaultVal;
  };

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => getCachedData('portfolio', []));
  const [walletBalance, setWalletBalance] = useState(() => getCachedData('walletBalance', 0));
  const [totalEquity, setTotalEquity] = useState(() => getCachedData('totalEquity', 0));
  const [totalProfit, setTotalProfit] = useState(() => getCachedData('totalProfit', 0));
  const [netInvestment, setNetInvestment] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>(() => getCachedData('recentTransactions', []));
  const [allTransactions, setAllTransactions] = useState<any[]>(() => getCachedData('allTransactions', []));
  const [showInTry, setShowInTry] = useState(false);
  const [usdTryRate, setUsdTryRate] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  const fetchData = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('borsa_user') || '{}');
      const headers = { 'X-User-ID': String(user.id || '1') };

      // 1. Cüzdan Bakiyesi
      const walletRes = await fetch(`${API_URL}/api/wallet`, { headers });
      const walletData = await walletRes.json();
      setWalletBalance(walletData.balance || 0);
      
      // Toplam Yatırılanı Hesapla (Sadeleştirildi: Yatırılan - Çekilen)
      let netInvested = 0;
      if (Array.isArray(walletData.transactions)) {
        walletData.transactions.forEach((tx: any) => {
          if (tx.type === 'DEPOSIT') netInvested += Number(tx.amount);
          if (tx.type === 'WITHDRAW') netInvested -= Number(tx.amount);
        });
      }
      setNetInvestment(netInvested);

      // 2. Portföy Hisseleri
      const portfolioRes = await fetch(`${API_URL}/api/portfolio`, { headers });
      const portfolioData = await portfolioRes.json();

      // 3. Son İşlemleri Çek
      const txRes = await fetch(`${API_URL}/api/transactions`, { headers });
      const txData = await txRes.json();
      if (Array.isArray(txData)) {
        setRecentTransactions(txData.slice(0, 5));
        setAllTransactions(txData);
      }

      // 4. Güncel Fiyatları Çek (Portföy + USD/TRY)
      // Portföydeki sembolleri al, TRY=X ekle (Tek istekte hepsini çekelim)
      const portfolioSymbols = Array.isArray(portfolioData) ? portfolioData.map((p: any) => p.symbol) : [];
      const uniqueSymbols = Array.from(new Set([...portfolioSymbols, 'TRY=X']));
      
      // Sembolleri encode et (TRY=X içindeki = işareti için önemli)
      const query = uniqueSymbols.map(s => encodeURIComponent(s)).join(',');
      const marketRes = await fetch(`${API_URL}/api/market?symbols=${query}`);
      const marketData = await marketRes.json();

      // Kur bilgisini güncelle
      if (Array.isArray(marketData)) {
        const tryData = marketData.find((m: any) => m.symbol === 'TRY=X');
        if (tryData) setUsdTryRate(tryData.price);
      }

      if (Array.isArray(portfolioData) && portfolioData.length > 0) {
        let equity = 0;

        const updatedPortfolio = portfolioData.map((item: any) => {
          const marketItem = Array.isArray(marketData) ? marketData.find((m: any) => m.symbol === item.symbol) : null;
          const currentPrice = marketItem ? marketItem.price : 0;
          const currentValue = item.quantity * currentPrice;
          const itemProfit = currentValue - item.totalCost;
          const itemProfitPercent = item.totalCost > 0 ? (itemProfit / item.totalCost) * 100 : 0;

          equity += currentValue;

          return {
            ...item,
            currentPrice,
            currentValue,
            profit: itemProfit,
            profitPercent: itemProfitPercent
          };
        });

        setPortfolio(updatedPortfolio);
        setTotalEquity(equity);
        
        // Hesaplama: Nakit Bakiye + Açık Pozisyonların Güncel Piyasa Değeri
        const currentNetWorth = equity + (walletData.balance || 0);
        setTotalProfit(currentNetWorth - netInvested);

        // Cache'i Güncelle
        const cacheData = {
          portfolio: updatedPortfolio,
          walletBalance: walletData.balance || 0,
          totalEquity: equity,
          totalProfit: currentNetWorth - netInvested,
          recentTransactions: Array.isArray(txData) ? txData.slice(0, 5) : [],
          allTransactions: Array.isArray(txData) ? txData : []
        };
        sessionStorage.setItem('portfolio_view_cache', JSON.stringify(cacheData));
      } else {
        setPortfolio([]);
        setTotalEquity(0);
        
        const currentNetWorth = walletData.balance || 0;
        setTotalProfit(currentNetWorth - netInvested);
        
        // Veri bos olsa bile cache'i guncelle (Eski verilerin kalmasini onle)
        const cacheData = {
          portfolio: [],
          walletBalance: walletData.balance || 0,
          totalEquity: 0,
          totalProfit: currentNetWorth - netInvested,
          recentTransactions: Array.isArray(txData) ? txData.slice(0, 5) : [],
          allTransactions: Array.isArray(txData) ? txData : []
        };
        sessionStorage.setItem('portfolio_view_cache', JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error("Portföy verisi çekilemedi:", error);
    }
  };

  useEffect(() => {
    fetchData();
    // İşlem yapıldığında güncellemek için event listener
    window.addEventListener('portfolio-updated', fetchData);
    return () => window.removeEventListener('portfolio-updated', fetchData);
  }, []);

  const totalNetWorth = totalEquity + walletBalance;

  // Pasta Grafik Verisi
  const pieData = [
    ...portfolio.map(item => ({ name: item.symbol, value: item.currentValue || 0 })),
    { name: 'Nakit (Cash)', value: walletBalance }
  ].filter(i => i.value > 0);

  const totalPieValue = pieData.reduce((sum, item) => sum + item.value, 0);

  // En İyi ve En Kötü Performansı Hesapla
  // Hem açık pozisyonları (portfolio) hem de kapanmış işlemleri (allTransactions üzerinden FIFO ile) değerlendirir.
  const { bestPerformer, worstPerformer } = useMemo(() => {
    // 1. Kapanmış Pozisyonların Performansını Hesapla (FIFO)
    const closedTrades: { symbol: string, profitPercent: number }[] = [];
    const inventory: { [key: string]: { qty: number, price: number }[] } = {};

    // İşlemleri tarihe göre sırala (Eskiden yeniye)
    const sortedTx = [...allTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTx.forEach(tx => {
        const sym = tx.symbol;
        const qty = Number(tx.quantity);
        const price = Number(tx.price);

        if (tx.type === 'BUY') {
            if (!inventory[sym]) inventory[sym] = [];
            inventory[sym].push({ qty, price });
        } else if (tx.type === 'SELL') {
            if (inventory[sym] && inventory[sym].length > 0) {
                let remainingToSell = qty;
                let costBasis = 0;
                let soldQtyTotal = 0;
                
                // FIFO: İlk girenleri sat
                while (remainingToSell > 0 && inventory[sym].length > 0) {
                    const batch = inventory[sym][0];
                    if (batch.qty <= remainingToSell) {
                        // Bu partinin tamamını sat
                        costBasis += batch.qty * batch.price;
                        soldQtyTotal += batch.qty;
                        remainingToSell -= batch.qty;
                        inventory[sym].shift(); // Kuyruktan çıkar
                    } else {
                        // Bu partinin bir kısmını sat
                        costBasis += remainingToSell * batch.price;
                        soldQtyTotal += remainingToSell;
                        batch.qty -= remainingToSell;
                        remainingToSell = 0;
                    }
                }

                // Satılan miktar kadar maliyet oluştuysa kar/zarar hesapla
                if (soldQtyTotal > 0 && costBasis > 0) {
                    const revenue = soldQtyTotal * price;
                    const profit = revenue - costBasis;
                    const percent = (profit / costBasis) * 100;
                    closedTrades.push({ symbol: sym, profitPercent: percent });
                }
            }
        }
    });

    // 2. Açık ve Kapalı Tüm Performansları Birleştir
    const allPerformances = [...portfolio, ...closedTrades];

    if (allPerformances.length === 0) return { bestPerformer: null, worstPerformer: null };

    const sorted = allPerformances.sort((a, b) => (b.profitPercent || 0) - (a.profitPercent || 0));
    return {
      bestPerformer: sorted[0],
      worstPerformer: sorted[sorted.length - 1]
    };
  }, [portfolio, allTransactions]);

  return (
    <Box sx={{ 
      p: 4, 
      pt: '90px', 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)', 
      color: 'white' 
    }}>
      <Typography variant="h4" fontWeight="800" sx={{ mb: 4, letterSpacing: '-1px' }}>
        Portföyüm
      </Typography>

      {/* Özet Kartları */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
        
        {/* Toplam Varlık */}
        <Paper sx={{ 
          p: 3, 
          borderRadius: 4, 
          bgcolor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          transition: 'transform 0.2s, border-color 0.2s',
          '&:hover': { transform: 'translateY(-4px)', borderColor: 'rgba(255,255,255,0.2)' }
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#888', fontWeight: 600, letterSpacing: '0.5px', mb: 0.5 }}>TOPLAM VARLIK</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h3" fontWeight="700" sx={{ background: 'linear-gradient(90deg, #fff, #ccc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {showInTry 
                    ? `₺${(totalNetWorth * usdTryRate).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `$${totalNetWorth.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                </Typography>
                <Tooltip title={showInTry ? "USD'ye Çevir" : "TL'ye Çevir"}>
                  <IconButton 
                    onClick={() => setShowInTry(!showInTry)}
                    size="small"
                    sx={{ color: '#666', border: '1px solid rgba(255,255,255,0.1)', '&:hover': { color: 'white', borderColor: 'white' } }}
                  >
                    {showInTry ? <AttachMoneyIcon fontSize="small" /> : <CurrencyLiraIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Avatar sx={{ bgcolor: 'rgba(41, 121, 255, 0.1)', color: '#2979ff', width: 48, height: 48 }}>
              <AttachMoneyIcon />
            </Avatar>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: totalProfit >= 0 ? '#00e676' : '#ff1744' }}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Box>
        </Paper>

        {/* Nakit Bakiye */}
        <Paper sx={{ 
          p: 3, 
          borderRadius: 4, 
          bgcolor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          transition: 'transform 0.2s, border-color 0.2s',
          '&:hover': { transform: 'translateY(-4px)', borderColor: 'rgba(255,255,255,0.2)' }
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#888', fontWeight: 600, letterSpacing: '0.5px', mb: 0.5 }}>NAKİT BAKİYE</Typography>
              <Typography variant="h3" fontWeight="700" sx={{ color: 'white' }}>
                ${walletBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: 'rgba(0, 230, 118, 0.1)', color: '#00e676', width: 48, height: 48 }}>
              <AccountBalanceWalletIcon />
            </Avatar>
          </Box>
          <Typography variant="caption" sx={{ color: '#666', display: 'flex', justifyContent: 'space-between' }}>
            <span>Kullanılabilir Bakiye</span>
            <span>Net Yatırım: ${netInvestment.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            <span>Ana Para: ${netInvestment.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </Typography>
        </Paper>

        {/* Hisse Değeri */}
        <Paper sx={{ 
          p: 3, 
          borderRadius: 4, 
          bgcolor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          transition: 'transform 0.2s, border-color 0.2s',
          '&:hover': { transform: 'translateY(-4px)', borderColor: 'rgba(255,255,255,0.2)' }
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#888', fontWeight: 600, letterSpacing: '0.5px', mb: 0.5 }}>HİSSE SENEDİ DEĞERİ</Typography>
              <Typography variant="h3" fontWeight="700" sx={{ color: 'white' }}>
                ${totalEquity.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', width: 48, height: 48 }}>
              <DonutLargeIcon />
            </Avatar>
          </Box>
          <Typography variant="caption" sx={{ color: '#666' }}>
            Portföydeki aktif yatırımların toplamı
          </Typography>
        </Paper>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {/* Sol Taraf: Grafik ve Tablo */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: 3 }, minWidth: 0 }}>
          {/* Grafik */}
          <Paper sx={{ p: 3, mb: 4, borderRadius: 4, bgcolor: '#000000', border: '1px solid rgba(255,255,255,0.05)', width: '100%' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Portföy Performansı</Typography>
            <PortfolioHistoryChart />
          </Paper>

          {/* Varlık Tablosu */}
          <Paper sx={{ borderRadius: 4, bgcolor: '#000000', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="h6" fontWeight="bold">Varlıklarım</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#a0a0a0' }}>Sembol</TableCell>
                    <TableCell align="right" sx={{ color: '#a0a0a0' }}>Adet</TableCell>
                    <TableCell align="right" sx={{ color: '#a0a0a0' }}>Ort. Maliyet</TableCell>
                    <TableCell align="right" sx={{ color: '#a0a0a0' }}>Anlık Fiyat</TableCell>
                    <TableCell align="right" sx={{ color: '#a0a0a0' }}>Toplam Değer</TableCell>
                    <TableCell align="right" sx={{ color: '#a0a0a0' }}>Kar/Zarar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {portfolio.map((item) => (
                    <TableRow 
                      key={item.symbol} 
                      hover 
                      onClick={() => navigate(`/market/${item.symbol}`)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            src={`${API_URL}/logos/${item.symbol}.png`} 
                            sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}
                          >
                            {item.symbol.substring(0, 2)}
                          </Avatar>
                          <Typography fontWeight="bold">{item.symbol}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>{item.quantity.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>${item.averageCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>${item.currentPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>${item.currentValue?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Typography sx={{ color: (item.profit || 0) >= 0 ? '#00e676' : '#ff1744', fontWeight: 'bold' }}>
                            {(item.profit || 0) >= 0 ? '+' : ''}{(item.profit || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                          <Typography variant="caption" sx={{ color: (item.profitPercent || 0) >= 0 ? '#00e676' : '#ff1744' }}>
                            {(item.profitPercent || 0).toFixed(2)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {portfolio.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#666' }}>
                        Portföyünüzde henüz hisse senedi bulunmuyor.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Son İşlemler */}
          <Paper sx={{ p: 3, mt: 4, borderRadius: 4, bgcolor: '#000000', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">Son İşlemler</Typography>
              <Button 
                endIcon={<ArrowForwardIcon />} 
                onClick={() => navigate('/history')}
                sx={{ textTransform: 'none', color: '#2979ff', fontSize: '0.85rem', '&:hover': { bgcolor: 'rgba(41, 121, 255, 0.1)' } }}
              >
                Tümünü Gör
              </Button>
            </Box>
            <List disablePadding>
              {recentTransactions.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', py: 2 }}>İşlem yok.</Typography>
              ) : (
                recentTransactions.map((tx, i) => (
                  <Box key={i}>
                    <ListItem disablePadding sx={{ py: 1.5 }}>
                      <ListItemAvatar>
                        <Box sx={{ position: 'relative' }}>
                          <Avatar 
                            src={`${API_URL}/logos/${tx.symbol}.png`}
                            sx={{ width: 42, height: 42, bgcolor: 'rgba(255,255,255,0.1)', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            {tx.symbol.substring(0, 2)}
                          </Avatar>
                          <Box sx={{ 
                            position: 'absolute', bottom: -2, right: -2, 
                            bgcolor: tx.type === 'BUY' ? '#00c853' : '#d50000',
                            borderRadius: '50%', width: 18, height: 18,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid #000'
                          }}>
                            {tx.type === 'BUY' ? <TrendingUpIcon sx={{ fontSize: 12, color: 'white' }} /> : <TrendingDownIcon sx={{ fontSize: 12, color: 'white' }} />}
                          </Box>
                        </Box>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={tx.symbol}
                        secondary={
                          <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#888' }}>
                              {new Date(tx.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                            <Typography variant="caption" sx={{ color: tx.type === 'BUY' ? '#00e676' : '#ff1744', fontWeight: 'bold', fontSize: '0.7rem', bgcolor: tx.type === 'BUY' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 23, 68, 0.1)', px: 0.8, py: 0.2, borderRadius: 1, width: 'fit-content' }}>
                              {tx.type === 'BUY' ? 'ALIM' : 'SATIM'} @ ${Number(tx.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                        }
                        primaryTypographyProps={{ fontWeight: 'bold', color: 'white' }}
                      />
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: 'white' }}>
                          ${(Number(tx.quantity) * Number(tx.price)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#888' }}>
                          {tx.quantity} Adet
                        </Typography>
                      </Box>
                    </ListItem>
                    {i < recentTransactions.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}
                  </Box>
                ))
              )}
            </List>
          </Paper>
        </Box>

        {/* Sağ Taraf: Pasta Grafik ve Cüzdan */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: 1 }, minWidth: 0 }}>
          {/* Varlık Dağılımı */}
          <Paper sx={{ p: 3, mb: 4, borderRadius: 4, bgcolor: '#000000', border: '1px solid rgba(255,255,255,0.05)', minHeight: 300 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>Varlık Dağılımı</Typography>
            
            {pieData.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'column', xl: 'row' }, alignItems: 'center', gap: 4 }}>
                {/* Grafik */}
                <Box sx={{ position: 'relative', height: 260, width: 260, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(-1)}
                      >
                        {pieData.map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            opacity={activeIndex === -1 || activeIndex === index ? 1 : 0.3}
                            stroke={activeIndex === index ? 'rgba(255,255,255,0.2)' : 'none'}
                            strokeWidth={activeIndex === index ? 2 : 0}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Ortadaki Dinamik Değer */}
                  <Box sx={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none', width: 160 }}>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {activeIndex >= 0 ? pieData[activeIndex].name : 'TOPLAM VARLIK'}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: 'white', fontSize: activeIndex >= 0 ? '1.2rem' : '1.5rem' }}>
                      {activeIndex >= 0 
                        ? `$${pieData[activeIndex].value.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        : `$${totalPieValue.toLocaleString('tr-TR', { notation: "compact", maximumFractionDigits: 1 })}`
                      }
                    </Typography>
                    {activeIndex >= 0 && (
                      <Chip 
                        label={`${((pieData[activeIndex].value / totalPieValue) * 100).toFixed(1)}%`} 
                        size="small" 
                        sx={{ mt: 0.5, height: 20, fontSize: '0.7rem', fontWeight: 'bold', bgcolor: COLORS[activeIndex % COLORS.length], color: 'white' }} 
                      />
                    )}
                  </Box>
                </Box>

                {/* Detaylı Liste */}
                <Box sx={{ flex: 1, width: '100%', maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {pieData.map((entry, index) => {
                      const percent = totalPieValue > 0 ? (entry.value / totalPieValue) * 100 : 0;
                      const isActive = activeIndex === index;
                      return (
                        <Box 
                          key={entry.name} 
                          onMouseEnter={() => setActiveIndex(index)}
                          onMouseLeave={() => setActiveIndex(-1)}
                          sx={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                            p: 1.5, borderRadius: 2, 
                            bgcolor: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)', 
                            border: '1px solid',
                            borderColor: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                            transition: 'all 0.2s', 
                            transform: isActive ? 'translateX(4px)' : 'none',
                            cursor: 'default'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '4px', bgcolor: COLORS[index % COLORS.length], boxShadow: `0 0 8px ${COLORS[index % COLORS.length]}` }} />
                            <Box>
                              <Typography variant="body2" fontWeight="bold" sx={{ color: isActive ? 'white' : '#e0e0e0' }}>{entry.name}</Typography>
                              <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, mt: 0.5, minWidth: 60 }}>
                                <Box sx={{ width: `${percent}%`, height: '100%', bgcolor: COLORS[index % COLORS.length], borderRadius: 2 }} />
                              </Box>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: isActive ? 'white' : '#e0e0e0' }}>${entry.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                            <Typography variant="caption" sx={{ color: '#888' }}>{percent.toFixed(1)}%</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 250, color: '#666' }}>
                <DonutLargeIcon sx={{ fontSize: 64, mb: 2, opacity: 0.2 }} />
                <Typography>Görüntülenecek varlık bulunamadı.</Typography>
              </Box>
            )}
          </Paper>

          {/* Performans Özeti (Öne Çıkanlar) */}
          {(portfolio.length > 0 || allTransactions.length > 0) && (
            <Paper sx={{ p: 3, mb: 4, borderRadius: 4, bgcolor: '#000000', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Öne Çıkanlar</Typography>
              
              {bestPerformer && (
                <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: 'linear-gradient(45deg, rgba(0, 230, 118, 0.1), rgba(0, 200, 83, 0.2))', border: '1px solid rgba(0, 230, 118, 0.3)', boxShadow: '0 4px 12px rgba(0, 230, 118, 0.1)' }}>
                  <Typography variant="caption" sx={{ color: '#00e676', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrendingUpIcon fontSize="small" /> EN İYİ PERFORMANS
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={`${API_URL}/logos/${bestPerformer.symbol}.png`} sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'rgba(255,255,255,0.1)' }}>{bestPerformer.symbol[0]}</Avatar>
                      <Typography fontWeight="bold">{bestPerformer.symbol}</Typography>
                    </Box>
                    <Typography fontWeight="bold" sx={{ color: '#00e676' }}>
                      +{(bestPerformer.profitPercent || 0).toFixed(2)}%
                    </Typography>
                  </Box>
                </Box>
              )}

              {worstPerformer && worstPerformer.symbol !== bestPerformer?.symbol && (worstPerformer.profitPercent || 0) < 0 && (
                <Box sx={{ p: 2, borderRadius: 2, background: 'linear-gradient(45deg, rgba(255, 23, 68, 0.1), rgba(213, 0, 0, 0.2))', border: '1px solid rgba(255, 23, 68, 0.3)', boxShadow: '0 4px 12px rgba(255, 23, 68, 0.1)' }}>
                  <Typography variant="caption" sx={{ color: '#ff1744', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrendingDownIcon fontSize="small" /> EN KÖTÜ PERFORMANS
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={`${API_URL}/logos/${worstPerformer.symbol}.png`} sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'rgba(255,255,255,0.1)' }}>{worstPerformer.symbol[0]}</Avatar>
                      <Typography fontWeight="bold">{worstPerformer.symbol}</Typography>
                    </Box>
                    <Typography fontWeight="bold" sx={{ color: '#ff1744' }}>
                      {(worstPerformer.profitPercent || 0).toFixed(2)}%
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          )}

          {/* Cüzdan Yönetimi */}
          <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#000000', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Cüzdan İşlemleri</Typography>
            <WalletManager />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}