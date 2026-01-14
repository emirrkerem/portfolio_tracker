import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import { CssBaseline, Box, AppBar, Toolbar, InputBase, List, ListItemText, Paper, ClickAwayListener, ListItemButton, IconButton } from '@mui/material';
import { ThemeProvider, createTheme, styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

// Context
import { StocksProvider } from './context/StocksContext';

// Layout
import Sidebar from './components/layout/Sidebar';

// Page Views
import ComparisonView from './pages/comparison/ComparisonView';
import DashboardView from './pages/dashboard/DashboardView';
import WatchlistView from './pages/dashboard/WatchlistView';
import StockDetailView from './pages/dashboard/StockDetailView';
import PortfolioView from './pages/Portfolio/PortfolioView';
import HistoryView from './pages/dashboard/HistoryView';
import SettingsView from './pages/dashboard/SettingsView';
import TargetView from './pages/target/TargetView';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

// Arama Kutusu Bileşenleri
const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: 24,
  backgroundColor: alpha(theme.palette.common.white, 0.05),
  border: '1px solid rgba(255, 255, 255, 0.1)',
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.1),
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  marginLeft: 0,
  width: '100%',
  transition: 'all 0.2s ease-in-out',
  [theme.breakpoints.up('sm')]: {
    width: 'auto',
    minWidth: '300px',
  },
  // Focus durumunda veya yazı varken sola kaydır
  '&:focus-within, &.has-value': {
    '& .search-icon-wrapper': {
      left: 0,
      transform: 'translateX(0)',
    },
    '& .search-placeholder': {
      opacity: 0,
      width: 0,
      marginLeft: 0,
      overflow: 'hidden',
    },
    '& .MuiInputBase-input': {
      textAlign: 'left',
      paddingLeft: `calc(1em + ${theme.spacing(4)})`,
      [theme.breakpoints.up('md')]: {
        width: '35ch',
      },
    }
  }
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#a0a0a0',
  transition: 'all 0.3s ease',
  zIndex: 1,
  // Varsayılan: Ortala
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'fit-content',
}));

const SearchPlaceholder = styled('span')(({ theme }) => ({
  marginLeft: theme.spacing(1),
  transition: 'all 0.3s ease',
  whiteSpace: 'nowrap',
  opacity: 1,
  display: 'inline-block',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5, 1, 1.5, 0),
    // Varsayılan: Ortala
    textAlign: 'center',
    paddingLeft: 0,
    transition: 'all 0.3s ease',
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '25ch',
      '&:focus': {
        width: '35ch',
      },
    },
  },
}));

function MainLayout() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

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
      console.log(`Logo fetch requested for: ${symbol}`);
      fetch('http://localhost:5000/api/logo/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      })
      .then(res => {
        if (!res.ok) console.error("Logo fetch failed on server:", res.status);
      })
      .catch(err => console.error("Logo fetch network error:", err));
    }
    setWatchlist(newWatchlist);
    localStorage.setItem('borsa_watchlist', JSON.stringify(newWatchlist));
    // Diğer bileşenlerin güncellenmesi için event tetikle
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 1) {
        fetch(`http://localhost:5000/api/search?q=${query}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setResults(data);
              setShowResults(true);
            }
          })
          .catch(err => console.error(err));
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleResultClick = (symbol: string) => {
    navigate(`/market/${symbol}`);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'rgba(0, 0, 0, 0.7)', // Yarı saydam modern siyah
          backdropFilter: 'blur(12px)',   // Buzlu cam efekti
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ justifyContent: 'center' }}>
          <ClickAwayListener onClickAway={() => setShowResults(false)}>
            <Search ref={searchRef} className={query.length > 0 ? 'has-value' : ''}>
              <SearchIconWrapper className="search-icon-wrapper">
                <SearchIcon />
                <SearchPlaceholder className="search-placeholder">Ara…</SearchPlaceholder>
              </SearchIconWrapper>
              <StyledInputBase
                placeholder=""
                inputProps={{ 'aria-label': 'search' }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (results.length > 0) setShowResults(true); }}
              />
              {showResults && results.length > 0 && (
                <Paper sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 1,
                  bgcolor: '#1e1e1e',
                  color: 'white',
                  zIndex: 9999,
                  maxHeight: 400,
                  overflowY: 'auto',
                  borderRadius: 2,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <List disablePadding>
                    {results.map((item) => (
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
                        <IconButton 
                          onClick={(e) => toggleWatchlist(item.symbol, e)}
                          size="small"
                          sx={{ 
                            color: watchlist.includes(item.symbol) ? '#2979ff' : '#a0a0a0',
                            '&:hover': { color: '#2979ff', bgcolor: 'rgba(41, 121, 255, 0.08)' },
                            ml: 1
                          }}
                        >
                          {watchlist.includes(item.symbol) ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                        </IconButton>
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>
              )}
            </Search>
          </ClickAwayListener>
        </Toolbar>
      </AppBar>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: '#000000', minHeight: '100vh', width: '100%' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

function App() {
  // Heartbeat: Uygulama acik oldugu surece backend'e "ben buradayim" sinyali gonder
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('http://localhost:5000/api/heartbeat', { method: 'POST' })
        .catch(() => { 
          // Hata olursa sessizce gec (Backend kapanmis olabilir)
        });
    }, 2000); // 2 saniyede bir sinyal

    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <StocksProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="watchlist" element={<WatchlistView />} />
            <Route path="portfolio" element={<PortfolioView />} />
            <Route path="comparison" element={<ComparisonView />} />
            <Route path="target" element={<TargetView />} />
            <Route path="history" element={<HistoryView />} />
            <Route path="settings" element={<SettingsView />} />
            <Route path="market/:symbol" element={<StockDetailView />} />
          </Route>
        </Routes>
      </StocksProvider>
    </ThemeProvider>
  );
}

export default App;
