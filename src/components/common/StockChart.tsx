// src/components/common/StockChart.tsx
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { deleteTransaction, updateTransaction } from '../../services/portfolioService';

interface StockChartProps {
  symbol: string;
  height?: string;
  onPriceUpdate?: (data: { price: number, change: number, percent: number }) => void;
}

export default function StockChart({ symbol, height = '320px', onPriceUpdate }: StockChartProps) {
  const [activeTab, setActiveTab] = useState('General');
  const [selectedRange, setSelectedRange] = useState('1G');
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [hoveredChange, setHoveredChange] = useState<{ change: number, percent: number } | null>(null);
  const [rangeChangeInfo, setRangeChangeInfo] = useState({ change: 0, percent: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Düzenleme State'leri
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editForm, setEditForm] = useState({ quantity: '', price: '', date: '', commission: '' });
  
  const [calculatedMetrics, setCalculatedMetrics] = useState({
    quantity: 0,
    totalCost: 0,
    totalCommission: 0,
    realizedProfit: 0,
    unrealizedProfit: 0,
    totalProfit: 0,
    percentChange: 0
  });

  const currentPrice = quoteData?.price || 0;

  useEffect(() => {
    if (!symbol) return;
    const fetchQuote = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/market?symbols=${symbol}`);
        const data = await response.json();
        if (data && data.length > 0) setQuoteData(data[0]);
      } catch (e) { console.error("Fiyat verisi hatası:", e); }
    };
    fetchQuote();
  }, [symbol]);

  const startPrice = chartData.length > 0 ? chartData[0].price : 0;
  const isProfit = (hoveredPrice ?? currentPrice) >= startPrice;
  const chartColor = isProfit ? '#00C805' : '#FF3B30';

  const getApiParams = () => {
    let query = `symbol=${symbol}`;
    if (!symbol) return null;

    let period = '';
    let interval = '';
    let start = '';

    switch(selectedRange) {
      case '1S':  period = '2d';   interval = '1h';   break; // 1 Saatlik (Son 2 gün, 1 saatlik aralıkla)
      case '1G':  period = '1d';   interval = '5m';   break; // 1 Günlük (Son gün, 5 dakikalık aralıkla)
      case '1H':  
        // 1 Hafta (7 Gün) - 30dk aralıkla
        const d = new Date();
        d.setDate(d.getDate() - 7);
        start = d.toISOString().split('T')[0];
        interval = '30m';
        break;
      case '1A':  period = '1mo';  interval = '1h';   break; // 1 Aylık (Saatlik veri)
      case '3A':  period = '3mo';  interval = '1h';   break; // 3 Aylık (Saatlik veri, 4h geçersiz)
      case '6A':  period = '6mo';  interval = '1d';   break; // 6 Aylık
      case 'YTD': period = 'ytd';  interval = '1d';   break; // Yılbaşından bugüne
      case '1Y':  period = '1y';   interval = '1d';   break; // 1 Yıllık
      case '5Y':  period = '5y';   interval = '1wk';  break; // 5 Yıllık
      case 'ALL': period = 'max';  interval = '1mo';  break; // Tüm zamanlar
      default:    period = '1y';   interval = '1d';
    }
    
    if (start) {
      query += `&start=${start}&interval=${interval}`;
    } else {
      query += `&period=${period}&interval=${interval}`;
    }
    
    return query;
  };

  useEffect(() => {
    const fetchChartData = async () => {
      const query = getApiParams();
      if (!query) return;

      setIsChartLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/stock?${query}`);
        const data = await response.json();
        if (Array.isArray(data)) setChartData(data);
      } catch (error) {
        console.error("Grafik verisi hatası:", error);
      } finally {
        setIsChartLoading(false);
      }
    };
    fetchChartData();
  }, [symbol, selectedRange]);

  useEffect(() => {
    if (chartData && chartData.length > 1) {
      const start = chartData[0].price;
      const end = chartData[chartData.length - 1].price;
      if (start > 0) {
        const change = end - start;
        const percent = (change / start) * 100;
        setRangeChangeInfo({ change, percent });
      }
    } else {
      setRangeChangeInfo({ change: 0, percent: 0 });
    }
  }, [chartData]);

  // Fiyat veya değişim bilgisi güncellendiğinde üst bileşene bildir
  useEffect(() => {
    if (onPriceUpdate) {
      const displayPrice = hoveredPrice ?? currentPrice;
      const displayChange = hoveredChange ?? rangeChangeInfo;
      
      onPriceUpdate({
        price: displayPrice,
        change: displayChange.change,
        percent: displayChange.percent
      });
    }
  }, [hoveredPrice, currentPrice, hoveredChange, rangeChangeInfo, onPriceUpdate]);

  // İşlem Geçmişini Çek ve Metrikleri Hesapla
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/transactions');
        const data = await res.json();
        if (Array.isArray(data)) {
          // Sadece bu hisseye ait işlemleri filtrele
          setTransactions(data.filter((t: any) => t.symbol === symbol));
        }
      } catch (e) { console.error("Transactions fetch error", e); }
    };
    
    fetchTransactions();
    window.addEventListener('portfolio-updated', fetchTransactions);
    return () => window.removeEventListener('portfolio-updated', fetchTransactions);
  }, [symbol]);

  // Metrik Hesaplama (Transactions veya Fiyat değişince)
  useEffect(() => {
    if (!transactions.length) {
      setCalculatedMetrics({ quantity: 0, totalCost: 0, totalCommission: 0, realizedProfit: 0, unrealizedProfit: 0, totalProfit: 0, percentChange: 0 });
      return;
    }

    // Tarihe göre sırala (Eskiden yeniye)
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let qty = 0;
    let costBasis = 0;
    let realized = 0;
    let totalComm = 0;

    sortedTx.forEach(tx => {
      const txQty = Number(tx.quantity);
      const txPrice = Number(tx.price);
      const txComm = Number(tx.totalCommission);
      totalComm += txComm;

      if (tx.type === 'BUY') {
        qty += txQty;
        costBasis += (txQty * txPrice) + txComm;
      } else if (tx.type === 'SELL') {
        if (qty > 0) {
          const avgCost = costBasis / qty;
          const costOfSold = avgCost * txQty;
          const revenue = (txQty * txPrice) - txComm;
          realized += (revenue - costOfSold);
          costBasis -= costOfSold;
          qty -= txQty;
        }
      }
    });

    const marketValue = qty * currentPrice;
    const unrealized = marketValue - costBasis;
    const totalP = realized + unrealized;
    const pctChange = costBasis > 0 ? (unrealized / costBasis) * 100 : 0;

    setCalculatedMetrics({ quantity: qty, totalCost: costBasis, totalCommission: totalComm, realizedProfit: realized, unrealizedProfit: unrealized, totalProfit: totalP, percentChange: pctChange });

  }, [transactions, currentPrice]);

  const handleDeleteTransaction = async (id: number) => {
    if (window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
      await deleteTransaction(id);
      // Listeyi ve portföyü güncelle
      window.dispatchEvent(new Event('portfolio-updated'));
    }
  };

  const handleEditClick = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditForm({
      quantity: transaction.quantity,
      price: transaction.price,
      date: transaction.date, // Backend artık ISO dönüyor
      commission: transaction.totalCommission
    });
    setEditModalOpen(true);
  };

  const handleUpdateConfirm = async () => {
    if (!editingTransaction) return;
    
    await updateTransaction({
        id: editingTransaction.id,
        quantity: Number(editForm.quantity),
        price: Number(editForm.price),
        commission: Number(editForm.commission),
        date: editForm.date
    });
    
    setEditModalOpen(false);
    window.dispatchEvent(new Event('portfolio-updated'));
  };

  const handleChartMouseMove = (e: any) => {
    if (e.activePayload && e.activePayload.length > 0) {
      const newPrice = e.activePayload[0].payload.price;
      setHoveredPrice(newPrice);
      if(startPrice > 0) {
        const change = newPrice - startPrice;
        const percent = (change / startPrice) * 100;
        setHoveredChange({ change, percent });
      }
    }
  };

  const handleChartMouseLeave = () => {
    setHoveredPrice(null);
    setHoveredChange(null);
  };

  const CustomTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const date = new Date(payload[0].payload.date);
      const formattedDate = date.toLocaleString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: ['1S', '1G', '1H', '1A', '3A'].includes(selectedRange) ? '2-digit' : undefined,
        minute: ['1S', '1G', '1H', '1A', '3A'].includes(selectedRange) ? '2-digit' : undefined
      });
      return <Typography sx={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>{formattedDate}</Typography>;
    }
    return null;
  };

  // Tarih formatlama fonksiyonu
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* PORTFÖY DETAYLARI (Fiyatın Altında) */}
      {(calculatedMetrics.quantity > 0 || transactions.length > 0) && (
        <Box sx={{ 
          ml: '40px', 
          mt: 2, 
          mb: 4, 
          display: 'grid', 
          gridTemplateColumns: 'auto auto auto auto', 
          columnGap: '120px', 
          rowGap: '24px' 
        }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Owned</Typography>
              <Typography variant="h6" fontWeight="bold">{calculatedMetrics.quantity.toFixed(2)}</Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Sum of Cost</Typography>
              <Typography variant="h6" fontWeight="bold">${calculatedMetrics.totalCost.toFixed(2)}</Typography>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Total Fees</Typography>
              <Typography variant="h6" fontWeight="bold">${calculatedMetrics.totalCommission.toFixed(2)}</Typography>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>{calculatedMetrics.totalProfit >= 0 ? 'Total Gain' : 'Total Loss'}</Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ color: calculatedMetrics.totalProfit >= 0 ? '#00C805' : '#FF3B30' }}>
                {calculatedMetrics.totalProfit >= 0 ? '+' : ''}{calculatedMetrics.totalProfit.toFixed(2)}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>%Change</Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ color: calculatedMetrics.percentChange >= 0 ? '#00C805' : '#FF3B30' }}>
                {calculatedMetrics.percentChange >= 0 ? '+' : ''}{calculatedMetrics.percentChange.toFixed(2)}%
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Unrealized Profit</Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ color: calculatedMetrics.unrealizedProfit >= 0 ? '#00C805' : '#FF3B30' }}>
                {calculatedMetrics.unrealizedProfit >= 0 ? '+' : ''}{calculatedMetrics.unrealizedProfit.toFixed(2)}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Realized Profit</Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ color: calculatedMetrics.realizedProfit >= 0 ? '#00C805' : '#FF3B30' }}>
                {calculatedMetrics.realizedProfit >= 0 ? '+' : ''}{calculatedMetrics.realizedProfit.toFixed(2)}
              </Typography>
            </Box>
        </Box>
      )}

      {/* General / Transactions Tab Bar */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center',
        gap: 4,
        borderTop: '1px solid rgba(255, 255, 255, 0.12)', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        py: 1.5,
        mt: 4,
        mb: 2
      }}>
        <Typography 
          onClick={() => setActiveTab('General')}
          sx={{ 
            cursor: 'pointer', 
            color: activeTab === 'General' ? 'white' : '#a0a0a0',
            fontWeight: activeTab === 'General' ? 'bold' : 'normal',
            '&:hover': { color: 'white' }
          }}
        >
          General
        </Typography>
        <Typography 
          onClick={() => setActiveTab('Transactions')}
          sx={{ 
            cursor: 'pointer', 
            color: activeTab === 'Transactions' ? 'white' : '#a0a0a0',
            fontWeight: activeTab === 'Transactions' ? 'bold' : 'normal',
            '&:hover': { color: 'white' }
          }}
        >
          Transactions
        </Typography>
      </Box>

      <Box sx={{ width: '100%', height: height, mt: 2, position: 'relative' }}>
        {activeTab === 'General' ? (
          isChartLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <CircularProgress color="inherit" />
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData} 
              margin={{ top: 40, right: 0, left: 0, bottom: 0 }}
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: '#888', strokeWidth: 1 }}
                position={{ y: 0 }}
                isAnimationActive={false}
              />
              <ReferenceLine y={startPrice} stroke="#666" strokeDasharray="3 3" />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={chartColor} 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          )
        ) : (
          /* Transactions Tab Content */
          <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
            <Table stickyHeader size="small" aria-label="transactions table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#1a1a1a', color: '#a0a0a0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Tarih</TableCell>
                  <TableCell sx={{ bgcolor: '#1a1a1a', color: '#a0a0a0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>İşlem</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#1a1a1a', color: '#a0a0a0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Adet</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#1a1a1a', color: '#a0a0a0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Fiyat</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#1a1a1a', color: '#a0a0a0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Tutar</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#1a1a1a', color: '#a0a0a0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: '#666', border: 0, py: 4 }}>Bu hisse için işlem bulunamadı.</TableCell>
                  </TableRow>
                ) : (
                  transactions.map((row, index) => (
                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{formatDate(row.date)}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Chip 
                          label={row.type === 'BUY' ? 'ALIŞ' : 'SATIŞ'} 
                          size="small" 
                          sx={{ bgcolor: 'rgba(0, 200, 83, 0.2)', color: '#69f0ae', fontWeight: 'bold', height: '20px', fontSize: '0.7rem' }} 
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.quantity}</TableCell>
                      <TableCell align="right" sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>${row.price.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>${row.totalCost.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <IconButton onClick={() => handleEditClick(row)} size="small" sx={{ color: '#2196f3', mr: 1 }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteTransaction(row.id)} size="small" sx={{ color: '#ef5350' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
            <Box sx={{
              mt: 3, mb: 2, display: 'flex', justifyContent: 'space-between',
              width: '100%', border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px', p: 0.5
            }}>
              {['1S', '1G', '1H', '1A', '3A', '6A', 'YTD', '1Y', '5Y', 'ALL'].map((range) => (
                <Typography
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  sx={{
                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold',
                    color: selectedRange === range ? '#000' : '#888',
                    backgroundColor: selectedRange === range ? '#fff' : 'transparent',
                    borderRadius: '6px', py: '8px', textAlign: 'center', flex: 1,
                    transition: 'background-color 0.2s, color 0.2s',
                    '&:hover': {
                      backgroundColor: selectedRange !== range ? 'rgba(255,255,255,0.1)' : '#fff',
                      color: selectedRange === range ? '#000' : '#fff'
                    }
                  }}
                >
                  {range}
                </Typography>
              ))}
            </Box>
            {/* Düzenleme Modalı */}
      <Dialog 
        open={editModalOpen} 
        onClose={() => setEditModalOpen(false)}
        PaperProps={{ sx: { backgroundColor: '#2a2a2a', color: 'white', minWidth: '350px' } }}
      >
        <DialogTitle>İşlemi Düzenle</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Tarih"
            type="datetime-local"
            fullWidth
            variant="outlined"
            value={editForm.date}
            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ 
              mt: 2,
              '& .MuiInputBase-root': { color: 'white' },
              '& .MuiInputLabel-root': { color: '#a0a0a0' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' },
              '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)' }
            }}
          />
          <TextField
            margin="dense"
            label="Adet"
            type="number"
            fullWidth
            variant="outlined"
            value={editForm.quantity}
            onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
            sx={{ 
              '& .MuiInputBase-root': { color: 'white' },
              '& .MuiInputLabel-root': { color: '#a0a0a0' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' }
            }}
          />
          <TextField
            margin="dense"
            label="Fiyat ($)"
            type="number"
            fullWidth
            variant="outlined"
            value={editForm.price}
            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
            sx={{ 
              '& .MuiInputBase-root': { color: 'white' },
              '& .MuiInputLabel-root': { color: '#a0a0a0' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' }
            }}
          />
          <TextField
            margin="dense"
            label="Komisyon ($)"
            type="number"
            fullWidth
            variant="outlined"
            value={editForm.commission}
            onChange={(e) => setEditForm({ ...editForm, commission: e.target.value })}
            sx={{ 
              '& .MuiInputBase-root': { color: 'white' },
              '& .MuiInputLabel-root': { color: '#a0a0a0' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#404040' }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditModalOpen(false)} sx={{ color: '#a0a0a0' }}>İptal</Button>
          <Button onClick={handleUpdateConfirm} variant="contained" color="primary">Güncelle</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
