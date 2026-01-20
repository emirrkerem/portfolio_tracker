// c:\Users\emirk\Desktop\borsa-app-client\src\components\portfolio\PortfolioHistoryChart.tsx
import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { API_URL } from '../../config';

export default function PortfolioHistoryChart() {
  // 1. Tüm Hook'lar en üstte
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'value' | 'profit'>('profit');
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [currentInvested, setCurrentInvested] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState('ALL');
  const [walletStats, setWalletStats] = useState({ deposited: 0, withdrawn: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Hover State'leri
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [hoveredInvested, setHoveredInvested] = useState<number | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoveredWithdrawal, setHoveredWithdrawal] = useState<number | null>(null);
  const [hoveredDeposit, setHoveredDeposit] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = JSON.parse(sessionStorage.getItem('borsa_user') || '{}');
        const headers = { 'X-User-ID': String(user.id || '1') };
        const res = await fetch(`${API_URL}/api/portfolio/history`, { headers });
        const json = await res.json();
        if (Array.isArray(json)) {
          // Gelecek tarihli verileri filtrele
          const now = new Date();
          const validData = json.filter((d: any) => new Date(d.date) <= now);
          setData(validData);
          if (validData.length > 0) {
            setCurrentValue(validData[validData.length - 1].value);
            setCurrentInvested(validData[validData.length - 1].invested);
          }
        }
      } catch (error) {
        console.error("Portfolio history fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    window.addEventListener('portfolio-updated', fetchData);
    window.addEventListener('wallet-updated', fetchData);
    return () => {
      window.removeEventListener('portfolio-updated', fetchData);
      window.removeEventListener('wallet-updated', fetchData);
    };
  }, []);

  // Cüzdan İstatistiklerini Çek (Toplam Yatırılan/Çekilen)
  useEffect(() => {
    const fetchWalletStats = async () => {
      try {
        const user = JSON.parse(sessionStorage.getItem('borsa_user') || '{}');
        const headers = { 'X-User-ID': String(user.id || '1') };
        const res = await fetch(`${API_URL}/api/wallet`, { headers });
        const data = await res.json();
        if (data.transactions) {
          setTransactions(data.transactions);
          let dep = 0;
          let wid = 0;
          data.transactions.forEach((t: any) => {
            if (t.type === 'DEPOSIT') dep += Number(t.amount);
            if (t.type === 'WITHDRAW') wid += Number(t.amount);
            // STOCK_BUY ve STOCK_SELL buraya dahil edilmez, sadece manuel işlemler
          });
          setWalletStats({ deposited: dep, withdrawn: wid });
        }
      } catch (err) {
        console.error("Wallet stats error:", err);
      }
    };
    fetchWalletStats();
    window.addEventListener('wallet-updated', fetchWalletStats);
    return () => window.removeEventListener('wallet-updated', fetchWalletStats);
  }, []);

  const handleViewChange = (_: React.MouseEvent<HTMLElement>, newView: 'value' | 'profit') => {
    if (newView !== null) {
      setViewMode(newView);
    }
  };

  // 1. Tüm Veriyi İşle (TWR ve Kar Hesapla)
  const fullChartData = useMemo(() => {
    let cumulativeTwr = 1.0;
    
    return data.map((d, i) => {
      // Değerlerin sayı olduğundan emin ol
      const val = Number(d.value) || 0;
      const inv = Number(d.invested) || 0;

      // Withdrawal kontrolü (Tarih eşleşmesi)
      const dateStr = d.date.split('T')[0];
      const withdrawalTx = transactions.find((t: any) => t.type === 'WITHDRAW' && t.date.startsWith(dateStr));
      const withdrawalAmount = withdrawalTx ? Number(withdrawalTx.amount) : null;

      // Deposit kontrolü
      const depositTx = transactions.find((t: any) => t.type === 'DEPOSIT' && t.date.startsWith(dateStr));
      const depositAmount = depositTx ? Number(depositTx.amount) : null;

      if (i > 0) {
        const prev = data[i-1];
        const prevVal = Number(prev.value) || 0;
        const prevInv = Number(prev.invested) || 0;
        
        const cashFlow = inv - prevInv;
        
        // TWR Hesabı (Sıfıra bölme hatasını önle)
        if (prevVal > 0) {
           const periodReturn = (val - cashFlow - prevVal) / prevVal;
           cumulativeTwr *= (1 + periodReturn);
        }
      }
      
      return {
        ...d,
        value: val,
        invested: inv,
        displayValue: viewMode === 'value' ? val : (val - inv),
        twr: (cumulativeTwr - 1) * 100,
        withdrawal: withdrawalAmount,
        deposit: depositAmount
      };
    });
  }, [data, viewMode, transactions]);

  // 2. Seçilen Tarih Aralığına Göre Filtrele
  const chartData = useMemo(() => {
    if (fullChartData.length === 0) return [];
    if (selectedRange === 'ALL') return fullChartData;

    const lastDate = new Date(fullChartData[fullChartData.length - 1].date);
    let startDate = new Date(lastDate);

    switch (selectedRange) {
      case '1H': startDate.setDate(lastDate.getDate() - 7); break;
      case '1A': startDate.setMonth(lastDate.getMonth() - 1); break;
      case '3A': startDate.setMonth(lastDate.getMonth() - 3); break;
      case '6A': startDate.setMonth(lastDate.getMonth() - 6); break;
      case '1Y': startDate.setFullYear(lastDate.getFullYear() - 1); break;
      case 'YTD': startDate = new Date(lastDate.getFullYear(), 0, 1); break;
      default: return fullChartData;
    }

    return fullChartData.filter(d => new Date(d.date) >= startDate);
  }, [fullChartData, selectedRange]);

  // Mouse Hareketleri
  const handleMouseMove = (e: any) => {
    if (e.activePayload && e.activePayload.length > 0) {
      const d = e.activePayload[0].payload;
      setHoveredValue(d.value);
      setHoveredInvested(d.invested);
      setHoveredDate(d.date);
      setHoveredWithdrawal(d.withdrawal);
      setHoveredDeposit(d.deposit);
    }
  };

  const handleMouseLeave = () => {
    setHoveredValue(null);
    setHoveredInvested(null);
    setHoveredDate(null);
    setHoveredWithdrawal(null);
    setHoveredDeposit(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // Eğer tarih stringi saat içeriyorsa (T veya boşluk varsa ve uzunsa) saati de göster
      const hasTime = dateStr.includes(' ') || dateStr.includes('T');
      return date.toLocaleString('tr-TR', { 
        day: 'numeric', month: 'long', year: 'numeric',
        hour: hasTime ? '2-digit' : undefined,
        minute: hasTime ? '2-digit' : undefined
      });
    } catch {
      return dateStr;
    }
  };

  // Hesaplamalar
  const displayVal = hoveredValue ?? currentValue ?? 0;
  const displayInv = hoveredInvested ?? currentInvested ?? 0;
  
  const currentTwrItem = hoveredDate 
    ? chartData.find(d => d.date === hoveredDate) 
    : (chartData.length > 0 ? chartData[chartData.length - 1] : null);
    
  const displayTwr = currentTwrItem ? currentTwrItem.twr : 0;

  const totalProfit = displayVal - displayInv;
  const isProfit = totalProfit >= 0;
  
  // Grafik Rengi (Başlangıca göre)
  const startDisplayValue = chartData.length > 0 ? chartData[0].displayValue : 0;
  const currentDisplayValue = viewMode === 'value' ? displayVal : totalProfit;
  const isChartProfit = currentDisplayValue >= startDisplayValue;
  const chartColor = viewMode === 'value' ? '#2979ff' : (isChartProfit ? '#00C805' : '#FF3B30');

  // Gradient Offset (Güvenli)
  const gradientOffset = () => {
    if (chartData.length === 0) return 0;
    
    // NaN değerleri filtrele
    const values = chartData.map((i) => i.displayValue).filter(v => !isNaN(v));
    if (values.length === 0) return 0;

    const dataMax = Math.max(...values);
    const dataMin = Math.min(...values);
  
    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
    if (dataMax === dataMin) return 0; // Sıfıra bölmeyi önle
  
    return dataMax / (dataMax - dataMin);
  };
  
  const off = gradientOffset();

  // Custom Dot for Withdrawals
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    return (
      <g>
        {payload.deposit && <circle cx={cx} cy={cy} r={5} fill="#00C805" stroke="white" strokeWidth={2} />}
        {payload.withdrawal && <circle cx={cx} cy={cy} r={5} fill="#FF3B30" stroke="white" strokeWidth={2} />}
      </g>
    );
  };

  // 2. Erken Return (Loading veya Boş Veri)
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (data.length === 0) return null;

  // Artık walletStats.withdrawn sadece manuel çekimleri içeriyor
  const netInflow = walletStats.deposited - walletStats.withdrawn;

  return (
    <>
    {/* Bilgi Paneli (Toplam Yatırılan / Çekilen) */}
    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
      <Box sx={{ flex: 1, bgcolor: 'black', p: 2.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 0.5 }}>Toplam Yatırılan</Typography>
        <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
          ${walletStats.deposited.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Typography>
      </Box>
      
      <Box sx={{ flex: 1, bgcolor: 'black', p: 2.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 0.5 }}>Toplam Çekilen</Typography>
        <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
          ${walletStats.withdrawn.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, bgcolor: 'black', p: 2.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 0.5 }}>Net Nakit Girişi</Typography>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#2196f3' }}>
          ${netInflow.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Typography>
      </Box>
    </Box>

    <Box sx={{ width: '100%', height: 450, mb: 4, p: 3, bgcolor: 'black', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#a0a0a0' }}>
            {viewMode === 'value' ? 'Toplam Portföy Değeri' : 'Toplam Kar/Zarar'}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ color: viewMode === 'value' ? 'white' : (isProfit ? '#00C805' : '#FF3B30'), display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
            {viewMode === 'value' 
              ? `$${displayVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `${isProfit ? '+' : ''}$${totalProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
            <Typography 
              component="span" 
              variant="h6" 
              fontWeight="bold" 
              sx={{ color: (viewMode === 'value' ? totalProfit : displayTwr) >= 0 ? '#00C805' : '#FF3B30', ml: 2 }}
            >
              {viewMode === 'value' ? (
                <>{totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
              ) : (
                <>({displayTwr >= 0 ? '+' : ''}{displayTwr.toFixed(2)}%)</>
              )}
            </Typography>
          </Typography>
          
          <Typography variant="body2" sx={{ color: '#a0a0a0', mt: 0.5, height: '20px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 2 }}>
            <span>{hoveredDate ? formatDate(hoveredDate) : ' '}</span>
            {hoveredWithdrawal && (
              <span style={{ color: '#FF3B30', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255, 59, 48, 0.1)', padding: '0 6px', borderRadius: '4px' }}>
                <TrendingDownIcon sx={{ fontSize: 14 }} /> 
                Withdrawal: -${hoveredWithdrawal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            )}
            {hoveredDeposit && (
              <span style={{ color: '#00C805', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(0, 200, 5, 0.1)', padding: '0 6px', borderRadius: '4px' }}>
                <TrendingUpIcon sx={{ fontSize: 14 }} /> 
                Deposit: +${hoveredDeposit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          size="small"
          sx={{ 
            bgcolor: 'rgba(255,255,255,0.05)',
            '& .MuiToggleButton-root': { 
              color: '#a0a0a0',
              border: '1px solid rgba(255,255,255,0.1)',
              textTransform: 'none',
              px: 2,
              '&.Mui-selected': { color: 'white', bgcolor: 'rgba(255,255,255,0.15)' }
            }
          }}
        >
          <ToggleButton value="profit">P&L</ToggleButton>
          <ToggleButton value="value">Net Worth</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Box sx={{ flex: 1, minHeight: 0, mb: 2 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={chartData} 
          onMouseMove={handleMouseMove} 
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="portColorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
            </linearGradient>

            <linearGradient id="investedColor" x1="0" y1="0" x2="0" y2="1">
               <stop offset="5%" stopColor="#2196f3" stopOpacity={0.2}/>
               <stop offset="95%" stopColor="#2196f3" stopOpacity={0}/>
            </linearGradient>
            
            <linearGradient id="portSplitColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset={off} stopColor="#00C805" stopOpacity={0.2} />
              <stop offset={off} stopColor="#FF3B30" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="portSplitStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset={off} stopColor="#00C805" stopOpacity={1} />
              <stop offset={off} stopColor="#FF3B30" stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip 
            content={<></>} 
            cursor={{ stroke: '#a0a0a0', strokeWidth: 1, strokeDasharray: '3 3' }} 
            isAnimationActive={false}
          />
          
          {viewMode === 'profit' && <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />}
          
          <Area 
            type="monotone" 
            dataKey="displayValue" 
            stroke={viewMode === 'value' ? chartColor : "url(#portSplitStroke)"} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={viewMode === 'value' ? "url(#portColorValue)" : "url(#portSplitColor)"} 
            isAnimationActive={false}
            dot={<CustomDot />}
          />
        </AreaChart>
      </ResponsiveContainer>
      </Box>

      {/* Tarih Aralığı Seçici */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between',
        width: '100%', border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px', p: 0.5
      }}>
        {['1H', '1A', '3A', '6A', 'YTD', '1Y', 'ALL'].map((range) => (
          <Typography
            key={range}
            onClick={() => setSelectedRange(range)}
            sx={{
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold',
              color: selectedRange === range ? '#000' : '#888',
              backgroundColor: selectedRange === range ? '#fff' : 'transparent',
              borderRadius: '6px', py: '6px', textAlign: 'center', flex: 1,
              transition: 'all 0.2s',
              '&:hover': { color: selectedRange === range ? '#000' : '#fff', bgcolor: selectedRange !== range ? 'rgba(255,255,255,0.1)' : '#fff' }
            }}
          >
            {range}
          </Typography>
        ))}
      </Box>
    </Box>
    </>
  );
}
