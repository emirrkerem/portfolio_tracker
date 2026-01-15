import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Pagination from '@mui/material/Pagination';

// Icons
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SellIcon from '@mui/icons-material/Sell';
import { API_URL } from '../../config';

export default function WalletManager() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [balance, setBalance] = useState(0);
  const [balanceErrorOpen, setBalanceErrorOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Calendar State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'day' | 'year'>('day');

  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const daysShort = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
        const headers = { 'X-User-ID': String(user.id || '1') };
        const res = await fetch(`${API_URL}/api/wallet`, { headers });
        const data = await res.json();
        if (data.transactions) {
          setTransactions(data.transactions);
        }
        if (data.balance !== undefined) {
          setBalance(data.balance);
        }
      } catch (err) {
        console.error("Wallet history fetch error:", err);
      }
    };

    fetchWalletData();
    window.addEventListener('portfolio-updated', fetchWalletData);
    return () => window.removeEventListener('portfolio-updated', fetchWalletData);
  }, []);

  const handleEditClick = (tx: any) => {
    setEditMode(true);
    setEditingId(tx.id);
    setType(tx.type);
    setAmount(tx.amount.toString());
    setDate(tx.date);
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditMode(false);
    setEditingId(null);
    setAmount('');
    setDate(new Date().toISOString().slice(0, 16));
  };

  const handleDeleteClick = (id: number) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete === null) return;
    try {
      const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
      const headers = { 'X-User-ID': user.id || '1' };
      await fetch(`${API_URL}/api/wallet?id=${itemToDelete}`, {
        method: 'DELETE',
        headers
      });
      // Listeyi güncelle
      const res = await fetch(`${API_URL}/api/wallet`, { headers });
      const data = await res.json();
      if (data.transactions) {
        setTransactions(data.transactions);
      }
      window.dispatchEvent(new Event('portfolio-updated'));
    } catch (err) {
      console.error("Silme hatası:", err);
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    const today = new Date();
    const nextMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
    if (nextMonth > today) return;
    setCalendarViewDate(nextMonth);
  };

  const handlePrevYearPage = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear() - 12, calendarViewDate.getMonth(), 1));
  };
  const handleNextYearPage = () => {
    const today = new Date();
    const nextYear = calendarViewDate.getFullYear() + 12;
    if (nextYear > today.getFullYear()) return;
    setCalendarViewDate(new Date(nextYear, calendarViewDate.getMonth(), 1));
  };

  const handleYearClick = (year: number) => {
    setCalendarViewDate(new Date(year, calendarViewDate.getMonth(), 1));
    setCalendarViewMode('day');
  };

  const renderYearGrid = () => {
    const currentYear = calendarViewDate.getFullYear();
    const startYear = currentYear - 6;
    const years = [];
    for(let i=0; i<12; i++) years.push(startYear + i);
    return years;
  };

  const handleDayClick = (day: number) => {
    const current = new Date(date);
    const newDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day, current.getHours(), current.getMinutes());
    
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    const h = String(newDate.getHours()).padStart(2, '0');
    const m = String(newDate.getMinutes()).padStart(2, '0');
    setDate(`${year}-${month}-${d}T${h}:${m}`);
  };

  const handleTimeChange = (timeType: 'hour' | 'minute', val: number) => {
    const current = new Date(date);
    let h = current.getHours();
    let m = current.getMinutes();
    
    if (timeType === 'hour') h = val;
    if (timeType === 'minute') m = val;
    
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    setDate(`${year}-${month}-${d}T${hh}:${mm}`);
  };

  const renderCalendarGrid = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const grid = [];
    for(let i=0; i<startOffset; i++) grid.push(<Box key={`empty-${i}`} sx={{ width: 40, height: 40 }} />);
    
    const currentSelected = new Date(date);
    const isSameMonth = currentSelected.getMonth() === month && currentSelected.getFullYear() === year;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for(let d=1; d<=daysInMonth; d++) {
      const dateToCheck = new Date(year, month, d);
      const isFuture = dateToCheck > today;
      const isSelected = isSameMonth && currentSelected.getDate() === d;
      const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
      grid.push({ d, isSelected, isToday, isFuture });
    }
    return grid;
  };

  const handleSubmit = async () => {
    // Virgül/Nokta düzeltmesi ve Sayı kontrolü
    const normalizedAmount = amount.replace(',', '.');
    const val = Number(normalizedAmount);

    if (isNaN(val) || val <= 0) {
      alert('Lütfen geçerli bir tutar giriniz (Örn: 100 veya 10.5)');
      return;
    }

    if (type === 'WITHDRAW' && val > balance) {
      setBalanceErrorOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
      const headers = { 'Content-Type': 'application/json', 'X-User-ID': String(user.id || '1') };

      let res;
      if (editMode && editingId !== null) {
        res = await fetch(`${API_URL}/api/wallet`, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify({
            id: editingId,
            type,
            amount: val,
            date
          })
        });
      } else {
        res = await fetch(`${API_URL}/api/wallet`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            type,
            amount: val,
            date
          })
        });
      }

      if (res.ok) {
        alert('İşlem Başarıyla Kaydedildi! Sayfa güncelleniyor...');
        window.location.reload(); // Kesin çözüm: Sayfayı yenile
      } else {
        let errData;
        try {
            errData = await res.json();
        } catch {
            errData = { error: `Sunucu Hatası: ${res.status}` };
        }
        alert(`İşlem başarısız: ${errData.error || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Sunucu hatası. Backend çalışıyor mu veya internet bağlantınız var mı?');
    } finally {
      setSubmitting(false);
    }
  };

  const getTransactionLabel = (type: string) => {
    switch(type) {
      case 'DEPOSIT': return 'Para Yatırma';
      case 'WITHDRAW': return 'Para Çekme';
      case 'STOCK_BUY': return 'Hisse Satın Alma';
      case 'STOCK_SELL': return 'Hisse Satıldı';
      default: return type;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch(type) {
      case 'DEPOSIT': return <TrendingUpIcon sx={{ fontSize: 16 }} />;
      case 'WITHDRAW': return <TrendingDownIcon sx={{ fontSize: 16 }} />;
      case 'STOCK_BUY': return <ShoppingCartIcon sx={{ fontSize: 16 }} />;
      case 'STOCK_SELL': return <SellIcon sx={{ fontSize: 16 }} />;
      default: return <TrendingUpIcon sx={{ fontSize: 16 }} />;
    }
  };

  const isPositive = (type: string) => ['DEPOSIT', 'STOCK_SELL'].includes(type);

  return (
    <>
      <Button 
        variant="contained" 
        fullWidth 
        startIcon={<AccountBalanceWalletIcon />}
        onClick={() => { setEditMode(false); setOpen(true); }}
        sx={{ 
          bgcolor: 'rgba(255,255,255,0.05)', 
          color: 'white',
          py: 1.5,
          borderRadius: 3,
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 'bold',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
        }}
      >
        Bakiye Yönet / Ekle
      </Button>

      {/* Cüzdan Geçmişi Listesi */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" sx={{ color: '#a0a0a0', mb: 2, fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Son Hareketler
        </Typography>
        <List disablePadding>
          {transactions.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', py: 2, fontStyle: 'italic' }}>Henüz işlem yok.</Typography>
          ) : (
            transactions.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((tx, index) => (
                <ListItem key={index} disablePadding sx={{ py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: isPositive(tx.type) ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 82, 82, 0.1)',
                      color: isPositive(tx.type) ? '#69f0ae' : '#ff8a80',
                      border: '1px solid',
                      borderColor: isPositive(tx.type) ? 'rgba(0, 200, 83, 0.2)' : 'rgba(255, 82, 82, 0.2)'
                    }}>
                      {getTransactionIcon(tx.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={getTransactionLabel(tx.type)}
                  secondary={new Date(tx.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold', color: 'white' }}
                    secondaryTypographyProps={{ variant: 'caption', color: '#666' }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: isPositive(tx.type) ? '#69f0ae' : '#ff8a80' }}>
                      {isPositive(tx.type) ? '+' : '-'}${parseFloat(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    {/* Sadece manuel işlemler (DEPOSIT/WITHDRAW) düzenlenebilir */}
                    {['DEPOSIT', 'WITHDRAW'].includes(tx.type) && (
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditClick(tx)}
                        sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#2979ff', bgcolor: 'rgba(41, 121, 255, 0.1)' } }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteClick(tx.id)}
                      sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#ff1744', bgcolor: 'rgba(255, 23, 68, 0.1)' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
            ))
          )}
        </List>

        {transactions.length > itemsPerPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination 
              count={Math.ceil(transactions.length / itemsPerPage)} 
              page={page} 
              onChange={handlePageChange}
              size="small"
              sx={{ 
                '& .MuiPaginationItem-root': { color: '#a0a0a0' },
                '& .Mui-selected': { backgroundColor: 'rgba(255, 255, 255, 0.1) !important', color: 'white' }
              }}
            />
          </Box>
        )}
      </Box>

      <Dialog 
        open={open} 
        onClose={handleCloseDialog}
        TransitionProps={{ timeout: 400 }}
        PaperProps={{
          sx: {
            background: 'linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)',
            color: 'white',
            minWidth: '420px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
          }
        }}
      >
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid rgba(255,255,255,0.08)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ 
              bgcolor: type === 'DEPOSIT' ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 82, 82, 0.15)',
              color: type === 'DEPOSIT' ? '#69f0ae' : '#ff5252'
            }}>
              {type === 'DEPOSIT' ? <TrendingUpIcon /> : <TrendingDownIcon />}
            </Avatar>
            <Typography variant="h5" fontWeight="bold">
              {editMode ? 'İşlemi Düzenle' : (type === 'DEPOSIT' ? 'Para Yatır' : 'Para Çek')}
            </Typography>
          </Box>
          <IconButton onClick={handleCloseDialog} sx={{ color: '#a0a0a0', '&:hover': { color: 'white' } }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 3 }}>
           <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                fullWidth
                variant={type === 'DEPOSIT' ? 'contained' : 'outlined'}
                onClick={() => setType('DEPOSIT')}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  bgcolor: type === 'DEPOSIT' ? '#00c853' : 'transparent',
                  borderColor: type === 'DEPOSIT' ? 'transparent' : 'rgba(255,255,255,0.1)',
                  color: type === 'DEPOSIT' ? 'white' : '#a0a0a0',
                  '&:hover': {
                    bgcolor: type === 'DEPOSIT' ? '#00e676' : 'rgba(255,255,255,0.05)',
                    borderColor: type === 'DEPOSIT' ? 'transparent' : 'rgba(255,255,255,0.2)',
                  }
                }}
              >
                Yatır (Deposit)
              </Button>
              <Button
                fullWidth
                variant={type === 'WITHDRAW' ? 'contained' : 'outlined'}
                onClick={() => setType('WITHDRAW')}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  bgcolor: type === 'WITHDRAW' ? '#d32f2f' : 'transparent',
                  borderColor: type === 'WITHDRAW' ? 'transparent' : 'rgba(255,255,255,0.1)',
                  color: type === 'WITHDRAW' ? 'white' : '#a0a0a0',
                  '&:hover': {
                    bgcolor: type === 'WITHDRAW' ? '#f44336' : 'rgba(255,255,255,0.05)',
                    borderColor: type === 'WITHDRAW' ? 'transparent' : 'rgba(255,255,255,0.2)',
                  }
                }}
              >
                Çek (Withdraw)
              </Button>
           </Box>

           <TextField
              label="Tutar ($)"
              type="number"
              fullWidth
              variant="filled"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (['+', '-', 'e', 'E'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              inputProps={{ min: 0 }}
              InputProps={{ 
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton 
                      size="small"
                      onClick={() => setAmount(prev => Math.max(0, (parseFloat(prev) || 0) - 100).toString())}
                      sx={{ color: '#a0a0a0', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' } }}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small"
                      onClick={() => setAmount(prev => ((parseFloat(prev) || 0) + 100).toString())}
                      sx={{ color: '#a0a0a0', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' } }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ 
                mb: 3,
                '& .MuiFilledInput-root': { 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  borderRadius: 2,
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.08)' },
                  pl: 1.5, pr: 1.5
                },
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& input[type=number]': { MozAppearance: 'textfield' },
                '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
              }}
            />

            <Box 
              onClick={() => {
                setCalendarViewDate(new Date(date));
                setIsDatePickerOpen(true);
                setCalendarViewMode('day');
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                p: '10px 16px',
                cursor: 'pointer',
                border: '1px solid transparent',
                transition: 'all 0.2s',
                mb: 3,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <CalendarTodayIcon sx={{ color: '#2979ff' }} />
              <Box>
                <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', lineHeight: 1 }}>İşlem Tarihi</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>
                  {new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} 
                  {' • '}
                  {new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            </Box>

            <Paper elevation={0} sx={{ 
              p: 2.5, 
              bgcolor: type === 'DEPOSIT' ? 'rgba(0, 200, 83, 0.08)' : 'rgba(255, 82, 82, 0.08)', 
              borderRadius: 3,
              border: type === 'DEPOSIT' ? '1px solid rgba(0, 200, 83, 0.2)' : '1px solid rgba(255, 82, 82, 0.2)',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 0.5 }}>
                  {type === 'DEPOSIT' ? 'Yatırılacak Tutar' : 'Çekilecek Tutar'}
                </Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ color: type === 'DEPOSIT' ? '#69f0ae' : '#ff5252' }}>
                  ${(parseFloat(amount) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                variant="contained" 
                sx={{ 
                  bgcolor: type === 'DEPOSIT' ? '#00c853' : '#d32f2f',
                  color: 'white',
                  fontWeight: 'bold',
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  boxShadow: type === 'DEPOSIT' ? '0 4px 12px rgba(0, 200, 83, 0.4)' : '0 4px 12px rgba(211, 47, 47, 0.4)',
                  '&:hover': {
                    bgcolor: type === 'DEPOSIT' ? '#00e676' : '#f44336',
                  }
                }}
              >
                {submitting ? 'İŞLENİYOR...' : (editMode ? 'GÜNCELLE' : 'ONAYLA')}
              </Button>
            </Paper>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={isDatePickerOpen} 
        onClose={() => setIsDatePickerOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: 'white',
            borderRadius: 3,
            p: 1,
            minWidth: '320px'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={calendarViewMode === 'day' ? handlePrevMonth : handlePrevYearPage} sx={{ color: 'white' }}><ChevronLeftIcon /></IconButton>
            <Typography 
              variant="h6" 
              fontWeight="bold" 
              onClick={() => setCalendarViewMode(calendarViewMode === 'day' ? 'year' : 'day')}
              sx={{ cursor: 'pointer', '&:hover': { color: '#2979ff' }, transition: 'color 0.2s' }}
            >
              {calendarViewMode === 'day' 
                ? `${months[calendarViewDate.getMonth()]} ${calendarViewDate.getFullYear()}`
                : `${calendarViewDate.getFullYear()}`
              }
            </Typography>
            <IconButton onClick={calendarViewMode === 'day' ? handleNextMonth : handleNextYearPage} sx={{ color: 'white' }}><ChevronRightIcon /></IconButton>
          </Box>

          {calendarViewMode === 'day' ? (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1, textAlign: 'center' }}>
                {daysShort.map(d => (
                  <Typography key={d} variant="caption" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>{d}</Typography>
                ))}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 1 }}>
                {renderCalendarGrid().map((item: any, i) => (
                  item.d ? (
                    <Box 
                      key={i} 
                      onClick={() => !item.isFuture && handleDayClick(item.d)}
                      sx={{ 
                        width: 36, height: 36, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%', mx: 'auto',
                        bgcolor: item.isSelected && !item.isFuture ? '#2979ff' : 'transparent',
                        color: item.isFuture ? '#444' : (item.isSelected ? 'white' : (item.isToday ? '#2979ff' : 'white')),
                        fontWeight: item.isSelected || item.isToday ? 'bold' : 'normal',
                        border: item.isToday && !item.isSelected ? '1px solid #2979ff' : 'none',
                        cursor: item.isFuture ? 'default' : 'pointer',
                        '&:hover': { bgcolor: item.isFuture ? 'transparent' : (item.isSelected ? '#2979ff' : 'rgba(255,255,255,0.1)') }
                      }}
                    >
                      {item.d}
                    </Box>
                  ) : <Box key={i} />
                ))}
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, py: 1 }}>
              {renderYearGrid().map((year) => {
                const isFutureYear = year > new Date().getFullYear();
                return (
                  <Button
                    key={year}
                    onClick={() => !isFutureYear && handleYearClick(year)}
                    disabled={isFutureYear}
                    sx={{ 
                      color: isFutureYear ? '#444' : (year === new Date(date).getFullYear() ? '#2979ff' : 'white'),
                      fontWeight: year === new Date(date).getFullYear() ? 'bold' : 'normal',
                      bgcolor: year === new Date(date).getFullYear() ? 'rgba(41, 121, 255, 0.1)' : 'transparent',
                      borderRadius: 2,
                      py: 1.5,
                      '&:hover': { bgcolor: isFutureYear ? 'transparent' : 'rgba(255,255,255,0.1)' }
                    }}
                  >
                    {year}
                  </Button>
                );
              })}
            </Box>
          )}

          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Select
                value={new Date(date).getHours()}
                onChange={(e) => handleTimeChange('hour', Number(e.target.value))}
                size="small"
                MenuProps={{ PaperProps: { sx: { maxHeight: 200, bgcolor: '#2a2a2a', color: 'white' } } }}
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, width: 70 }}
              >
                {Array.from({ length: 24 }).map((_, i) => <MenuItem key={i} value={i}>{String(i).padStart(2, '0')}</MenuItem>)}
              </Select>
              <Typography>:</Typography>
              <Select
                value={new Date(date).getMinutes()}
                onChange={(e) => handleTimeChange('minute', Number(e.target.value))}
                size="small"
                MenuProps={{ PaperProps: { sx: { maxHeight: 200, bgcolor: '#2a2a2a', color: 'white' } } }}
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }, width: 70 }}
              >
                {Array.from({ length: 60 }).map((_, i) => <MenuItem key={i} value={i}>{String(i).padStart(2, '0')}</MenuItem>)}
              </Select>
            </Box>
            
            <Button variant="contained" onClick={() => setIsDatePickerOpen(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>Tamam</Button>
          </Box>
        </Box>
      </Dialog>

      {/* Silme Onay Dialogu */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: 'white',
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: '320px'
          }
        }}
      >
        <DialogTitle sx={{ color: '#ff1744' }}>İşlemi Sil</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#a0a0a0' }}>
            Bu cüzdan işlemini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: '#a0a0a0' }}>İptal</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}>
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Yetersiz Bakiye Uyarısı */}
      <Dialog
        open={balanceErrorOpen}
        onClose={() => setBalanceErrorOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            color: 'white',
            borderRadius: 3,
            border: '1px solid rgba(255, 82, 82, 0.3)',
            minWidth: '320px',
            textAlign: 'center',
            p: 1
          }
        }}
      >
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255, 82, 82, 0.15)', color: '#ff5252', width: 56, height: 56 }}>
            <ErrorOutlineIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h6" fontWeight="bold" sx={{ color: '#ff5252' }}>
            Yetersiz Bakiye
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1 }}>
            Çekmek istediğiniz tutar mevcut bakiyenizden fazla.
          </Typography>
          
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', p: 2, borderRadius: 2, width: '100%', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Çekilecek Tutar:</Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ color: 'white' }}>${Number(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Mevcut Bakiye:</Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ color: '#ff5252' }}>${balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </Box>
          </Box>

          <Button variant="contained" fullWidth onClick={() => setBalanceErrorOpen(false)} sx={{ bgcolor: '#ff5252', color: 'white', fontWeight: 'bold', borderRadius: 2, '&:hover': { bgcolor: '#d32f2f' } }}>TAMAM</Button>
        </Box>
      </Dialog>
    </>
  );
}
