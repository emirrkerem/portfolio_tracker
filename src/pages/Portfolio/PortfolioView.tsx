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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import WalletManager from '../../components/portfolio/WalletManager';
import PortfolioHistoryChart from '../../components/portfolio/PortfolioHistoryChart';

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
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalEquity, setTotalEquity] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      // 1. Cüzdan Bakiyesi
      const walletRes = await fetch('http://localhost:5000/api/wallet');
      const walletData = await walletRes.json();
      setWalletBalance(walletData.balance || 0);

      // 2. Portföy Hisseleri
      const portfolioRes = await fetch('http://localhost:5000/api/portfolio');
      const portfolioData = await portfolioRes.json();

      // 3. Son İşlemleri Çek
      const txRes = await fetch('http://localhost:5000/api/transactions');
      const txData = await txRes.json();
      if (Array.isArray(txData)) {
        setRecentTransactions(txData.slice(0, 5));
        setAllTransactions(txData);
      }

      if (Array.isArray(portfolioData) && portfolioData.length > 0) {
        // 4. Güncel Fiyatları Çek
        const symbols = portfolioData.map((p: any) => p.symbol).join(',');
        const marketRes = await fetch(`http://localhost:5000/api/market?symbols=${symbols}`);
        const marketData = await marketRes.json();

        let equity = 0;
        let profit = 0;

        const updatedPortfolio = portfolioData.map((item: any) => {
          const marketItem = Array.isArray(marketData) ? marketData.find((m: any) => m.symbol === item.symbol) : null;
          const currentPrice = marketItem ? marketItem.price : 0;
          const currentValue = item.quantity * currentPrice;
          const itemProfit = currentValue - item.totalCost;
          const itemProfitPercent = item.totalCost > 0 ? (itemProfit / item.totalCost) * 100 : 0;

          equity += currentValue;
          profit += itemProfit;

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
        setTotalProfit(profit);
      } else {
        setPortfolio([]);
        setTotalEquity(0);
        setTotalProfit(0);
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
  const totalProfitPercent = (totalNetWorth - (totalNetWorth - totalProfit)) / (totalNetWorth - totalProfit) * 100 || 0;

  // Pasta Grafik Verisi
  const pieData = [
    ...portfolio.map(item => ({ name: item.symbol, value: item.currentValue || 0 })),
    { name: 'Nakit (Cash)', value: walletBalance }
  ].filter(i => i.value > 0);

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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: '300px' } }}>
          <Paper sx={{ 
            p: 3, 
            borderRadius: 4, 
            background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
              <AttachMoneyIcon sx={{ fontSize: 120 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>Toplam Varlık</Typography>
            <Typography variant="h3" fontWeight="bold">${totalNetWorth.toFixed(2)}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
              <Chip 
                label={`${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} (${totalProfitPercent.toFixed(2)}%)`} 
                size="small"
                sx={{ 
                  background: totalProfit >= 0 ? 'linear-gradient(45deg, rgba(0, 230, 118, 0.2), rgba(0, 200, 83, 0.3))' : 'linear-gradient(45deg, rgba(255, 23, 68, 0.2), rgba(213, 0, 0, 0.3))',
                  color: totalProfit >= 0 ? '#00e676' : '#ff1744',
                  fontWeight: 'bold',
                  boxShadow: totalProfit >= 0 ? '0 2px 8px rgba(0, 230, 118, 0.2)' : '0 2px 8px rgba(255, 23, 68, 0.2)',
                  border: '1px solid',
                  borderColor: totalProfit >= 0 ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 23, 68, 0.3)'
                }} 
              />
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Tüm Zamanlar</Typography>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: '300px' } }}>
          <Paper sx={{ 
            p: 3, 
            borderRadius: 4, 
            background: 'linear-gradient(135deg, #004d40 0%, #00695c 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 120 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>Nakit Bakiye (Buying Power)</Typography>
            <Typography variant="h3" fontWeight="bold">${walletBalance.toFixed(2)}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>Kullanılabilir Nakit</Typography>
          </Paper>
        </Box>

        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: '300px' } }}>
          <Paper sx={{ 
            p: 3, 
            borderRadius: 4, 
            background: 'linear-gradient(135deg, #311b92 0%, #4527a0 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
              <DonutLargeIcon sx={{ fontSize: 120 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>Hisse Senedi Değeri</Typography>
            <Typography variant="h3" fontWeight="bold">${totalEquity.toFixed(2)}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>Aktif Yatırımlar</Typography>
          </Paper>
        </Box>
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
                            src={`/logos/${item.symbol}.png`} 
                            sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}
                          >
                            {item.symbol.substring(0, 2)}
                          </Avatar>
                          <Typography fontWeight="bold">{item.symbol}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>{item.quantity.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>${item.averageCost.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>${item.currentPrice?.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>${item.currentValue?.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Typography sx={{ color: (item.profit || 0) >= 0 ? '#00e676' : '#ff1744', fontWeight: 'bold' }}>
                            {(item.profit || 0) >= 0 ? '+' : ''}{(item.profit || 0).toFixed(2)}
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
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Son İşlemler</Typography>
            <List disablePadding>
              {recentTransactions.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', py: 2 }}>İşlem yok.</Typography>
              ) : (
                recentTransactions.map((tx, i) => (
                  <Box key={i}>
                    <ListItem disablePadding sx={{ py: 1 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          background: tx.type === 'BUY' ? 'linear-gradient(135deg, #00e676 0%, #00c853 100%)' : 'linear-gradient(135deg, #ff1744 0%, #d50000 100%)',
                          color: 'white',
                          width: 36, height: 36,
                          boxShadow: tx.type === 'BUY' ? '0 2px 8px rgba(0, 230, 118, 0.4)' : '0 2px 8px rgba(255, 23, 68, 0.4)'
                        }}>
                          {tx.type === 'BUY' ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={tx.symbol}
                        secondary={new Date(tx.date).toLocaleDateString('tr-TR')}
                        primaryTypographyProps={{ fontWeight: 'bold', color: 'white' }}
                        secondaryTypographyProps={{ variant: 'caption', color: '#888' }}
                      />
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: tx.type === 'BUY' ? '#00e676' : '#ff1744' }}>
                          {tx.type === 'BUY' ? '+' : '-'}{tx.quantity}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#888' }}>
                          ${tx.price.toFixed(2)}
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
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Varlık Dağılımı</Typography>
            <Box sx={{ height: 250, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e1e1e', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: 'white' }}
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
              {pieData.map((entry, index) => (
                <Chip 
                  key={entry.name} 
                  label={entry.name} 
                  size="small" 
                  sx={{ bgcolor: COLORS[index % COLORS.length], color: 'white', fontWeight: 'bold' }} 
                />
              ))}
            </Box>
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
                      <Avatar src={`/logos/${bestPerformer.symbol}.png`} sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'rgba(255,255,255,0.1)' }}>{bestPerformer.symbol[0]}</Avatar>
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
                      <Avatar src={`/logos/${worstPerformer.symbol}.png`} sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'rgba(255,255,255,0.1)' }}>{worstPerformer.symbol[0]}</Avatar>
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