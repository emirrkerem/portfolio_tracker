// c:\Users\emirk\Desktop\borsa-app-client\src\components\common\StockChart.tsx
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
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
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
  
  // Düzenleme State'leri - Tarih başlangıç değerini güvenli hale getirdik
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editForm, setEditForm] = useState({ quantity: '', price: '', date: new Date().toISOString(), commission: '' });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'day' | 'year'>('day');
  
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
      case '1S':  period = '2d';   interval = '1h';   break;
      case '1G':  period = '1d';   interval = '5m';   break;
      case '1H':  
        const d = new Date();
        d.setDate(d.getDate() - 7);
        start = d.toISOString().split('T')[0];
        interval = '30m';
        break;
      case '1A':  period = '1mo';  interval = '1h';   break;
      case '3A':  period = '3mo';  interval = '1h';   break;
      case '6A':  period = '6mo';  interval = '1d';   break;
      case 'YTD': period = 'ytd';  interval = '1d';   break;
      case '1Y':  period = '1y';   interval = '1d';   break;
      case '5Y':  period = '5y';   interval = '1wk';  break;
      case 'ALL': period = 'max';  interval = '1mo';  break;
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

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/transactions');
        const data = await res.json();
        if (Array.isArray(data)) {
          setTransactions(data.filter((t: any) => t.symbol === symbol));
        }
      } catch (e) { console.error("Transactions fetch error", e); }
    };
    
    fetchTransactions();
    window.addEventListener('portfolio-updated', fetchTransactions);
    return () => window.removeEventListener('portfolio-updated', fetchTransactions);
  }, [symbol]);

  useEffect(() => {
    if (!transactions.length) {
      setCalculatedMetrics({ quantity: 0, totalCost: 0, totalCommission: 0, realizedProfit: 0, unrealizedProfit: 0, totalProfit: 0, percentChange: 0 });
      return;
    }

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
      window.dispatchEvent(new Event('portfolio-updated'));
    }
  };

  const handleEditClick = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditForm({
      quantity: transaction.quantity,
      price: transaction.price,
      date: transaction.date,
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Takvim Yardımcı Fonksiyonları
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const daysShort = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    const today = new Date();
    const nextMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
    if (nextMonth > today) return;
    setCalendarViewDate(nextMonth);
  };
  const handlePrevYearPage = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear() - 12, calendarViewDate.getMonth(), 1));
  };
  const handleNextYearPage = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear() + 12, calendarViewDate.getMonth(), 1));
  };
  const handleYearClick = (year: number) => {
    setCalendarViewDate(new Date(year, calendarViewDate.getMonth(), 1));
    setCalendarViewMode('day');
  };
  const renderYearGrid = () => {
    const currentYear = calendarViewDate.getFullYear();
    const startYear = currentYear - 6;
    const years = [];
    for(let i=0; i<12; i++) years.push(startYear + i);
    return years;
  };
  const handleDayClick = (day: number) => {
    const current = new Date(editForm.date);
    const newDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day, current.getHours(), current.getMinutes());
    
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    const h = String(newDate.getHours()).padStart(2, '0');
    const m = String(newDate.getMinutes()).padStart(2, '0');
    setEditForm({ ...editForm, date: `${year}-${month}-${d}T${h}:${m}` });
  };
  const handleTimeChange = (type: 'hour' | 'minute', val: number) => {
    const current = new Date(editForm.date);
    let h = current.getHours();
    let m = current.getMinutes();
    if (type === 'hour') h = val;
    if (type === 'minute') m = val;
    
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    setEditForm({ ...editForm, date: `${year}-${month}-${d}T${hh}:${mm}` });
  };
  const renderCalendarGrid = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const grid = [];
    for(let i=0; i<startOffset; i++) grid.push(<Box key={`empty-${i}`} sx={{ width: 40, height: 40 }} />);
    const currentSelected = new Date(editForm.date);
    const isSameMonth = currentSelected.getMonth() === month && currentSelected.getFullYear() === year;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for(let d=1; d<=daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isFuture = date > today;
      const isSelected = isSameMonth && currentSelected.getDate() === d;
      const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
      grid.push({ d, isSelected, isToday, isFuture });
    }
    return grid;
  };

  const inputStyles = {
    '& .MuiFilledInput-root': { 
      bgcolor: 'rgba(255,255,255,0.05)', 
      borderRadius: 2,
      color: 'white',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
      '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.08)' },
      pl: 1.5, pr: 1.5
    },
    '& .MuiInputLabel-root': { color: '#a0a0a0' },
    '& input[type=number]': { MozAppearance: 'textfield' },
    '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
    '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* PORTFÖY DETAYLARI */}
      {(calculatedMetrics.quantity > 0 || transactions.length > 0) && (
        <Box sx={{ ml: '40px', mt: 2, mb: 4, display: 'grid', gridTemplateColumns: 'auto auto auto auto', columnGap: '120px', rowGap: '24px' }}>
            <Box><Typography variant="body2" sx={{ color: '#a0a0a0' }}>Owned</Typography><Typography variant="h6" fontWeight="bold">{calculatedMetrics.quantity.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box>
            <Box><Typography variant="body2" sx={{ color: '#a0a0a0' }}>Sum of Cost</Typography><Typography variant="h6" fontWeight="bold">${calculatedMetrics.totalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box>
            <Box><Typography variant="body2" sx={{ color: '#a0a0a0' }}>Total Fees</Typography><Typography variant="h6" fontWeight="bold">${calculatedMetrics.totalCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box>
            <Box><Typography variant="body2" sx={{ color: '#a0a0a0' }}>{calculatedMetrics.totalProfit >= 0 ? 'Total Gain' : 'Total Loss'}</Typography><Typography variant="h6" fontWeight="bold" sx={{ color: calculatedMetrics.totalProfit >= 0 ? '#00C805' : '#FF3B30' }}>{calculatedMetrics.totalProfit >= 0 ? '+' : ''}{calculatedMetrics.totalProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box>
            <Box><Typography variant="body2" sx={{ color: '#a0a0a0' }}>%Change</Typography><Typography variant="h6" fontWeight="bold" sx={{ color: calculatedMetrics.percentChange >= 0 ? '#00C805' : '#FF3B30' }}>{calculatedMetrics.percentChange >= 0 ? '+' : ''}{calculatedMetrics.percentChange.toFixed(2)}%</Typography></Box>
            <Box><Typography variant="body2" sx={{ color: '#a0a0a0' }}>Unrealized Profit</Typography><Typography variant="h6" fontWeight="bold" sx={{ color: calculatedMetrics.unrealizedProfit >= 0 ? '#00C805' : '#FF3B30' }}>{calculatedMetrics.unrealizedProfit >= 0 ? '+' : ''}{calculatedMetrics.unrealizedProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box>
            <Box><Typography variant="body2" sx={{ color: '#a0a0a0' }}>Realized Profit</Typography><Typography variant="h6" fontWeight="bold" sx={{ color: calculatedMetrics.realizedProfit >= 0 ? '#00C805' : '#FF3B30' }}>{calculatedMetrics.realizedProfit >= 0 ? '+' : ''}{calculatedMetrics.realizedProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box>
        </Box>
      )}

      {/* Tab Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 3 }}>
        <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4, p: 0.5, display: 'inline-flex', border: '1px solid rgba(255,255,255,0.1)' }}>
          {['General', 'Transactions'].map((tab) => (
            <Box key={tab} onClick={() => setActiveTab(tab)} sx={{ px: 4, py: 1, borderRadius: 3, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold', color: activeTab === tab ? '#000' : '#a0a0a0', bgcolor: activeTab === tab ? '#fff' : 'transparent', transition: 'all 0.2s ease', boxShadow: activeTab === tab ? '0 2px 8px rgba(255,255,255,0.2)' : 'none', '&:hover': { color: activeTab === tab ? '#000' : '#fff' } }}>
              {tab === 'General' ? 'Genel Bakış' : 'İşlemler'}
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ width: '100%', height: height, mt: 2, position: 'relative' }}>
        {activeTab === 'General' ? (
          isChartLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><CircularProgress color="inherit" /></Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 40, right: 0, left: 0, bottom: 0 }} onMouseMove={handleChartMouseMove} onMouseLeave={handleChartMouseLeave}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#888', strokeWidth: 1 }} position={{ y: 0 }} isAnimationActive={false} />
              <ReferenceLine y={startPrice} stroke="#666" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
          )
        ) : (
          /* Transactions Tab Content */
          <TableContainer sx={{ height: '100%', overflow: 'auto', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)', '&::-webkit-scrollbar': { width: 8 }, '&::-webkit-scrollbar-track': { bgcolor: 'rgba(255,255,255,0.02)' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 } }}>
            <Table stickyHeader size="medium" aria-label="transactions table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#121212', color: '#888', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', py: 2 }}>TARİH</TableCell>
                  <TableCell sx={{ bgcolor: '#121212', color: '#888', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', py: 2 }}>İŞLEM</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#121212', color: '#888', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', py: 2 }}>ADET</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#121212', color: '#888', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', py: 2 }}>FİYAT</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#121212', color: '#888', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', py: 2 }}>TOPLAM</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#121212', color: '#888', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', py: 2 }}>İŞLEMLER</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: '#666', border: 0, py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}><Typography variant="body1">Bu hisse için henüz işlem kaydı bulunmuyor.</Typography></Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((row, index) => (
                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 }, transition: 'background-color 0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                      <TableCell sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2 }}><Typography variant="body2" fontWeight="500">{formatDate(row.date)}</Typography></TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2 }}>
                        <Chip label={row.type === 'BUY' ? 'ALIM' : 'SATIM'} size="small" sx={{ bgcolor: row.type === 'BUY' ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 82, 82, 0.15)', color: row.type === 'BUY' ? '#69f0ae' : '#ff5252', fontWeight: 'bold', height: '24px', fontSize: '0.75rem', border: '1px solid', borderColor: row.type === 'BUY' ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 82, 82, 0.3)' }} />
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2 }}><Typography variant="body2" fontWeight="bold">{row.quantity.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></TableCell>
                      <TableCell align="right" sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2 }}><Typography variant="body2">${row.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></TableCell>
                      <TableCell align="right" sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2 }}><Typography variant="body2" fontWeight="bold">${row.totalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></TableCell>
                      <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <IconButton onClick={() => handleEditClick(row)} size="small" sx={{ color: '#2196f3', bgcolor: 'rgba(33, 150, 243, 0.1)', '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.2)' } }}><EditIcon fontSize="small" /></IconButton>
                          <IconButton onClick={() => handleDeleteTransaction(row.id)} size="small" sx={{ color: '#ef5350', bgcolor: 'rgba(239, 83, 80, 0.1)', '&:hover': { bgcolor: 'rgba(239, 83, 80, 0.2)' } }}><DeleteIcon fontSize="small" /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      <Box sx={{ mt: 3, mb: 2, display: 'flex', justifyContent: 'space-between', width: '100%', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', p: 0.5 }}>
        {['1S', '1G', '1H', '1A', '3A', '6A', 'YTD', '1Y', '5Y', 'ALL'].map((range) => (
          <Typography key={range} onClick={() => setSelectedRange(range)} sx={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold', color: selectedRange === range ? '#000' : '#888', backgroundColor: selectedRange === range ? '#fff' : 'transparent', borderRadius: '6px', py: '8px', textAlign: 'center', flex: 1, transition: 'background-color 0.2s, color 0.2s', '&:hover': { backgroundColor: selectedRange !== range ? 'rgba(255,255,255,0.1)' : '#fff', color: selectedRange === range ? '#000' : '#fff' } }}>{range}</Typography>
        ))}
      </Box>

      {/* Düzenleme Modalı */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} TransitionProps={{ timeout: 400 }} PaperProps={{ sx: { background: 'linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)', color: 'white', minWidth: '420px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' } }}>
        <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" fontWeight="bold">İşlemi Düzenle</Typography>
          <IconButton onClick={() => setEditModalOpen(false)} sx={{ color: '#a0a0a0', '&:hover': { color: 'white' } }}><CloseIcon /></IconButton>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Box onClick={() => { setCalendarViewDate(new Date(editForm.date)); setIsDatePickerOpen(true); setCalendarViewMode('day'); }} sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, p: '16px 12px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
              <CalendarTodayIcon sx={{ color: '#2979ff' }} />
              <Box>
                <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', lineHeight: 1 }}>Tarih</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>{new Date(editForm.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} {' • '} {new Date(editForm.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Typography>
              </Box>
            </Box>
            <TextField label="Adet" type="number" fullWidth variant="filled" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} InputProps={{ disableUnderline: true }} sx={inputStyles} onKeyDown={(e) => { if (['+', '-', 'e', 'E'].includes(e.key)) e.preventDefault(); }} inputProps={{ min: 0 }} />
            <TextField label="Fiyat ($)" type="number" fullWidth variant="filled" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} InputProps={{ disableUnderline: true }} sx={inputStyles} onKeyDown={(e) => { if (['+', '-', 'e', 'E'].includes(e.key)) e.preventDefault(); }} inputProps={{ min: 0 }} />
            <TextField label="Komisyon ($)" type="number" fullWidth variant="filled" value={editForm.commission} onChange={(e) => setEditForm({ ...editForm, commission: e.target.value })} InputProps={{ disableUnderline: true }} sx={inputStyles} onKeyDown={(e) => { if (['+', '-', 'e', 'E'].includes(e.key)) e.preventDefault(); }} inputProps={{ min: 0 }} />
          </Box>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
             <Button onClick={() => setEditModalOpen(false)} sx={{ color: '#a0a0a0', '&:hover': { color: 'white' } }}>İPTAL</Button>
            <Button onClick={handleUpdateConfirm} variant="contained" sx={{ bgcolor: '#2196f3', color: 'white', fontWeight: 'bold', px: 4, py: 1.5, borderRadius: 2, boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)', '&:hover': { bgcolor: '#1976d2' } }}>GÜNCELLE</Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Özel Tarih Seçici Dialog */}
      <Dialog open={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} PaperProps={{ sx: { bgcolor: '#1e1e1e', color: 'white', borderRadius: 3, p: 1, minWidth: '320px' } }}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={calendarViewMode === 'day' ? handlePrevMonth : handlePrevYearPage} sx={{ color: 'white' }}><ChevronLeftIcon /></IconButton>
            <Typography variant="h6" fontWeight="bold" onClick={() => setCalendarViewMode(calendarViewMode === 'day' ? 'year' : 'day')} sx={{ cursor: 'pointer', '&:hover': { color: '#2979ff' }, transition: 'color 0.2s' }}>{calendarViewMode === 'day' ? `${months[calendarViewDate.getMonth()]} ${calendarViewDate.getFullYear()}` : `${calendarViewDate.getFullYear()}`}</Typography>
            <IconButton onClick={calendarViewMode === 'day' ? handleNextMonth : handleNextYearPage} sx={{ color: 'white' }}><ChevronRightIcon /></IconButton>
          </Box>
          {calendarViewMode === 'day' ? (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1, textAlign: 'center' }}>{daysShort.map(d => (<Typography key={d} variant="caption" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>{d}</Typography>))}</Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 1 }}>
                {renderCalendarGrid().map((item: any, i) => (
                  item.d ? (
                    <Box 
                      key={i} 
                      onClick={() => !item.isFuture && handleDayClick(item.d)} 
                      sx={{ 
                        width: 36, height: 36, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        borderRadius: '50%', 
                        cursor: item.isFuture ? 'default' : 'pointer', 
                        mx: 'auto', 
                        bgcolor: item.isSelected ? '#2979ff' : 'transparent', 
                        color: item.isFuture ? '#444' : (item.isSelected ? 'white' : (item.isToday ? '#2979ff' : 'white')), 
                        fontWeight: item.isSelected || item.isToday ? 'bold' : 'normal', 
                        border: item.isToday && !item.isSelected ? '1px solid #2979ff' : 'none', 
                        '&:hover': { bgcolor: !item.isFuture && (item.isSelected ? '#2979ff' : 'rgba(255,255,255,0.1)') } 
                      }}
                    >
                      {item.d}
                    </Box>
                  ) : <Box key={i} />
                ))}
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, py: 1 }}>
              {renderYearGrid().map((year) => {
                const isFutureYear = year > new Date().getFullYear();
                return (
                  <Button 
                    key={year} 
                    onClick={() => !isFutureYear && handleYearClick(year)} 
                    disabled={isFutureYear}
                    sx={{ 
                      color: isFutureYear ? '#444' : (year === new Date(editForm.date).getFullYear() ? '#2979ff' : 'white'), 
                      fontWeight: year === new Date(editForm.date).getFullYear() ? 'bold' : 'normal', 
                      bgcolor: year === new Date(editForm.date).getFullYear() ? 'rgba(41, 121, 255, 0.1)' : 'transparent', 
                      borderRadius: 2, py: 1.5, 
                      '&:hover': { bgcolor: isFutureYear ? 'transparent' : 'rgba(255,255,255,0.1)' } 
                    }}
                  >
                    {year}
                  </Button>
                );
              })}
            </Box>
          )}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Select value={new Date(editForm.date).getHours() || 0} onChange={(e) => handleTimeChange('hour', Number(e.target.value))} size="small" MenuProps={{ PaperProps: { sx: { maxHeight: 200, bgcolor: '#2a2a2a', color: 'white' } } }} sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, width: 70 }}>{Array.from({ length: 24 }).map((_, i) => <MenuItem key={i} value={i}>{String(i).padStart(2, '0')}</MenuItem>)}</Select>
              <Typography>:</Typography>
              <Select value={new Date(editForm.date).getMinutes() || 0} onChange={(e) => handleTimeChange('minute', Number(e.target.value))} size="small" MenuProps={{ PaperProps: { sx: { maxHeight: 200, bgcolor: '#2a2a2a', color: 'white' } } }} sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, width: 70 }}>{Array.from({ length: 60 }).map((_, i) => <MenuItem key={i} value={i}>{String(i).padStart(2, '0')}</MenuItem>)}</Select>
            </Box>
            <Button variant="contained" onClick={() => setIsDatePickerOpen(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>Tamam</Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
