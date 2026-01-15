import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TuneIcon from '@mui/icons-material/Tune';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../../config';

const drawerWidth = 88;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
        if (!user.id) return;
        
        const headers = { 'X-User-ID': String(user.id) };
        const res = await fetch(`${API_URL}/api/friends/requests`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
          setRequestCount(data.length);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // 10 saniyede bir kontrol et
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { path: '/', icon: <CandlestickChartIcon sx={{ fontSize: 28 }} />, label: 'Piyasalar' },
    { path: '/watchlist', icon: <VisibilityIcon sx={{ fontSize: 28 }} />, label: 'İzleme Listesi' },
    { path: '/portfolio', icon: <AccountBalanceWalletIcon sx={{ fontSize: 28 }} />, label: 'Portföy' },
    { path: '/comparison', icon: <AutoGraphIcon sx={{ fontSize: 28 }} />, label: 'İçgörüler' },
    { path: '/target', icon: <TrackChangesIcon sx={{ fontSize: 28 }} />, label: 'Hedefler' },
    { path: '/friends', icon: <GroupIcon sx={{ fontSize: 28 }} />, label: 'Arkadaşlar' },
    { path: '/settings', icon: <TuneIcon sx={{ fontSize: 28 }} />, label: 'Ayarlar' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('borsa_user');
    // Cache temizliği
    localStorage.removeItem('portfolio_view_cache');
    localStorage.removeItem('target_view_cache');
    // Sayfayı yenile (App.tsx state'i sıfırlanır ve Login'e atar)
    window.location.href = '/login';
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { 
          width: drawerWidth, 
          boxSizing: 'border-box',
          backgroundColor: '#000000',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2
        },
      }}
    >
      <Toolbar /> {/* Navbar'ın altında kalması için boşluk */}
      <Box sx={{ overflow: 'hidden', width: '100%', mt: 2 }}>
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
                <Tooltip title={item.label} placement="right" arrow>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      minHeight: 56,
                      width: 56,
                      mx: 'auto',
                      justifyContent: 'center',
                      borderRadius: '16px',
                      backgroundColor: isActive ? 'rgba(41, 121, 255, 0.1)' : 'transparent',
                      color: isActive ? '#2979ff' : '#757575',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: isActive ? 'rgba(41, 121, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: isActive ? '#2979ff' : '#ffffff',
                        transform: 'translateY(-2px)'
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        justifyContent: 'center',
                        color: 'inherit'
                      }}
                    >
                      {item.path === '/friends' && requestCount > 0 ? (
                        <Badge badgeContent={requestCount} color="error">
                          {item.icon}
                        </Badge>
                      ) : (
                        item.icon
                      )}
                    </ListItemIcon>
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
        
        {/* Çıkış Yap Butonu (En altta) */}
        <Box sx={{ mt: 'auto', mb: 2, width: '100%' }}>
          <Tooltip title="Çıkış Yap" placement="right" arrow>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                minHeight: 56,
                width: 56,
                mx: 'auto',
                justifyContent: 'center',
                borderRadius: '16px',
                color: '#ff1744',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 23, 68, 0.1)',
                  transform: 'translateY(-2px)'
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', color: 'inherit' }}>
                <LogoutIcon sx={{ fontSize: 28 }} />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        </Box>
      </Box>
    </Drawer>
  );
}