import { useState, useEffect, useMemo, Fragment } from 'react';
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Collapse from '@mui/material/Collapse';
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

interface Trade {
  id: string;
  symbol: string;
  status: 'OPEN' | 'CLOSED';
  startDate: string;
  endDate?: string;
  totalProfit: number;
  totalCommission: number;
  transactions: Transaction[];
  netQuantity: number;
  avgPrice: number;
}

// Tekil Satır Bileşeni (Grup ve Detayları Yönetir)
function TradeRow({ trade, onDelete }: { trade: Trade, onDelete: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const isProfit = trade.totalProfit >= 0;

  return (
    <Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }} onClick={() => setOpen(!open)}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" sx={{ color: '#a0a0a0' }}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row" sx={{ color: 'white', fontWeight: 'bold' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={`${API_URL}/logos/${trade.symbol}.png`} sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>{trade.symbol.substring(0, 2)}</Avatar>
            {trade.symbol}
          </Box>
        </TableCell>
        <TableCell align="right" sx={{ color: '#a0a0a0' }}>
          {new Date(trade.startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </TableCell>
        <TableCell align="center">
          <Chip 
            label={trade.status === 'OPEN' ? 'AÇIK' : 'KAPALI'} 
            size="small" 
            sx={{ 
              bgcolor: trade.status === 'OPEN' ? 'rgba(41, 121, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)', 
              color: trade.status === 'OPEN' ? '#2979ff' : '#a0a0a0',
              fontWeight: 'bold', border: '1px solid', borderColor: trade.status === 'OPEN' ? 'rgba(41, 121, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'
            }} 
          />
        </TableCell>
        <TableCell align="right" sx={{ color: 'white' }}>{trade.transactions.length} İşlem</TableCell>
        <TableCell align="right" sx={{ color: isProfit ? '#00e676' : '#ff1744', fontWeight: 'bold' }}>
          {trade.status === 'CLOSED' || trade.totalProfit !== 0 ? (
            `${isProfit ? '+' : ''}$${Math.abs(trade.totalProfit).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ) : '-'}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2, ml: 9, p: 3, bgcolor: 'rgba(20,20,20,0.5)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.2)' }}>
              <Typography variant="caption" sx={{ color: '#666', mb: 2, display: 'block', fontWeight: 'bold', letterSpacing: '1px', fontSize: '0.7rem' }}>
                İŞLEM GEÇMİŞİ & DETAYLAR
              </Typography>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#888', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>TARİH</TableCell>
                    <TableCell sx={{ color: '#888', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>TİP</TableCell>
                    <TableCell align="right" sx={{ color: '#888', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>ADET</TableCell>
                    <TableCell align="right" sx={{ color: '#888', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>FİYAT</TableCell>
                    <TableCell align="right" sx={{ color: '#888', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>TOPLAM</TableCell>
                    <TableCell align="right" sx={{ color: '#888', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>KAR/ZARAR</TableCell>
                    <TableCell align="right" sx={{ color: '#888', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>İŞLEM</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trade.transactions.map((tx) => (
                    <TableRow key={tx.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                      <TableCell component="th" scope="row" sx={{ color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                        {new Date(tx.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Chip 
                          label={tx.type === 'BUY' ? 'ALIŞ' : 'SATIŞ'} 
                          size="small" 
                          sx={{ 
                            height: 20, 
                            fontSize: '0.65rem', 
                            fontWeight: 'bold',
                            bgcolor: tx.type === 'BUY' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 23, 68, 0.1)',
                            color: tx.type === 'BUY' ? '#00e676' : '#ff1744',
                            border: '1px solid',
                            borderColor: tx.type === 'BUY' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 23, 68, 0.2)'
                          }} 
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>{tx.quantity}</TableCell>
                      <TableCell align="right" sx={{ color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>${tx.price.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>${tx.totalCost.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: (tx.profit || 0) >= 0 ? '#00e676' : '#ff1744', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {tx.type === 'SELL' && tx.profit !== undefined ? `$${tx.profit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <IconButton onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }} size="small" sx={{ color: '#ef5350', opacity: 0.7, '&:hover': { opacity: 1, bgcolor: 'rgba(239, 83, 80, 0.1)' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </Fragment>
  );
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
      const user = JSON.parse(sessionStorage.getItem('borsa_user') || '{}');
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
    if (!Array.isArray(transactions)) return [];

    // Hesaplama için eskiden yeniye sırala
    const sorted = [...transactions].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
    const inventory: Record<string, { quantity: number; totalCost: number }> = {};

    const calculated = sorted.map(tx => {
      const sym = tx.symbol || 'UNKNOWN';
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
          profitPercent = costOfSold !== 0 ? (profit / costOfSold) * 100 : 0;
          
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
    return calculated.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    }).filter(tx => 
      (tx.symbol || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );
  }, [transactions, searchTerm]);

  // --- YENİ: Trade (Pozisyon) Gruplama Mantığı ---
  const trades = useMemo(() => {
    if (!transactionsWithProfit.length) return [];

    // İşlemleri eskiden yeniye sırala (Kronolojik akış için)
    const sortedTx = [...transactionsWithProfit].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const resultTrades: Trade[] = [];
    const openTrades: Record<string, Trade> = {};

    sortedTx.forEach(tx => {
        let trade = openTrades[tx.symbol];

        if (!trade) {
            // Yeni pozisyon başlat
            trade = {
                id: `trade-${tx.symbol}-${tx.date}-${Math.random().toString(36).substr(2, 9)}`,
                symbol: tx.symbol,
                status: 'OPEN',
                startDate: tx.date,
                totalProfit: 0,
                totalCommission: 0,
                transactions: [],
                netQuantity: 0,
                avgPrice: 0
            };
            openTrades[tx.symbol] = trade;
            resultTrades.push(trade);
        }

        // İşlemi trade'e ekle
        trade.transactions.push(tx);
        trade.totalCommission += Number(tx.totalCommission);
        
        const qty = Number(tx.quantity);
        if (tx.type === 'BUY') trade.netQuantity += qty;
        else {
            trade.netQuantity -= qty;
            if (tx.profit !== undefined) trade.totalProfit += tx.profit;
        }

        // Pozisyon kapandı mı? (Toleranslı kontrol)
        if (Math.abs(trade.netQuantity) < 0.000001) {
            trade.status = 'CLOSED';
            trade.endDate = tx.date;
            delete openTrades[tx.symbol]; // Listeden çıkar, sonraki işlem yeni trade açsın
        }
    });

    // Gösterim için: Yeniden eskiye sırala (En son açılan/kapanan en üstte)
    return resultTrades.sort((a, b) => {
         const dateA = a.endDate ? new Date(a.endDate).getTime() : new Date(a.transactions[a.transactions.length-1].date).getTime();
         const dateB = b.endDate ? new Date(b.endDate).getTime() : new Date(b.transactions[b.transactions.length-1].date).getTime();
         return dateB - dateA;
    });
  }, [transactionsWithProfit]);

  const paginatedTrades = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return trades.slice(start, start + itemsPerPage);
  }, [trades, page]);

  const totalPages = Math.ceil(trades.length / itemsPerPage);

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
              Pozisyon Geçmişi
            </Typography>
            <Typography variant="body2" sx={{ color: '#888' }}>
              Gruplandırılmış alım-satım pozisyonlarınız.
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
              <TableCell />
              <TableCell sx={{ color: '#666', fontWeight: 'bold', py: 2 }}>SEMBOL</TableCell>
              <TableCell align="right" sx={{ color: '#666', fontWeight: 'bold', py: 2 }}>BAŞLANGIÇ</TableCell>
              <TableCell align="center" sx={{ color: '#666', fontWeight: 'bold', py: 2 }}>DURUM</TableCell>
              <TableCell align="right" sx={{ color: '#666', fontWeight: 'bold', py: 2 }}>İŞLEM SAYISI</TableCell>
              <TableCell align="right" sx={{ color: '#666', fontWeight: 'bold', py: 2 }}>TOPLAM KAR/ZARAR</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTrades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: '#666', py: 8 }}>
                  <HistoryIcon sx={{ fontSize: 48, mb: 2, opacity: 0.2 }} />
                  <Typography>Henüz işlem kaydı bulunmuyor.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTrades.map((trade) => (
                <TradeRow key={trade.id} trade={trade} onDelete={handleDeleteClick} />
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