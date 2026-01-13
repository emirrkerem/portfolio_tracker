// c:\Users\emirk\Desktop\borsa-app-client\src\pages\dashboard\StockDetailView.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
// Import yolları src/pages/dashboard içinde olduğumuz için ../../ ile başlar
import StockChart from '../../components/common/StockChart';
import { tradeStock } from '../../services/portfolioService';
import { getWalletBalance } from '../../services/walletService';
import PriceTicker from '../../components/common/PriceTicker';
import '../../components/common/PriceTicker.css';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  pctChange: number;
}

export default function StockDetailView() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  
  const [openTransactionModal, setOpenTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [buyQuantity, setBuyQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:mm
  const [commission, setCommission] = useState('0');
  const [unitType, setUnitType] = useState<'SHARES' | 'USD'>('SHARES');
  const [stockDetails, setStockDetails] = useState<StockData | null>(null);
  const [chartDisplayData, setChartDisplayData] = useState<{ price: number, change: number, percent: number } | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'day' | 'year'>('day');
  const [activeTab, setActiveTab] = useState<'general' | 'transactions'>('general');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balanceErrorOpen, setBalanceErrorOpen] = useState(false);
  const [balanceErrorData, setBalanceErrorData] = useState({ cost: 0, balance: 0 });
  const [shareErrorOpen, setShareErrorOpen] = useState(false);
  const [shareErrorData, setShareErrorData] = useState({ required: 0, owned: 0 });

  useEffect(() => {
    const fetchTransactions = async () => {
        if (!symbol) return;
        try {
            const allRes = await fetch(`http://localhost:5000/api/transactions`);
            const allTx = await allRes.json();
            if (Array.isArray(allTx)) {
                // Sunucudan gelen tüm işlemler arasında bu hisseye ait olanları filtrele
                setTransactions(allTx.filter(tx => tx.symbol === symbol).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }
        } catch (error) {
            console.error("İşlemler çekilirken hata oluştu:", error);
            setTransactions([]); // Hata durumunda listeyi boşalt
        }
    };
    fetchTransactions();

    // Portföy güncellendiğinde işlemleri yeniden çekmek için bir dinleyici ekle
    const handlePortfolioUpdate = () => fetchTransactions();
    window.addEventListener('portfolio-updated', handlePortfolioUpdate);
    // Component unmount olduğunda dinleyiciyi temizle
    return () => window.removeEventListener('portfolio-updated', handlePortfolioUpdate);
  }, [symbol]);


  useEffect(() => {
    if (symbol) {
      fetch(`http://localhost:5000/api/market?symbols=${symbol}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setStockDetails(data[0]);
          }
        })
        .catch(err => console.error(err));
    }
  }, [symbol]);

  // Modal açıldığında bakiyeyi sunucudan çek
  useEffect(() => {
    if (openTransactionModal) {
      getWalletBalance().then(data => setWalletBalance(data.balance));
    }
  }, [openTransactionModal]);

  // Tarih değiştiğinde o tarihteki hisse fiyatını otomatik getir
  useEffect(() => {
    if (!openTransactionModal || !symbol) return;

    const fetchHistoricalPrice = async () => {
      try {
        // Seçilen tarih (YYYY-MM-DD)
        const selectedDateStr = transactionDate.split('T')[0];
        const selectedDate = new Date(selectedDateStr);
        
        // Bitiş tarihi: Seçilen günün ertesi günü (yfinance end is exclusive)
        const endDate = new Date(selectedDate);
        endDate.setDate(selectedDate.getDate() + 1);
        const endStr = endDate.toISOString().split('T')[0];

        // Başlangıç tarihi: Seçilen günden 5 gün öncesi (Haftasonu/Tatil durumunda son veriyi bulmak için)
        const startDate = new Date(selectedDate);
        startDate.setDate(selectedDate.getDate() - 5);
        const startStr = startDate.toISOString().split('T')[0];

        const response = await fetch(`http://localhost:5000/api/stock?symbol=${symbol}&start=${startStr}&end=${endStr}&interval=1d`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          // En son veriyi al (Seçilen tarihe en yakın geçmiş veri)
          const lastData = data[data.length - 1];
          setBuyPrice(lastData.price.toFixed(2));
        }
      } catch (error) {
        console.error("Tarihli fiyat çekme hatası:", error);
      }
    };

    // Kullanıcı tarihi değiştirirken sürekli istek atmamak için kısa bir gecikme (debounce)
    const timer = setTimeout(() => {
      fetchHistoricalPrice();
    }, 500);

    return () => clearTimeout(timer);
  }, [transactionDate, symbol, openTransactionModal]);

  const handleTransactionConfirm = async () => {
    if (!symbol || !buyQuantity || !buyPrice) return;

    const qtyInput = Number(buyQuantity);
    const priceInput = Number(buyPrice);
    const commissionVal = Number(commission);

    // Bakiye Kontrolü (Sadece Alış İşlemleri İçin)
    if (transactionType === 'BUY') {
      let totalCost = 0;
      if (unitType === 'SHARES') {
        totalCost = (qtyInput * priceInput) + commissionVal;
      } else {
        totalCost = qtyInput + commissionVal;
      }

      if (totalCost > walletBalance) {
        setBalanceErrorData({ cost: totalCost, balance: walletBalance });
        setBalanceErrorOpen(true);
        return;
      }
    }

    // Hisse Adedi Kontrolü (Sadece Satış İşlemleri İçin)
    if (transactionType === 'SELL') {
      const currentOwned = transactions.reduce((total, tx) => {
        return total + (tx.type === 'BUY' ? Number(tx.quantity) : -Number(tx.quantity));
      }, 0);

      let sellQty = 0;
      if (unitType === 'SHARES') {
        sellQty = qtyInput;
      } else {
        sellQty = qtyInput / priceInput;
      }

      if (sellQty > currentOwned) {
        setShareErrorData({ required: sellQty, owned: currentOwned });
        setShareErrorOpen(true);
        return;
      }
    }

    try {
      // Eğer USD seçildiyse adedi hesapla (Tutar / Fiyat)
      const finalQuantity = unitType === 'USD' ? qtyInput / priceInput : qtyInput;
      
      await tradeStock(symbol, finalQuantity, priceInput, transactionType, transactionDate, commissionVal);
      
      setOpenTransactionModal(false);
      setBuyQuantity('');
      setBuyPrice('');
      // İşlem sonrası bakiyeyi tekrar güncelle
      getWalletBalance().then(data => setWalletBalance(data.balance));
    } catch (error) {
      console.error("İşlem başarısız:", error);
    }
  };

  const calculateTotal = () => {
    const qty = parseFloat(buyQuantity) || 0;
    const price = parseFloat(buyPrice) || 0;
    const comm = parseFloat(commission) || 0;
    
    let val = 0;
    if (unitType === 'SHARES') {
      val = qty * price;
    } else {
      val = qty;
    }
    
    return transactionType === 'BUY' ? val + comm : Math.max(0, val - comm);
  };

  // Görüntülenecek verileri belirle (Grafikten gelen öncelikli, yoksa API'den gelen)
  const displayPrice = chartDisplayData?.price ?? stockDetails?.price ?? 0;
  const displayChange = chartDisplayData?.change ?? stockDetails?.change ?? 0;
  const displayPercent = chartDisplayData?.percent ?? stockDetails?.pctChange ?? 0;
  const isPositive = displayChange >= 0;

  // Takvim Yardımcı Fonksiyonları
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const daysShort = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    const today = new Date();
    const nextMonthDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
    // Gelecek ay, bugünün ayından büyükse engelle
    if (nextMonthDate.getFullYear() > today.getFullYear() || 
       (nextMonthDate.getFullYear() === today.getFullYear() && nextMonthDate.getMonth() > today.getMonth())) {
      return;
    }
    setCalendarViewDate(nextMonthDate);
  };

  const handlePrevYearPage = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear() - 12, calendarViewDate.getMonth(), 1));
  };
  const handleNextYearPage = () => {
    const today = new Date();
    const nextYear = calendarViewDate.getFullYear() + 12;
    if (nextYear > today.getFullYear()) {
      return;
    }
    setCalendarViewDate(new Date(nextYear, calendarViewDate.getMonth(), 1));
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
    const current = new Date(transactionDate);
    const newDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day, current.getHours(), current.getMinutes());
    
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    const h = String(newDate.getHours()).padStart(2, '0');
    const m = String(newDate.getMinutes()).padStart(2, '0');
    setTransactionDate(`${year}-${month}-${d}T${h}:${m}`);
  };

  const handleTimeChange = (type: 'hour' | 'minute', val: number) => {
    const current = new Date(transactionDate);
    let h = current.getHours();
    let m = current.getMinutes();
    
    if (type === 'hour') h = val;
    if (type === 'minute') m = val;
    
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    setTransactionDate(`${year}-${month}-${d}T${hh}:${mm}`);
  };

  const renderCalendarGrid = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Gün sonunu baz al

    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const grid = [];
    for(let i=0; i<startOffset; i++) grid.push(<Box key={`empty-${i}`} sx={{ width: 40, height: 40 }} />);
    
    const currentSelected = new Date(transactionDate);
    const isSameMonth = currentSelected.getMonth() === month && currentSelected.getFullYear() === year;
    
    for(let d=1; d<=daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const isSelected = isSameMonth && currentSelected.getDate() === d;
      const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
      const isFuture = dayDate > today;
      grid.push({ d, isSelected, isToday, isFuture });
    }
    return grid;
  };

  return (
    <Box sx={{ 
      p: 4, 
      color: 'white', 
      background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)', 
      minHeight: '100vh', 
      pt: '90px', 
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate(-1)}
        sx={{ 
          color: '#757575', 
          mb: 3, 
          alignSelf: 'flex-start', 
          textTransform: 'none',
          fontSize: '0.95rem',
          '&:hover': { color: 'white', backgroundColor: 'rgba(255,255,255,0.05)' } 
        }}
      >
        Listeye Dön
      </Button>
      
      {/* Header Card */}
      <Paper sx={{ 
        p: 3, 
        mb: 4, 
        borderRadius: 4, 
        background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        backdropFilter: 'blur(10px)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar 
            src={`/logos/${symbol}.png`} 
            alt={symbol}
            sx={{ 
              width: 72, 
              height: 72,
              bgcolor: 'rgba(255,255,255,0.05)',
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
            imgProps={{ 
              onError: (e) => { (e.target as HTMLImageElement).style.display = 'none'; } 
            }}
          >
            {symbol?.substring(0, 2)}
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="h3" fontWeight="800" sx={{ letterSpacing: '-1px', background: 'linear-gradient(90deg, #fff, #ccc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {symbol}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 1 }}>
                <PriceTicker price={displayPrice} />
                <Box sx={{ 
                  background: isPositive ? 'linear-gradient(45deg, rgba(0, 230, 118, 0.2), rgba(0, 200, 83, 0.3))' : 'linear-gradient(45deg, rgba(255, 23, 68, 0.2), rgba(213, 0, 0, 0.3))',
                  color: isPositive ? '#00e676' : '#ff1744',
                  px: 1.5, py: 0.5, borderRadius: 2,
                  fontSize: '1rem', fontWeight: 700,
                  boxShadow: isPositive ? '0 2px 8px rgba(0, 230, 118, 0.2)' : '0 2px 8px rgba(255, 23, 68, 0.2)',
                  border: '1px solid',
                  borderColor: isPositive ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 23, 68, 0.3)'
                }}>
                  {isPositive ? '+' : ''}{displayChange.toFixed(2)} ({isPositive ? '+' : ''}{displayPercent.toFixed(2)}%)
                </Box>
              </Box>
            </Box>
            <Typography variant="subtitle1" sx={{ color: '#a0a0a0', fontWeight: 500 }}>{stockDetails?.name || 'Stock Detail View'}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<TrendingUpIcon />}
            onClick={() => { setTransactionType('BUY'); setOpenTransactionModal(true); }}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5, 
              fontSize: '1rem', 
              fontWeight: 'bold', 
              boxShadow: '0 8px 24px rgba(0,200,83,0.25)',
              background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)'
            }}
          >
            AL (BUY)
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            startIcon={<TrendingDownIcon />}
            onClick={() => { setTransactionType('SELL'); setOpenTransactionModal(true); }}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1.5, 
              fontSize: '1rem', 
              fontWeight: 'bold', 
              boxShadow: '0 8px 24px rgba(211, 47, 47, 0.25)',
              background: 'linear-gradient(45deg, #c62828 30%, #ef5350 90%)'
            }}
          >
            SAT (SELL)
          </Button>
        </Box>
      </Paper>

      <Box sx={{ mt: 4 }}>
        <StockChart symbol={symbol || ''} onPriceUpdate={setChartDisplayData} />
      </Box>
      
      {/* Alım Modalı */}
      <Dialog 
        open={openTransactionModal} 
        onClose={() => setOpenTransactionModal(false)}
        TransitionProps={{ timeout: 400 }}
        PaperProps={{
          sx: {
            background: 'linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)',
            color: 'white',
            minWidth: '420px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
          }
        }}
      >
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid rgba(255,255,255,0.08)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ 
              bgcolor: transactionType === 'BUY' ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 82, 82, 0.15)',
              color: transactionType === 'BUY' ? '#69f0ae' : '#ff5252'
            }}>
              {transactionType === 'BUY' ? <TrendingUpIcon /> : <TrendingDownIcon />}
            </Avatar>
            <Typography variant="h5" fontWeight="bold">
              {transactionType === 'BUY' ? 'Hisse Al' : 'Hisse Sat'}
            </Typography>
          </Box>
          <IconButton onClick={() => setOpenTransactionModal(false)} sx={{ color: '#a0a0a0', '&:hover': { color: 'white' } }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 0.5 }}>Mevcut Bakiye (Buying Power)</Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>${walletBalance.toFixed(2)}</Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              autoFocus
              label={unitType === 'SHARES' ? "Adet" : "Tutar ($)"}
              type="number"
              fullWidth
              variant="filled"
              value={buyQuantity}
              onChange={(e) => {
                const value = e.target.value;
                // Değeri 0'dan küçükse veya geçersiz karakterler içeriyorsa güncellemeyi engelle
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setBuyQuantity(value);
                }
              }}
              onKeyDown={(e) => {
                // +, -, E gibi karakterleri engelle
                if (['+', '-', 'e', 'E'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              inputProps={{ min: 0 }} // Tarayıcı seviyesinde minimum değeri ayarla
              InputProps={{ 
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton 
                      size="small"
                      onClick={() => {
                        const val = parseFloat(buyQuantity) || 0;
                        setBuyQuantity(Math.max(0, val - 1).toString());
                      }}
                      sx={{ color: '#a0a0a0', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' } }}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small"
                      onClick={() => {
                        const val = parseFloat(buyQuantity) || 0;
                        setBuyQuantity((val + 1).toString());
                      }}
                      sx={{ color: '#a0a0a0', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' } }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ 
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
              }}
            />
            <FormControl variant="filled" sx={{ minWidth: 110 }}>
              <InputLabel sx={{ color: '#a0a0a0' }}>Birim</InputLabel>
              <Select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as 'SHARES' | 'USD')}
                disableUnderline
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderRadius: 2,
                  color: 'white',
                  '.MuiSvgIcon-root': { color: '#a0a0a0' },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.08)' }
                }}
              >
                <MenuItem value="SHARES">Adet</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            label="Birim Fiyat ($)"
            type="number"
            fullWidth
            variant="filled"
            value={buyPrice}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setBuyPrice(value);
              }
            }}
            onKeyDown={(e) => {
              if (['+', '-', 'e', 'E'].includes(e.key)) {
                e.preventDefault();
              }
            }}
            inputProps={{ min: 0 }}
            InputProps={{ 
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton 
                    size="small"
                    onClick={() => {
                      const val = parseFloat(buyPrice) || 0;
                      setBuyPrice(Math.max(0, val - 0.1).toFixed(2));
                    }}
                    sx={{ color: '#a0a0a0', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' } }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    size="small"
                    onClick={() => {
                      const val = parseFloat(buyPrice) || 0;
                      setBuyPrice((val + 0.1).toFixed(2));
                    }}
                    sx={{ color: '#a0a0a0', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' } }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ 
              mb: 2,
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
            }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            {/* Özel Tarih Seçici Tetikleyici */}
            <Box 
              onClick={() => {
                setCalendarViewDate(new Date(transactionDate));
                setIsDatePickerOpen(true);
                setCalendarViewMode('day');
              }}
              sx={{
                flex: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                p: '10px 16px',
                cursor: 'pointer',
                border: '1px solid transparent',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <CalendarTodayIcon sx={{ color: '#2979ff' }} />
              <Box>
                <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', lineHeight: 1 }}>İşlem Tarihi</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>
                  {new Date(transactionDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} 
                  {' • '}
                  {new Date(transactionDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            </Box>

            <TextField
              label="Komisyon ($)"
              type="number"
              fullWidth
              variant="filled"
              value={commission}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setCommission(value);
                }
              }}
              onKeyDown={(e) => {
                if (['+', '-', 'e', 'E'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              inputProps={{ min: 0 }}
              InputProps={{ disableUnderline: true }}
              sx={{ 
                flex: 1,
                '& .MuiFilledInput-root': { 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  borderRadius: 2,
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.08)' }
                },
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
              }}
            />
          </Box>

          <Paper elevation={0} sx={{ 
            p: 2.5, 
            bgcolor: transactionType === 'BUY' ? 'rgba(0, 200, 83, 0.08)' : 'rgba(255, 82, 82, 0.08)', 
            borderRadius: 3,
            border: transactionType === 'BUY' ? '1px solid rgba(0, 200, 83, 0.2)' : '1px solid rgba(255, 82, 82, 0.2)',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 0.5 }}>
                {transactionType === 'BUY' ? 'Toplam Tutar' : 'Tahmini Gelir'}
              </Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color: transactionType === 'BUY' ? '#69f0ae' : '#ff5252' }}>
                ${calculateTotal().toFixed(2)}
              </Typography>
            </Box>
            <Button 
              onClick={handleTransactionConfirm} 
              variant="contained" 
              sx={{ 
                bgcolor: transactionType === 'BUY' ? '#00c853' : '#d32f2f',
                color: 'white',
                fontWeight: 'bold',
                px: 4,
                py: 1.5,
                borderRadius: 2,
                boxShadow: transactionType === 'BUY' ? '0 4px 12px rgba(0, 200, 83, 0.4)' : '0 4px 12px rgba(211, 47, 47, 0.4)',
                '&:hover': {
                  bgcolor: transactionType === 'BUY' ? '#00e676' : '#f44336',
                }
              }}
            >
              {transactionType === 'BUY' ? 'ONAYLA (AL)' : 'ONAYLA (SAT)'}
            </Button>
          </Paper>
        </DialogContent>
      </Dialog>

      {/* Özel Tarih Seçici Dialog */}
      <Dialog 
        open={isDatePickerOpen} 
        onClose={() => setIsDatePickerOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: 'white',
            borderRadius: 3,
            p: 1,
            minWidth: '320px'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={calendarViewMode === 'day' ? handlePrevMonth : handlePrevYearPage} sx={{ color: 'white' }}><ChevronLeftIcon /></IconButton>
            <Typography 
              variant="h6" 
              fontWeight="bold" 
              onClick={() => setCalendarViewMode(calendarViewMode === 'day' ? 'year' : 'day')}
              sx={{ cursor: 'pointer', '&:hover': { color: '#2979ff' }, transition: 'color 0.2s' }}
            >
              {calendarViewMode === 'day' 
                ? `${months[calendarViewDate.getMonth()]} ${calendarViewDate.getFullYear()}`
                : `${calendarViewDate.getFullYear()}`
              }
            </Typography>
            <IconButton onClick={calendarViewMode === 'day' ? handleNextMonth : handleNextYearPage} sx={{ color: 'white' }}><ChevronRightIcon /></IconButton>
          </Box>

          {calendarViewMode === 'day' ? (
            <>
              {/* Days Header */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1, textAlign: 'center' }}>
                {daysShort.map(d => (
                  <Typography key={d} variant="caption" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>{d}</Typography>
                ))}
              </Box>

              {/* Calendar Grid */}
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
                        cursor: item.isFuture ? 'not-allowed' : 'pointer',
                        mx: 'auto',
                        bgcolor: item.isSelected && !item.isFuture ? '#2979ff' : 'transparent',
                        color: item.isFuture ? '#666' : (item.isSelected ? 'white' : (item.isToday ? '#2979ff' : 'white')),
                        fontWeight: item.isSelected || item.isToday ? 'bold' : 'normal',
                        border: item.isToday && !item.isSelected ? '1px solid #2979ff' : 'none',
                        opacity: item.isFuture ? 0.6 : 1,
                        '&:hover': { bgcolor: item.isFuture ? 'transparent' : (item.isSelected ? '#2979ff' : 'rgba(255,255,255,0.1)') }
                      }}
                    >
                      {item.d}
                    </Box>
                  ) : <Box key={i} />
                ))}
              </Box>
            </>
          ) : (
            /* Year Grid */
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, py: 1 }}>
              {renderYearGrid().map((year) => {
                const isFutureYear = year > new Date().getFullYear();
                return (
                  <Button
                    key={year}
                    onClick={() => !isFutureYear && handleYearClick(year)}
                    disabled={isFutureYear}
                    sx={{ 
                      color: isFutureYear ? '#666' : (year === new Date(transactionDate).getFullYear() ? '#2979ff' : 'white'),
                      fontWeight: year === new Date(transactionDate).getFullYear() ? 'bold' : 'normal',
                      bgcolor: year === new Date(transactionDate).getFullYear() ? 'rgba(41, 121, 255, 0.1)' : 'transparent',
                      borderRadius: 2,
                      py: 1.5,
                      '&:hover': { bgcolor: isFutureYear ? 'transparent' : 'rgba(255,255,255,0.1)' },
                      cursor: isFutureYear ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {year}
                  </Button>
                );
              })}
            </Box>
          )}

          {/* Time Picker Footer */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Select
                value={new Date(transactionDate).getHours()}
                onChange={(e) => handleTimeChange('hour', Number(e.target.value))}
                size="small"
                MenuProps={{ PaperProps: { sx: { maxHeight: 200, bgcolor: '#2a2a2a', color: 'white' } } }}
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, width: 70 }}
              >
                {Array.from({ length: 24 }).map((_, i) => <MenuItem key={i} value={i}>{String(i).padStart(2, '0')}</MenuItem>)}
              </Select>
              <Typography>:</Typography>
              <Select
                value={new Date(transactionDate).getMinutes()}
                onChange={(e) => handleTimeChange('minute', Number(e.target.value))}
                size="small"
                MenuProps={{ PaperProps: { sx: { maxHeight: 200, bgcolor: '#2a2a2a', color: 'white' } } }}
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, width: 70 }}
              >
                {Array.from({ length: 60 }).map((_, i) => <MenuItem key={i} value={i}>{String(i).padStart(2, '0')}</MenuItem>)}
              </Select>
            </Box>
            
            <Button variant="contained" onClick={() => setIsDatePickerOpen(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>Tamam</Button>
          </Box>
        </Box>
      </Dialog>

      {/* Yetersiz Bakiye Uyarısı */}
      <Dialog
        open={balanceErrorOpen}
        onClose={() => setBalanceErrorOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: 'white',
            borderRadius: 3,
            border: '1px solid rgba(255, 82, 82, 0.3)',
            minWidth: '320px',
            textAlign: 'center',
            p: 1
          }
        }}
      >
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255, 82, 82, 0.15)', color: '#ff5252', width: 56, height: 56 }}>
            <ErrorOutlineIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h6" fontWeight="bold" sx={{ color: '#ff5252' }}>
            Yetersiz Bakiye
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1 }}>
            Bu işlemi gerçekleştirmek için yeterli bakiyeniz bulunmamaktadır.
          </Typography>
          
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', p: 2, borderRadius: 2, width: '100%', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>İşlem Tutarı:</Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ color: 'white' }}>${balanceErrorData.cost.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Mevcut Bakiye:</Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ color: '#ff5252' }}>${balanceErrorData.balance.toFixed(2)}</Typography>
            </Box>
          </Box>

          <Button variant="contained" fullWidth onClick={() => setBalanceErrorOpen(false)} sx={{ bgcolor: '#ff5252', color: 'white', fontWeight: 'bold', borderRadius: 2, '&:hover': { bgcolor: '#d32f2f' } }}>TAMAM</Button>
        </Box>
      </Dialog>

      {/* Yetersiz Hisse Uyarısı */}
      <Dialog
        open={shareErrorOpen}
        onClose={() => setShareErrorOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: 'white',
            borderRadius: 3,
            border: '1px solid rgba(255, 82, 82, 0.3)',
            minWidth: '320px',
            textAlign: 'center',
            p: 1
          }
        }}
      >
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255, 82, 82, 0.15)', color: '#ff5252', width: 56, height: 56 }}>
            <ErrorOutlineIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h6" fontWeight="bold" sx={{ color: '#ff5252' }}>
            Yetersiz Hisse Adedi
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1 }}>
            Bu işlemi gerçekleştirmek için portföyünüzde yeterli miktarda hisse bulunmamaktadır.
          </Typography>
          
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', p: 2, borderRadius: 2, width: '100%', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Satılacak Adet:</Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ color: 'white' }}>{shareErrorData.required.toFixed(4)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Mevcut Adet:</Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ color: '#ff5252' }}>{shareErrorData.owned.toFixed(4)}</Typography>
            </Box>
          </Box>

          <Button variant="contained" fullWidth onClick={() => setShareErrorOpen(false)} sx={{ bgcolor: '#ff5252', color: 'white', fontWeight: 'bold', borderRadius: 2, '&:hover': { bgcolor: '#d32f2f' } }}>TAMAM</Button>
        </Box>
      </Dialog>
    </Box>
  );
}
