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
        const res = await fetch(`${API_URL}/api/transactions`);
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
    <Box sx={{ p: 3, pt: '80px', minHeight: '100vh', bgcolor: '#1a1a1a', color: 'white' }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>İşlem Geçmişi</Typography>
      
      <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'white' }}>
        <Table sx={{ minWidth: 650 }} aria-label="transaction history table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Tarih</TableCell>
              <TableCell sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Sembol</TableCell>
              <TableCell sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>İşlem</TableCell>
              <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Adet</TableCell>
              <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Fiyat</TableCell>
              <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Toplam Tutar</TableCell>
              <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Komisyon</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ color: '#a0a0a0', py: 3 }}>
                  Henüz işlem kaydı bulunmuyor.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((row, index) => (
                <TableRow
                  key={index}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                >
                  <TableCell component="th" scope="row" sx={{ color: 'white' }}>
                    {row.date}
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{row.symbol}</TableCell>
                  <TableCell>
                    <Chip 
                      label={row.type === 'BUY' ? 'ALIŞ' : 'SATIŞ'} 
                      size="small"
                      sx={{ 
                        bgcolor: row.type === 'BUY' ? 'rgba(0, 200, 83, 0.2)' : 'rgba(255, 82, 82, 0.2)',
                        color: row.type === 'BUY' ? '#69f0ae' : '#ff8a80',
                        fontWeight: 'bold'
                      }} 
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>{row.quantity}</TableCell>
                  <TableCell align="right" sx={{ color: 'white' }}>${row.price.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>${row.totalCost.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: '#a0a0a0' }}>${row.totalCommission.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}