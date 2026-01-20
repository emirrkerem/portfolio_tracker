import { useState, useEffect, useMemo } from 'react';
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
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import Pagination from '@mui/material/Pagination';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import { API_URL } from '../../config';
import { deleteTransaction } from '../../services/portfolioService';

interface Transaction {
  id: number;
  symbol: string;
  quantity: number;
  price: number;
  totalCost: number;
  totalCommission: number;
  date: string;
  type: 'BUY' | 'SELL';
  profit?: number;
  profitPercent?: number;
}

export default function HistoryView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const itemsPerPage = 10;

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

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDeleteClick = (id: number) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete !== null) {
      await deleteTransaction(itemToDelete);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      fetchTransactions(); // Listeyi yenile
      // Portföyü güncellemek için event tetikle
      window.dispatchEvent(new Event('portfolio-updated'));
    }
  };

  // Kar/Zarar Hesaplama Mantığı (Ortalama Maliyet Yöntemi)
  const transactionsWithProfit = useMemo(() => {
    // Hesaplama için eskiden yeniye sırala
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const inventory: Record<string, { quantity: number; totalCost: number }> = {};

    const calculated = sorted.map(tx => {
      const sym = tx.symbol;
      if (!inventory[sym]) inventory[sym] = { quantity: 0, totalCost: 0 };
      
      let profit = undefined;
      let profitPercent = undefined;

      const qty = Number(tx.quantity);
      const comm = Number(tx.totalCommission);
      const total = Number(tx.totalCost); // price * qty

      if (tx.type === 'BUY') {
        // Alış: Envantere ekle (Maliyet = Tutar + Komisyon)
        inventory[sym].quantity += qty;
        inventory[sym].totalCost += total + comm;
      } else if (tx.type === 'SELL') {
        // Satış: Kar hesapla
        if (inventory[sym].quantity > 0) {
          const avgCost = inventory[sym].totalCost / inventory[sym].quantity;
          const costOfSold = avgCost * qty;
          const revenue = total - comm; // Net gelir (Tutar - Komisyon)
          
          profit = revenue - costOfSold;
          profitPercent = (profit / costOfSold) * 100;
          
          // Envanterden düş
          inventory[sym].quantity -= qty;
          inventory[sym].totalCost -= costOfSold;
          
          if (inventory[sym].quantity < 0.000001) {
             inventory[sym].quantity = 0;
             inventory[sym].totalCost = 0;
          }
        }
      }
      return { ...tx, profit, profitPercent };
    });

    // Gösterim için yeniden eskiye sırala ve filtrele
    return calculated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).filter(tx => 
      tx.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return transactionsWithProfit.slice(start, start + itemsPerPage);
  }, [transactionsWithProfit, page]);

  const totalPages = Math.ceil(transactionsWithProfit.length / itemsPerPage);

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <Box sx={{ 
      p: 4, 
      pt: '90px', 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)', 
      color: 'white' 
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4, flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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

        {/* Arama Kutusu */}
        <TextField
          placeholder="Sembol Ara..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#666' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            bgcolor: 'rgba(255,255,255,0.05)',
            borderRadius: 2,
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
              '&.Mui-focused fieldset': { borderColor: '#2979ff' },
            },
            minWidth: 250
          }}
        />
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
              <TableCell align="right" sx={{ color: '#666', fontWeight: 'bold', py: 2.5 }}>KAR/ZARAR</TableCell>
              <TableCell align="right" sx={{ color: '#666', fontWeight: 'bold', py: 2.5 }}>İŞLEM</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ color: '#666', py: 8 }}>
                  <HistoryIcon sx={{ fontSize: 48, mb: 2, opacity: 0.2 }} />
                  <Typography>Henüz işlem kaydı bulunmuyor.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map((row, index) => (
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
                  <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {row.type === 'SELL' && row.profit !== undefined ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Typography variant="body2" sx={{ color: row.profit >= 0 ? '#00e676' : '#ff1744', fontWeight: 'bold' }}>
                          {row.profit >= 0 ? '+' : ''}${Math.abs(row.profit).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                        <Typography variant="caption" sx={{ color: row.profit >= 0 ? 'rgba(0, 230, 118, 0.7)' : 'rgba(255, 23, 68, 0.7)' }}>
                          %{row.profitPercent?.toFixed(2)}
                        </Typography>
                      </Box>
                    ) : <Typography variant="body2" sx={{ color: '#666' }}>-</Typography>}
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <IconButton 
                      onClick={() => handleDeleteClick(row.id)}
                      size="small" 
                      sx={{ color: '#ef5350', bgcolor: 'rgba(239, 83, 80, 0.1)', '&:hover': { bgcolor: 'rgba(239, 83, 80, 0.2)' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange}
            color="primary"
            sx={{ 
              '& .MuiPaginationItem-root': { color: '#a0a0a0' },
              '& .Mui-selected': { backgroundColor: 'rgba(41, 121, 255, 0.2) !important', color: 'white' }
            }}
          />
        </Box>
      )}

      {/* Silme Onay Dialogu */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{ sx: { bgcolor: '#1e1e1e', color: 'white', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ color: '#ff1744' }}>İşlemi Sil</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#a0a0a0' }}>Bu işlemi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: '#a0a0a0' }}>İptal</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}>Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}