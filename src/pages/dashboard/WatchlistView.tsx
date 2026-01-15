import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { API_URL } from '../../config';

const parseValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || val === 'N/A') return -Infinity;
  const str = String(val);
  const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
  if (str.includes('T')) return num * 1e12;
  if (str.includes('B')) return num * 1e9;
  if (str.includes('M')) return num * 1e6;
  return num;
};

export default function WatchlistView() {
  const navigate = useNavigate();
  // Varsayılan olarak birkaç hisse ile başlat, varsa localStorage'dan al
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('borsa_watchlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [marketData, setMarketData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'EQUITY' | 'ETF'>('EQUITY');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'cap', direction: 'desc' });

  // Dışarıdan (örn: Arama kutusundan) yapılan değişiklikleri dinle
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

  // Watchlist değiştiğinde verileri çek
  useEffect(() => {
    if (watchlist.length > 0) {
      fetch(`${API_URL}/api/market?symbols=${watchlist.join(',')}`)
        .then(res => res.json())
        .then(data => {
            if(Array.isArray(data)) {
                // Sıralamayı watchlist sırasına göre yap (API karışık dönebilir)
                const sortedData = watchlist.map(symbol => 
                    data.find(item => item.symbol === symbol)
                ).filter(item => item !== undefined);
                setMarketData(sortedData);
            }
        })
        .catch(err => console.error(err));

      // İzleme listesindeki hisseler için logo kontrolü yap (Eksikse çeker)
      watchlist.forEach(symbol => {
        fetch(`${API_URL}/api/logo/fetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol })
        }).catch(() => {});
      });
    } else {
        setMarketData([]);
    }
  }, [watchlist]);

  const handleRemove = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Satıra tıklamayı engelle
    const newWatchlist = watchlist.filter(s => s !== symbol);
    setWatchlist(newWatchlist);
    localStorage.setItem('borsa_watchlist', JSON.stringify(newWatchlist));
    window.dispatchEvent(new Event('watchlist-updated'));
  };

  const filteredData = marketData.filter(item => {
    if (activeTab === 'EQUITY') return item.quoteType === 'EQUITY';
    if (activeTab === 'ETF') return item.quoteType === 'ETF';
    return true;
  });

  const handleRequestSort = (property: string) => {
    const isDefault = sortConfig.key === 'cap' && sortConfig.direction === 'desc';
    
    // Eğer varsayılan durumdaysak ve CAP'e tıklandıysa, tersine (Asc) çevir
    if (isDefault && property === 'cap') {
        setSortConfig({ key: 'cap', direction: 'asc' });
        return;
    }

    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === property) {
        if (sortConfig.direction === 'asc') {
            direction = 'desc';
        } else {
            direction = null; // 3. tıklamada varsayılana dön
        }
    }
    
    if (direction === null) {
        setSortConfig({ key: 'cap', direction: 'desc' }); // Varsayılan: CAP Desc
    } else {
        setSortConfig({ key: property, direction });
    }
  };

  const sortedData = useMemo(() => {
    const data = [...filteredData];
    data.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'cap' || sortConfig.key === 'ytd') {
          aValue = parseValue(aValue);
          bValue = parseValue(bValue);
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
           return aValue.localeCompare(bValue) * (sortConfig.direction === 'asc' ? 1 : -1);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [filteredData, sortConfig]);

  return (
    <Box sx={{ 
      width: '100%', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#000000', 
      color: 'white',
      pt: '64px'
    }}>
      <Box sx={{ display: 'flex', flex: 1, width: '100%' }}>
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          p: 4 
        }}>

      {/* Tab Butonları - Piyasalar Tarzı */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        {/* Üst Çizgi */}
        <Box sx={{ width: '100%', height: '1px', bgcolor: 'rgba(255, 255, 255, 0.12)' }} />
        
        <Box sx={{ display: 'flex', gap: 2, py: 1.5 }}>
            <Button 
                onClick={() => setActiveTab('EQUITY')}
                sx={{ 
                    color: activeTab === 'EQUITY' ? '#2979ff' : '#a0a0a0',
                    fontWeight: activeTab === 'EQUITY' ? 'bold' : 'normal',
                    textTransform: 'none',
                    minWidth: 'auto',
                    px: 2,
                    '&:hover': { bgcolor: 'transparent', color: '#2979ff' }
                }}
            >
                Hisseler (Stocks)
            </Button>
            <Button 
                onClick={() => setActiveTab('ETF')}
                sx={{ 
                    color: activeTab === 'ETF' ? '#2979ff' : '#a0a0a0',
                    fontWeight: activeTab === 'ETF' ? 'bold' : 'normal',
                    textTransform: 'none',
                    minWidth: 'auto',
                    px: 2,
                    '&:hover': { bgcolor: 'transparent', color: '#2979ff' }
                }}
            >
                ETF
            </Button>
        </Box>

        {/* Alt Çizgi */}
        <Box sx={{ width: '100%', height: '1px', bgcolor: 'rgba(255, 255, 255, 0.12)' }} />
      </Box>

      <Table size="small" sx={{ width: '100%' }}>
            <TableHead>
              <TableRow>
                <TableCell onClick={() => handleRequestSort('symbol')} sx={{ color: '#a0a0a0', fontWeight: 'bold', cursor: 'pointer' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    SYMBOL
                    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                      <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'symbol' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                      <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'symbol' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right" onClick={() => handleRequestSort('price')} sx={{ color: '#a0a0a0', fontWeight: 'bold', cursor: 'pointer' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    PRICE
                    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                      <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'price' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                      <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'price' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right" onClick={() => handleRequestSort('change')} sx={{ color: '#a0a0a0', fontWeight: 'bold', cursor: 'pointer' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    CHANGE
                    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                      <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'change' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                      <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'change' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right" onClick={() => handleRequestSort('pctChange')} sx={{ color: '#a0a0a0', fontWeight: 'bold', cursor: 'pointer' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    %CHANGE
                    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                      <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'pctChange' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                      <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'pctChange' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right" onClick={() => handleRequestSort('cap')} sx={{ color: '#a0a0a0', fontWeight: 'bold', cursor: 'pointer' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    CAP
                    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                      <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'cap' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                      <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'cap' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right" onClick={() => handleRequestSort('ytd')} sx={{ color: '#a0a0a0', fontWeight: 'bold', cursor: 'pointer' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    YTD
                    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                      <ArrowDropUpIcon sx={{ fontSize: 20, mb: -0.5, color: sortConfig.key === 'ytd' && sortConfig.direction === 'asc' ? 'white' : '#555' }} />
                      <ArrowDropDownIcon sx={{ fontSize: 20, mt: -0.5, color: sortConfig.key === 'ytd' && sortConfig.direction === 'desc' ? 'white' : '#555' }} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>REMOVE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData.map((row) => (
                <TableRow 
                  key={row.symbol} 
                  hover 
                  onClick={() => navigate(`/market/${row.symbol}`)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={`${API_URL}/logos/${row.symbol}.png`} 
                        sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}
                      >
                        {row.symbol.substring(0, 2)}
                      </Avatar>
                      <Box>
                        <Typography fontWeight="bold" color="white">{row.symbol}</Typography>
                        <Typography variant="caption" sx={{ color: '#a0a0a0' }}>{row.name || row.symbol}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>${row.price?.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: row.change >= 0 ? '#00e676' : '#ff1744' }}>
                    {row.change > 0 ? '+' : ''}{row.change?.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: row.pctChange >= 0 ? '#00e676' : '#ff1744' }}>
                    {row.pctChange > 0 ? '+' : ''}{row.pctChange?.toFixed(2)}%
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>{row.cap || 'N/A'}</TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      color: (row.ytd && parseFloat(row.ytd.replace('%', '')) > 0) ? '#00e676' : (row.ytd && parseFloat(row.ytd.replace('%', '')) < 0) ? '#ff1744' : 'white' 
                    }}
                  >
                    {row.ytd || 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                        size="small" 
                        onClick={(e) => handleRemove(row.symbol, e)}
                        sx={{ color: '#a0a0a0', '&:hover': { color: '#ff1744' } }}
                    >
                        <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {marketData.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#666' }}>
                        İzleme listeniz boş. Yukarıdan sembol ekleyebilirsiniz.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        {/* Dikey Ayırıcı Çizgi */}
        <Box sx={{ 
          width: '1px', 
          bgcolor: 'rgba(255, 255, 255, 0.12)',
          my: 4, 
          mx: 2 
        }} />

        {/* Sağ Panel (Boşluk) */}
        <Box sx={{ width: '400px', minWidth: '400px' }} />
      </Box>
    </Box>
  );
}
