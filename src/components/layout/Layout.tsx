import Box from '@mui/material/Box';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import Toolbar from '@mui/material/Toolbar';

export default function Layout() {
  return (
    <>
      <Navbar />
      <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        <Sidebar />
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: 0, 
            m: 0, 
            ml: 0,
            pl: 0,
            minWidth: 0,
          }}
        >
          <Toolbar /> {/* Navbar'ın altında kalan kısmı boş bırakmak için */}
          <Box sx={{ p: 0, m: 0, ml: 0, pl: 0, width: '100%', minWidth: 0 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </>
  );
}