import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import HistoryIcon from '@mui/icons-material/History';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { API_URL } from '../../config';

interface Transaction {
  symbol: string;
  quantity: number;
  price: number;
  totalCost: number;
  totalCommission: number;
  date: string;
  type: 'BUY' | 'SELL';
}

export default function HistoryView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
        const headers = { 'X-User-ID': String(user.id || '1') };
        const res = await fetch(`${API_URL}/api/transactions`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
          setTransactions(data);
        }
      } catch (error) {
        console.error("İşlem geçmişi alınamadı:", error);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <Box sx={{ 
      p: 4, 
      pt: '90px', 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)', 
      color: 'white' 
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Avatar sx={{ bgcolor: 'rgba(41, 121, 255, 0.1)', color: '#2979ff', width: 56, height: 56 }}>
          <HistoryIcon fontSize="large" />
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-1px' }}>
            İşlem Geçmişi
          </Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>
            Tüm alım ve satım işlemlerinizin detaylı listesi.
          </Typography>
        </Box>
      </Box>
      
      <TableContainer component={Paper} sx={{ 
        bgcolor: 'rgba(255,255,255,0.03)', 
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 4,
        overflow: 'hidden'
      }}>
        <Table sx={{ minWidth: 650 }} aria-label="transaction history table">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
              <TableCell sx={{ color: '#666', fontWeight: 'bold', py: 2.5, pl: 4 }}>SEMBOL</TableCell>
              <TableCell sx={{ color: '#666', fontWeight: 'bold', py: 2.5 }}>TARİH</TableCell>
              <TableCell sx={{ color: '#666', fontWeight: 'bold', py: 2.5 }}>İŞLEM TİPİ</TableCell>
              <TableCell align="right" sx={{ color: '#666', fontWeight: 'bold', py: 2.5 }}>ADET</TableCell>
              <TableCell align="right" sx={{ color: '#666', fontWeight: 'bold', py: 2.5 }}>BİRİM FİYAT</TableCell>
              <TableCell align="right" sx={{ color: '#666', fontWeight: 'bold', py: 2.5 }}>TOPLAM TUTAR</TableCell>
              <TableCell align="right" sx={{ color: '#666', fontWeight: 'bold', py: 2.5, pr: 4 }}>KOMİSYON</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ color: '#666', py: 8 }}>
                  <HistoryIcon sx={{ fontSize: 48, mb: 2, opacity: 0.2 }} />
                  <Typography>Henüz işlem kaydı bulunmuyor.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((row, index) => (
                <TableRow
                  key={index}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 }, 
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                    transition: 'background-color 0.2s'
                  }}
                >
                  <TableCell component="th" scope="row" sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', pl: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={`${API_URL}/logos/${row.symbol}.png`} 
                        sx={{ 
                          width: 40, height: 40, 
                          bgcolor: 'rgba(255,255,255,0.05)', 
                          fontSize: '0.8rem',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        {row.symbol.substring(0, 2)}
                      </Avatar>
                      <Box>
                        <Typography fontWeight="bold" variant="body1">{row.symbol}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#a0a0a0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {new Date(row.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Chip 
                      icon={row.type === 'BUY' ? <TrendingUpIcon sx={{ '&&': { color: 'inherit' } }} /> : <TrendingDownIcon sx={{ '&&': { color: 'inherit' } }} />}
                      label={row.type === 'BUY' ? 'ALIŞ' : 'SATIŞ'} 
                      size="small"
                      sx={{ 
                        bgcolor: row.type === 'BUY' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 23, 68, 0.1)',
                        color: row.type === 'BUY' ? '#00e676' : '#ff1744',
                        fontWeight: 'bold',
                        border: '1px solid',
                        borderColor: row.type === 'BUY' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 23, 68, 0.2)',
                        pl: 0.5
                      }} 
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {row.quantity.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    ${row.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    ${row.totalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#888', borderBottom: '1px solid rgba(255,255,255,0.05)', pr: 4 }}>
                    ${row.totalCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}