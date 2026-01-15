import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IconButton from '@mui/material/IconButton';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import InputAdornment from '@mui/material/InputAdornment';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import Pagination from '@mui/material/Pagination';

export default function TargetView() {
  // Cache Helper
  const getCachedData = (key: string, defaultVal: any) => {
    try {
      const cached = localStorage.getItem('target_view_cache');
      if (cached) {
        const data = JSON.parse(cached);
        return data[key] !== undefined ? data[key] : defaultVal;
      }
    } catch (e) { console.error("Cache parse error", e); }
    return defaultVal;
  };

  const [startingAmount, setStartingAmount] = useState(() => getCachedData('startingAmount', ''));
  const [startDate, setStartDate] = useState(() => getCachedData('startDate', ''));
  const [years, setYears] = useState(() => getCachedData('years', '10'));
  const [returnRate, setReturnRate] = useState(() => getCachedData('returnRate', '8')); // Varsayılan %8
  const [monthlyContribution, setMonthlyContribution] = useState(() => getCachedData('monthlyContribution', ''));
  
  const hasCache = !!localStorage.getItem('target_view_cache');
  const [loading, setLoading] = useState(!hasCache); // Cache varsa loading gösterme
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState<any[]>(() => getCachedData('walletTransactions', []));
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState('ALL');
  const [portfolioHistory, setPortfolioHistory] = useState<any[]>(() => getCachedData('portfolioHistory', []));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'day' | 'year'>('day');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [breakdownPage, setBreakdownPage] = useState(1);
  const [analysisPage, setAnalysisPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
        const headers = { 'X-User-ID': user.id || '1' };

        // 1. Mevcut Portföy Değerini Çek
        const portRes = await fetch('http://localhost:5000/api/portfolio/history', { headers });
        const portData = await portRes.json();
        if (Array.isArray(portData) && portData.length > 0) {
          setPortfolioHistory(portData);
        }

        // 2. Kayıtlı Hedefi Çek
        const targetRes = await fetch('http://localhost:5000/api/targets', { headers });
        const targetData = await targetRes.json();
        
        // Null check ve String dönüşümü (TextField çökmesini önler)
        if (targetData.startingAmount !== undefined && targetData.startingAmount !== null) setStartingAmount(String(targetData.startingAmount));
        else setStartingAmount('0');

        if (targetData.startDate) setStartDate(targetData.startDate);
        else setStartDate(new Date().toISOString().split('T')[0]);

        if (targetData.years !== undefined && targetData.years !== null) setYears(String(targetData.years));
        if (targetData.returnRate !== undefined && targetData.returnRate !== null) setReturnRate(String(targetData.returnRate));
        if (targetData.monthlyContribution !== undefined && targetData.monthlyContribution !== null) setMonthlyContribution(String(targetData.monthlyContribution));
        
        // 3. Cüzdan İşlemlerini Çek (Takip sekmesi için)
        const walletRes = await fetch('http://localhost:5000/api/wallet', { headers });
        const walletData = await walletRes.json();
        if (walletData.transactions) {
            setWalletTransactions(walletData.transactions);
        }

        // Cache'i Güncelle
        const cacheData = {
            startingAmount: targetData.startingAmount !== undefined ? String(targetData.startingAmount) : '0',
            startDate: targetData.startDate || new Date().toISOString().split('T')[0],
            years: targetData.years !== undefined ? String(targetData.years) : '10',
            returnRate: targetData.returnRate !== undefined ? String(targetData.returnRate) : '8',
            monthlyContribution: targetData.monthlyContribution !== undefined ? String(targetData.monthlyContribution) : '',
            walletTransactions: walletData.transactions || [],
            portfolioHistory: Array.isArray(portData) ? portData : []
        };
        localStorage.setItem('target_view_cache', JSON.stringify(cacheData));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
      const headers = { 'Content-Type': 'application/json', 'X-User-ID': user.id || '1' };

      await fetch('http://localhost:5000/api/targets', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ 
          startingAmount, 
          startDate,
          years, 
          returnRate, 
          monthlyContribution 
        })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
      const headers = { 'X-User-ID': user.id || '1' };
      await fetch('http://localhost:5000/api/targets', { method: 'DELETE', headers });
      // State'leri sıfırla
      setStartingAmount('0');
      setStartDate(new Date().toISOString().split('T')[0]);
      setYears('10');
      setReturnRate('8');
      setMonthlyContribution('');
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  // Tablo verisi değiştiğinde (yıl sayısı değişince) sayfayı başa al
  useEffect(() => {
    setBreakdownPage(1);
    setAnalysisPage(1);
  }, [years]);

  // --- HESAPLAMALAR ---
  const startVal = Number(startingAmount) || 0;
  const durationYears = Number(years) || 0;
  const rate = Number(returnRate) || 0;
  const monthlyAdd = Number(monthlyContribution) || 0;
  const totalContribution = startVal + (monthlyAdd * 12 * durationYears);
  
  // YENİ: Başlangıç Yılını Hesapla
  const startYear = useMemo(() => {
      if (!startDate) return new Date().getFullYear();
      return new Date(startDate).getFullYear();
  }, [startDate]);

  // Tablo Verisi (Yıllık Özet - Paylaşılan formata uygun)
  const tableData = useMemo(() => {
    if (durationYears <= 0) return [];
    const data = [];
    let currentBalance = startVal;
    
    // DÜZELTME: "Compound Annually" (Yıllık Bileşik) mantığı.
    // Yıllık oranın (örn %8) yıl sonunda tam tutması için geometrik aylık oran hesaplanır.
    // Eski (Hatalı - Aylık Bileşik): rate / 100 / 12
    // Yeni (Doğru - Yıllık Bileşik): (1 + rate)^(1/12) - 1
    const monthlyRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
    
    for (let i = 1; i <= durationYears; i++) {
        let yearlyInterest = 0;
        let yearlyDeposit = 0;

        for (let month = 0; month < 12; month++) {
            // Ay başı katkı (Beginning of Month)
            currentBalance += monthlyAdd;
            yearlyDeposit += monthlyAdd;
            
            // Faiz işlet
            const interest = currentBalance * monthlyRate;
            currentBalance += interest;
            yearlyInterest += interest;
        }

        data.push({
            year: startYear + i - 1,
            deposit: yearlyDeposit,
            interest: yearlyInterest,
            endingBalance: currentBalance
        });
    }
    return data;
  }, [startVal, durationYears, rate, monthlyAdd, startYear]);

  // Grafik Verisi (Aylık Hesaplama)
  const chartData = useMemo(() => {
    if (durationYears <= 0) return [];

    // Geçmiş veriyi Map'e çevir (Hızlı erişim için: "YYYY-M" -> Value)
    // Tarih formatı YYYY-MM-DD olduğu için string parse ediyoruz (Timezone hatasını önlemek için)
    const historyMap = new Map<string, number>();
    portfolioHistory.forEach(item => {
        const [y, m] = item.date.split('-').map(Number);
        const key = `${y}-${m - 1}`; // Ay 0-indeksli olsun
        historyMap.set(key, item.value);
    });
    
    const data = [];
    const sDate = startDate ? new Date(startDate) : new Date();
    let currentBalance = startVal;
    let totalInvested = startVal;
    // Yıllık Bileşik için Aylık Oran: (1 + r)^(1/12) - 1
    const monthlyRate = Math.pow(1 + rate / 100, 1 / 12) - 1;

    // Başlangıç Tarihi Bileşenleri (UTC/Local karmaşasını önlemek için getUTC kullanıyoruz veya string parse)
    // Basitlik için Date objesini kullanıp ay/yıl alacağız, ancak döngüde manuel artıracağız.
    let loopYear = sDate.getFullYear();
    let loopMonth = sDate.getMonth(); // 0-11

    // Başlangıç Noktası
    const startKey = `${loopYear}-${loopMonth}`;
    data.push({
        dateLabel: sDate.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        balance: startVal,
        invested: startVal,
        interest: 0,
        actual: historyMap.get(startKey) ?? (new Date() >= sDate ? startVal : null)
    });

    const totalMonths = durationYears * 12;

    for (let i = 1; i <= totalMonths; i++) {
        // Ayı manuel artır
        loopMonth++;
        if (loopMonth > 11) {
            loopMonth = 0;
            loopYear++;
        }
        
        // Projeksiyon Hesapla
        currentBalance += monthlyAdd;
        totalInvested += monthlyAdd;
        currentBalance += (currentBalance * monthlyRate);

        // Gerçekleşen Değeri Bul
        const key = `${loopYear}-${loopMonth}`;
        const actualVal = historyMap.get(key);
        
        // Tarih Etiketi
        const labelDate = new Date(loopYear, loopMonth, 1);

        data.push({
            dateLabel: labelDate.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
            balance: currentBalance,
            invested: totalInvested,
            interest: currentBalance - totalInvested,
            actual: actualVal // undefined ise grafikte çizilmez
        });
    }
    return data;
  }, [startVal, durationYears, rate, monthlyAdd, startDate, portfolioHistory]);

  const finalData = chartData.length > 0 ? chartData[chartData.length - 1] : { balance: 0, invested: 0, interest: 0 };

  // İlerleme Durumu Hesaplama
  const currentPortfolioValue = portfolioHistory.length > 0 ? portfolioHistory[portfolioHistory.length - 1].value : 0;
  const progressPercentage = finalData.balance > 0 ? (currentPortfolioValue / finalData.balance) * 100 : 0;

  // Grafik Filtreleme (Range Selector)
  const filteredChartData = useMemo(() => {
    if (selectedRange === 'ALL') return chartData;
    
    let monthsLimit = 0;
    if (selectedRange.endsWith('M')) {
        monthsLimit = parseInt(selectedRange.replace('M', ''));
    } else if (selectedRange.endsWith('Y')) {
        monthsLimit = parseInt(selectedRange.replace('Y', '')) * 12;
    }

    if (isNaN(monthsLimit)) return chartData;
    // chartData[0] başlangıç noktasıdır. limit kadar ay sonrasını göster.
    return chartData.filter((_, i) => i <= monthsLimit);
  }, [chartData, selectedRange]);

  // --- TAKİP VERİSİ (Tracker Data) ---
  const trackerData = useMemo(() => {
    const target = Number(monthlyContribution) || 0;
    if (target === 0) return {};

    // Cüzdan verilerini aya göre grupla (YYYY-MM formatında key)
    const depositsByMonth: Record<string, number> = {};
    walletTransactions.forEach((tx: any) => {
        if (tx.type === 'DEPOSIT') {
            const d = new Date(tx.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            depositsByMonth[key] = (depositsByMonth[key] || 0) + Number(tx.amount);
        }
    });

    // Son 12 ayı oluştur
    const result: Record<string, any[]> = {};
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = d.getFullYear().toString();
        const key = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const actual = depositsByMonth[key] || 0;
        
        if (!result[year]) {
            result[year] = [];
        }

        result[year].push({
            monthStr: d.toLocaleDateString('tr-TR', { month: 'long' }),
            target: target,
            actual: actual,
            diff: actual - target,
            isMet: actual >= target
        });
    }
    return result;
  }, [walletTransactions, monthlyContribution]);

  // --- HEDEF ANALİZİ VERİSİ (Goal Analysis Data) ---
  const analysisData = useMemo(() => {
    if (tableData.length === 0) return [];

    // Portföy geçmişini Yıl -> Son Değer haritasına çevir
    const historyByYear = new Map<number, number>();
    const currentYear = new Date().getFullYear();

    // portfolioHistory tarih sıralı olduğu için, her yılın son değerini alır
    portfolioHistory.forEach(item => {
        const y = parseInt(item.date.split('-')[0]);
        historyByYear.set(y, item.value);
    });

    return tableData.map(row => {
        const actual = historyByYear.get(row.year);
        
        // Gelecek yıllar
        if (actual === undefined) {
            return {
                year: row.year,
                target: row.endingBalance,
                actual: null,
                diff: 0,
                diffPct: 0,
                status: 'future'
            };
        }

        const diff = actual - row.endingBalance;
        const diffPct = row.endingBalance > 0 ? (diff / row.endingBalance) * 100 : 0;
        const isSuccess = actual >= row.endingBalance;
        const isCurrent = row.year === currentYear;

        // Durum Belirleme: Başarılı, Başarısız veya Devam Ediyor (Mevcut Yıl)
        let status = isSuccess ? 'success' : (isCurrent ? 'pending' : 'fail');

        return { year: row.year, target: row.endingBalance, actual, diff, diffPct, status };
    });
  }, [tableData, portfolioHistory]);

  const availableYears = useMemo(() => Object.keys(trackerData).sort((a, b) => Number(b) - Number(a)), [trackerData]);
  const displayYear = (selectedYear && availableYears.includes(selectedYear)) ? selectedYear : availableYears[0];

  // Takvim Yardımcı Fonksiyonları
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const daysShort = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    const maxDate = new Date(); // Bugün
    const nextMonthDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
    if (nextMonthDate > maxDate) return;
    setCalendarViewDate(nextMonthDate);
  };

  const handlePrevYearPage = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear() - 12, calendarViewDate.getMonth(), 1));
  };
  const handleNextYearPage = () => {
    const maxYear = new Date().getFullYear(); // Bugünün yılı
    const nextYear = calendarViewDate.getFullYear() + 12;
    if (nextYear - 6 > maxYear) return;
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
    const newDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    setStartDate(`${year}-${month}-${d}`);
    setIsDatePickerOpen(false);
  };

  const renderCalendarGrid = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const grid = [];
    for(let i=0; i<startOffset; i++) grid.push(<Box key={`empty-${i}`} sx={{ width: 40, height: 40 }} />);
    
    const currentSelected = new Date(startDate);
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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ 
      p: 4, 
      pt: '90px', 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)', 
      color: 'white' 
    }}>
      <Typography variant="h4" fontWeight="800" sx={{ mb: 4, letterSpacing: '-1px' }}>Yatırım Planlayıcı</Typography>

      <Paper sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 3, mb: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Tabs 
            value={tabValue} 
            onChange={(_, v) => setTabValue(v)} 
            textColor="inherit" 
            indicatorColor="primary"
            sx={{
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 'bold', fontSize: '1rem', minHeight: 60, px: 4 },
                '& .Mui-selected': { color: '#2979ff' },
                '& .MuiTabs-indicator': { backgroundColor: '#2979ff', height: 3 }
            }}
        >
            <Tab label="Planlayıcı" />
            <Tab label="Katkı Takibi" />
            <Tab label="Hedef Analizi" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {/* Sol Taraf: Ayarlar */}
        <Paper sx={{ flex: 1, minWidth: 300, maxWidth: 400, bgcolor: '#000000', p: 4, borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', height: 'fit-content' }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, color: 'white' }}>
            Parametreler
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <TextField 
              label="Starting Amount ($)"
              fullWidth 
              variant="filled" 
              value={startingAmount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setStartingAmount(val);
                }
              }}
              onKeyDown={(e) => {
                if (['+', '-', 'e', 'E'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              inputProps={{ min: 0 }}
              type="number"
              InputProps={{ 
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton 
                      size="small"
                      onClick={() => setStartingAmount((prev: string) => Math.max(0, (parseFloat(prev) || 0) - 1000).toString())}
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
                      onClick={() => setStartingAmount((prev: string) => ((parseFloat(prev) || 0) + 1000).toString())}
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
          </Box>

          <Box sx={{ mb: 3 }}>
            <Box 
              onClick={() => {
                setCalendarViewDate(new Date(startDate));
                setIsDatePickerOpen(true);
                setCalendarViewMode('day');
              }}
              sx={{
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
                <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', lineHeight: 1 }}>Start Date</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>
                  {new Date(startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <TextField 
              label="After (Years)"
              fullWidth 
              variant="filled" 
              value={years}
              onChange={(e) => {
                const val = e.target.value;
                // Boş değer veya 70'ten küçük eşitse güncelle
                if (val === '' || (Number(val) <= 70)) {
                  setYears(val);
                }
              }}
              type="number"
              InputProps={{ 
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton 
                      size="small"
                      onClick={() => setYears((prev: string) => Math.max(1, (parseFloat(prev) || 0) - 1).toString())}
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
                      onClick={() => setYears((prev: string) => Math.min(70, (parseFloat(prev) || 0) + 1).toString())}
                      sx={{ color: '#a0a0a0', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' } }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ 
                '& .MuiFilledInput-root': { bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }, '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.08)' }, pl: 1.5, pr: 1.5 },
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& input[type=number]': { MozAppearance: 'textfield' },
                '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <TextField 
              label="Return Rate (%)"
              fullWidth 
              variant="filled" 
              value={returnRate}
              onChange={(e) => setReturnRate(e.target.value)}
              type="number"
              InputProps={{ 
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton 
                      size="small"
                      onClick={() => setReturnRate((prev: string) => Math.max(0, (parseFloat(prev) || 0) - 0.5).toString())}
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
                      onClick={() => setReturnRate((prev: string) => ((parseFloat(prev) || 0) + 0.5).toString())}
                      sx={{ color: '#a0a0a0', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' } }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ 
                '& .MuiFilledInput-root': { bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }, '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.08)' }, pl: 1.5, pr: 1.5 },
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& input[type=number]': { MozAppearance: 'textfield' },
                '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
              }}
            />
          </Box>

          <Box sx={{ mb: 4 }}>
            <TextField 
              label="Additional Contribution (Monthly)"
              fullWidth 
              variant="filled" 
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              type="number"
              InputProps={{ 
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton 
                      size="small"
                      onClick={() => setMonthlyContribution((prev: string) => Math.max(0, (parseFloat(prev) || 0) - 100).toString())}
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
                      onClick={() => setMonthlyContribution((prev: string) => ((parseFloat(prev) || 0) + 100).toString())}
                      sx={{ color: '#a0a0a0', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' } }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ 
                '& .MuiFilledInput-root': { bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }, '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.08)' }, pl: 1.5, pr: 1.5 },
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& input[type=number]': { MozAppearance: 'textfield' },
                '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
              }}
            />
          </Box>

          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.03)', p: 1.5, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Total Contribution:</Typography>
            <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
              ${totalContribution.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              fullWidth 
              onClick={() => setDeleteConfirmOpen(true)}
              color="error"
              sx={{ 
                py: 1.5, 
                fontWeight: 'bold', 
                borderRadius: 2,
                borderColor: 'rgba(255, 23, 68, 0.5)',
                color: '#ff1744',
                '&:hover': { borderColor: '#ff1744', bgcolor: 'rgba(255, 23, 68, 0.1)' } 
              }}
            >
              Planı Sil
            </Button>
            <Button 
              variant="contained" 
              fullWidth 
              onClick={handleSave}
              disabled={saving}
              sx={{ 
                bgcolor: '#2979ff', 
                py: 1.5, 
                fontWeight: 'bold', 
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(41, 121, 255, 0.3)',
                '&:hover': { bgcolor: '#1565c0' } 
              }}
            >
              {saving ? 'Kaydediliyor...' : 'Planı Kaydet'}
            </Button>
          </Box>
        </Paper>

        {/* Sağ Taraf: Sonuçlar ve Grafik */}
        <Box sx={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Özet Kartları */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Paper sx={{ flex: 1, minWidth: 200, p: 3, borderRadius: 4, background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}><AttachMoneyIcon sx={{ fontSize: 100 }} /></Box>
                <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>End Balance</Typography>
                <Typography variant="h4" fontWeight="bold">
                    ${finalData.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>
                    {years} yıl sonundaki tahmini toplam değer.
                </Typography>
            </Paper>

            <Paper sx={{ flex: 1, minWidth: 200, p: 3, borderRadius: 4, background: 'linear-gradient(135deg, #004d40 0%, #00695c 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}><TrendingUpIcon sx={{ fontSize: 100 }} /></Box>
                <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>Total Interest</Typography>
                <Typography variant="h4" fontWeight="bold">
                    ${finalData.interest.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>
                    Toplam kazanılan bileşik faiz.
                </Typography>
            </Paper>

            <Paper sx={{ flex: 1, minWidth: 200, p: 3, borderRadius: 4, background: 'linear-gradient(135deg, #e65100 0%, #ef6c00 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}><DonutLargeIcon sx={{ fontSize: 100 }} /></Box>
                <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>Progress</Typography>
                <Typography variant="h4" fontWeight="bold">
                    %{progressPercentage.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>
                    Hedefe ulaşma oranı.
                </Typography>
            </Paper>
          </Box>

          {/* Grafik */}
          <Paper sx={{ flex: 1, minHeight: 450, bgcolor: '#000000', p: 3, borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, color: 'white' }}>Büyüme Projeksiyonu</Typography>
            
            {/* Recharts için sabit yükseklik vererek çökmesini engelle */}
            <Box sx={{ width: '100%', height: 300, position: 'relative' }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2196f3" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#2196f3" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ff9800" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ff9800" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis dataKey="dateLabel" stroke="#666" tick={{fill: '#666'}} minTickGap={30} />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                            itemStyle={{ color: 'white' }}
                            formatter={(value: number, name: string) => [`$${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="balance" 
                            name="Hedeflenen (Target)"
                            stroke="#2196f3" 
                            fillOpacity={1} 
                            fill="url(#colorBalance)" 
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="actual" 
                            name="Gerçekleşen (Actual)"
                            stroke="#ff9800" 
                            fillOpacity={1} 
                            fill="url(#colorActual)" 
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                    <Typography>Grafik oluşturmak için geçerli değerler giriniz.</Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#a0a0a0' }}><Box sx={{ width: 10, height: 10, bgcolor: '#2196f3', borderRadius: '50%' }}/> Hedeflenen (Target)</Typography>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#a0a0a0' }}><Box sx={{ width: 10, height: 10, bgcolor: '#ff9800', borderRadius: '50%' }}/> Gerçekleşen (Actual)</Typography>
            </Box>
          </Paper>

          {/* Tarih Aralığı Seçici */}
          <Box sx={{
            mt: -2, mb: 2, display: 'flex', justifyContent: 'space-between',
            width: '100%', bgcolor: 'rgba(255,255,255,0.03)',
            borderRadius: 3, p: 0.5
          }}>
            {['1M', '1Y', '3Y', '5Y', '10Y', '20Y', 'ALL'].map((range) => (
              <Typography
                key={range}
                onClick={() => setSelectedRange(range)}
                sx={{
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold',
                  color: selectedRange === range ? 'white' : '#666',
                  backgroundColor: selectedRange === range ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderRadius: 2, py: '8px', textAlign: 'center', flex: 1,
                  transition: 'all 0.2s',
                  '&:hover': { color: 'white', bgcolor: selectedRange !== range ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)' }
                }}
              >
                {range}
              </Typography>
            ))}
          </Box>
        </Box>
      </Box>
      )}

      {tabValue === 1 && (
        <Box sx={{ maxWidth: 800 }}>
            <Box sx={{ mb: 3, p: 3, bgcolor: 'rgba(41, 121, 255, 0.1)', borderRadius: 3, border: '1px solid rgba(41, 121, 255, 0.2)' }}>
                <Typography variant="body1" sx={{ color: '#2979ff' }}>
                    Bu ekran, cüzdanınıza yaptığınız para girişlerini (Deposit) baz alarak, belirlediğiniz aylık hedefi 
                    (<b>${Number(monthlyContribution).toLocaleString()}</b>) tutup tutturamadığınızı gösterir.
                </Typography>
            </Box>

            {availableYears.length === 0 ? (
                 <Typography align="center" sx={{ color: '#666', py: 4 }}>Henüz bir hedef belirlemediniz.</Typography>
            ) : (
                <>
                    <Box sx={{ mb: 3, width: 150 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="year-select-label" sx={{ color: '#a0a0a0' }}>Yıl</InputLabel>
                            <Select
                                labelId="year-select-label"
                                value={displayYear}
                                label="Yıl"
                                onChange={(e) => setSelectedYear(e.target.value)}
                                sx={{
                                    color: 'white',
                                    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2196f3' },
                                    '.MuiSvgIcon-root': { color: 'white' }
                                }}
                            >
                                {availableYears.map(year => (
                                    <MenuItem key={year} value={year}>{year}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <Box sx={{ mb: 4 }}>
                        <TableContainer component={Paper} sx={{ bgcolor: '#000000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4 }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Ay</TableCell>
                                        <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Hedeflenen</TableCell>
                                        <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Gerçekleşen (Yatırılan)</TableCell>
                                        <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Fark</TableCell>
                                        <TableCell align="center" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Durum</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {trackerData[displayYear]?.map((row: any, index: number) => (
                                        <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                            <TableCell component="th" scope="row" sx={{ color: 'white', fontWeight: 'bold' }}>
                                                {row.monthStr}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: 'white' }}>
                                                ${row.target.toLocaleString('tr-TR')}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: row.actual > 0 ? 'white' : '#666' }}>
                                                ${row.actual.toLocaleString('tr-TR')}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: row.diff >= 0 ? '#00C805' : '#FF3B30', fontWeight: 'bold' }}>
                                                {row.diff > 0 ? '+' : ''}{row.diff.toLocaleString('tr-TR')}
                                            </TableCell>
                                            <TableCell align="center">
                                                {row.isMet ? (
                                                    <CheckCircleIcon sx={{ color: '#00C805' }} />
                                                ) : (
                                                    <CancelIcon sx={{ color: '#FF3B30' }} />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </>
            )}
        </Box>
      )}

      {/* Hedef Analizi Sekmesi */}
      {tabValue === 2 && (
        <Box sx={{ maxWidth: 1000 }}>
            <Box sx={{ mb: 3, p: 3, bgcolor: 'rgba(41, 121, 255, 0.1)', borderRadius: 3, border: '1px solid rgba(41, 121, 255, 0.2)' }}>
                <Typography variant="body1" sx={{ color: '#2979ff' }}>
                    Bu tablo, her yıl için belirlediğiniz <b>Yıl Sonu Hedef Bakiyesi</b> ile o yılın sonunda gerçekleşen <b>Portföy Değerini</b> kıyaslar.
                </Typography>
            </Box>

            <TableContainer component={Paper} sx={{ bgcolor: '#000000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Yıl</TableCell>
                            <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Hedef (Yıl Sonu)</TableCell>
                            <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Gerçekleşen</TableCell>
                            <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Fark ($)</TableCell>
                            <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Fark (%)</TableCell>
                            <TableCell align="center" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Durum</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {analysisData.slice((analysisPage - 1) * 12, analysisPage * 12).map((row) => (
                            <TableRow key={row.year} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                <TableCell component="th" scope="row" sx={{ color: 'white', fontWeight: 'bold' }}>{row.year}</TableCell>
                                <TableCell align="right" sx={{ color: 'white' }}>${row.target.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                <TableCell align="right" sx={{ color: row.actual !== null ? 'white' : '#666' }}>
                                    {row.actual !== null ? `$${row.actual.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                </TableCell>
                                <TableCell align="right" sx={{ color: row.diff >= 0 ? '#00C805' : (row.actual !== null ? '#FF3B30' : '#666'), fontWeight: 'bold' }}>
                                    {row.actual !== null ? `${row.diff > 0 ? '+' : ''}$${Math.abs(row.diff).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                </TableCell>
                                <TableCell align="right" sx={{ color: row.diffPct >= 0 ? '#00C805' : (row.actual !== null ? '#FF3B30' : '#666') }}>
                                    {row.actual !== null ? `%${row.diffPct.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : '-'}
                                </TableCell>
                                <TableCell align="center">
                                    {row.status === 'success' && <CheckCircleIcon sx={{ color: '#00C805' }} titleAccess="Hedef Tuttu" />}
                                    {row.status === 'fail' && <CancelIcon sx={{ color: '#FF3B30' }} titleAccess="Hedef Tutmadı" />}
                                    {row.status === 'pending' && <AccessTimeIcon sx={{ color: '#ff9800' }} titleAccess="Devam Ediyor" />}
                                    {row.status === 'future' && <RemoveIcon sx={{ color: '#666' }} titleAccess="Gelecek" />}
                                </TableCell>
                            </TableRow>
                        ))}
                        {analysisData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ color: '#666', py: 4 }}>Görüntülenecek veri yok.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            {analysisData.length > 12 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination 
                        count={Math.ceil(analysisData.length / 12)} 
                        page={analysisPage} 
                        onChange={(_, v) => setAnalysisPage(v)}
                        sx={{ 
                            '& .MuiPaginationItem-root': { color: '#a0a0a0' },
                            '& .Mui-selected': { backgroundColor: 'rgba(255, 255, 255, 0.1) !important', color: 'white' }
                        }}
                    />
                </Box>
            )}
        </Box>
      )}

      {/* Yıllık Döküm Tablosu */}
      {tabValue === 0 && (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: 'white' }}>Yıllık Döküm</Typography>
        <TableContainer component={Paper} sx={{ bgcolor: '#000000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4 }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Year</TableCell>
                        <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Deposit</TableCell>
                        <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Interest</TableCell>
                        <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Ending Balance</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tableData.slice((breakdownPage - 1) * 10, breakdownPage * 10).map((row) => (
                        <TableRow key={row.year} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                            <TableCell component="th" scope="row" sx={{ color: 'white' }}>{row.year}</TableCell>
                            <TableCell align="right" sx={{ color: 'white' }}>${row.deposit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell align="right" sx={{ color: '#00C805' }}>${row.interest.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>${row.endingBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
        {tableData.length > 10 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination 
                    count={Math.ceil(tableData.length / 10)} 
                    page={breakdownPage} 
                    onChange={(_, v) => setBreakdownPage(v)}
                    sx={{ 
                        '& .MuiPaginationItem-root': { color: '#a0a0a0' },
                        '& .Mui-selected': { backgroundColor: 'rgba(255, 255, 255, 0.1) !important', color: 'white' }
                    }}
                />
            </Box>
        )}
      </Box>
      )}

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
                      onClick={() => handleDayClick(item.d)}
                      sx={{ 
                        width: 36, height: 36, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%', cursor: 'pointer', mx: 'auto',
                        bgcolor: item.isSelected ? '#2979ff' : 'transparent',
                        color: item.isSelected ? 'white' : (item.isToday ? '#2979ff' : 'white'),
                        fontWeight: item.isSelected || item.isToday ? 'bold' : 'normal',
                        border: item.isToday && !item.isSelected ? '1px solid #2979ff' : 'none',
                        '&:hover': { bgcolor: item.isSelected ? '#2979ff' : 'rgba(255,255,255,0.1)' }
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
                const maxYear = new Date().getFullYear();
                const isTooFar = year > maxYear;
                return (
                  <Button
                    key={year}
                    onClick={() => !isTooFar && handleYearClick(year)}
                    disabled={isTooFar}
                    sx={{ 
                      color: isTooFar ? '#666' : (year === new Date(startDate).getFullYear() ? '#2979ff' : 'white'),
                      fontWeight: year === new Date(startDate).getFullYear() ? 'bold' : 'normal',
                      bgcolor: year === new Date(startDate).getFullYear() ? 'rgba(41, 121, 255, 0.1)' : 'transparent',
                      borderRadius: 2,
                      py: 1.5,
                      '&:hover': { bgcolor: isTooFar ? 'transparent' : 'rgba(255,255,255,0.1)' },
                      cursor: isTooFar ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {year}
                  </Button>
                );
              })}
            </Box>
          )}
        </Box>
      </Dialog>

      {/* Plan Silme Onay Dialogu */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: 'white',
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: '320px'
          }
        }}
      >
        <DialogTitle sx={{ color: '#ff1744' }}>Planı Sil</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#a0a0a0' }}>
            Mevcut yatırım planınızı silmek ve varsayılan değerlere dönmek istediğinize emin misiniz?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: '#a0a0a0' }}>İptal</Button>
          <Button onClick={handleDeletePlan} variant="contained" color="error" sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}>
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}