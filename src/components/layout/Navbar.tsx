import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { alpha } from '@mui/material/styles';
import { useStocks } from '../../context/StocksContext';

export default function Navbar() {
  const { stocks } = useStocks();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [filteredStocks, setFilteredStocks] = useState<typeof stocks>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search bar dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchOpen]);

  // Search değeri değiştiğinde filtrele
  useEffect(() => {
    if (searchValue.trim() === '') {
      setFilteredStocks([]);
      return;
    }

    const query = searchValue.toLowerCase();
    const filtered = stocks
      .filter(
        (stock) =>
          stock.symbol.toLowerCase().startsWith(query) ||
          stock.name.toLowerCase().startsWith(query)
      )
      .slice(0, 10); // İlk 10 sonucu göster

    setFilteredStocks(filtered);
  }, [searchValue, stocks]);

  const handleSearchClick = () => {
    setSearchOpen(true);
  };

  const handleStockSelect = (symbol: string) => {
    setSearchValue('');
    setSearchOpen(false);
    navigate(`/market/${symbol}`);
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div">
          Borsa Uygulaması
        </Typography>
        
        <Box
          ref={searchRef}
          sx={{
            position: 'relative',
            width: searchOpen ? '540px' : '340px',
            transition: 'width 0.3s ease',
          }}
        >
          {searchOpen ? (
            <Paper
              sx={{
                position: 'absolute',
                top: '-12px',
                left: 0,
                width: '540px',
                height: '210px',
                overflow: 'auto',
                zIndex: 1300,
                backgroundColor: 'background.paper',
                boxShadow: 6,
                border: '1px solid #1976d2',
                padding: '10px',
              }}
            >
              {/* Search bar açılan bar'ın içinde */}
              <Box
                onClick={handleSearchClick}
                sx={{
                  borderRadius: '20px',
                  backgroundColor: (theme) => alpha(theme.palette.common.black, 0.05),
                  '&:hover': {
                    backgroundColor: (theme) => alpha(theme.palette.common.black, 0.10),
                  },
                  width: '100%',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  cursor: 'text',
                  marginBottom: '10px',
                }}
              >
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20, marginRight: '8px' }} />
                <InputBase
                  placeholder="Ara..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onClick={handleSearchClick}
                  autoFocus
                  sx={{
                    color: 'text.primary',
                    flex: 1,
                    textAlign: 'left',
                    '& .MuiInputBase-input': {
                      padding: 0,
                      fontSize: '14px',
                      height: '32px',
                      textAlign: 'left',
                      cursor: 'text',
                      '&::placeholder': {
                        textAlign: 'left',
                        opacity: 0.7,
                      },
                    },
                  }}
                />
              </Box>

              {/* Results */}
              {filteredStocks.length > 0 ? (
                <List dense>
                  {filteredStocks.map((stock) => (
                    <ListItem
                      key={stock.symbol}
                      disablePadding
                    >
                      <ListItemButton
                        onClick={() => handleStockSelect(stock.symbol)}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                          borderRadius: 1,
                        }}
                      >
                        <ListItemText
                          primary={stock.symbol}
                          secondary={stock.name}
                          primaryTypographyProps={{
                            sx: { fontWeight: 'bold', color: 'text.primary' },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box
                  sx={{
                    padding: 2,
                    textAlign: 'center',
                    color: 'text.secondary',
                  }}
                >
                  {searchValue.trim() === '' 
                    ? 'Hisse ara...' 
                    : 'Sonuç bulunamadı'}
                </Box>
              )}
            </Paper>
          ) : (
            <Box
              onClick={handleSearchClick}
              sx={{
                position: 'relative',
                borderRadius: '20px',
                backgroundColor: alpha('#fff', 0.15),
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.25),
                },
                width: '340px',
                height: '27px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingLeft: '8px',
                paddingRight: '8px',
                cursor: 'text',
              }}
            >
              <SearchIcon sx={{ color: 'white', fontSize: 18, marginRight: '6px' }} />
              <InputBase
                placeholder="Ara..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onClick={handleSearchClick}
                sx={{
                  color: 'white',
                  flex: 1,
                  textAlign: 'center',
                  '& .MuiInputBase-input': {
                    padding: 0,
                    fontSize: '14px',
                    height: '27px',
                    textAlign: 'center',
                    cursor: 'text',
                    '&::placeholder': {
                      textAlign: 'center',
                      opacity: 0.7,
                    },
                  },
                }}
              />
            </Box>
          )}
        </Box>
        
        <Box sx={{ width: '120px' }} /> {/* Sağ taraf için boş alan */}
      </Toolbar>
    </AppBar>
  );
}
