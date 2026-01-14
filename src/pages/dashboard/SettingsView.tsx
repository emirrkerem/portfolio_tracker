import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Alert from '@mui/material/Alert';

export default function SettingsView() {
  const [openReset, setOpenReset] = useState(false);
  const [openWatchlist, setOpenWatchlist] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const handleReset = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/reset', { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('Veriler başarıyla silindi. Sayfa yenileniyor...');
        setOpenReset(false);
        // Sayfayı yenilemek iyi olabilir verilerin temizlendiğini görmek için
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError('Sıfırlama başarısız oldu.');
      }
    } catch (err) {
      setError('Sunucu hatası.');
    }
  };

  const handleClearWatchlist = () => {
    localStorage.removeItem('borsa_watchlist');
    window.dispatchEvent(new Event('watchlist-updated'));
    setSuccessMsg('İzleme listesi temizlendi.');
    setOpenWatchlist(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <Box sx={{ p: 3, pt: '90px', minHeight: '100vh', bgcolor: 'black', color: 'white' }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>Ayarlar</Typography>

      {/* Tehlikeli Bölge - Tüm Verileri Sil */}
      <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', maxWidth: 600, mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#FF3B30', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteForeverIcon /> Tehlikeli Bölge
        </Typography>
        <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 3 }}>
          Bu işlem, portföyünüzdeki tüm hisse senedi işlemlerini, cüzdan geçmişini (para giriş/çıkış) ve hedeflerinizi kalıcı olarak silecektir. Bu işlem geri alınamaz.
        </Typography>
        
        <Button 
          variant="contained" 
          color="error" 
          onClick={() => setOpenReset(true)}
          startIcon={<DeleteForeverIcon />}
        >
          Bütün Verileri Sil
        </Button>
      </Box>

      {/* İzleme Listesi Ayarları */}
      <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', maxWidth: 600 }}>
        <Typography variant="h6" sx={{ color: '#2979ff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisibilityOffIcon /> İzleme Listesi
        </Typography>
        <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 3 }}>
          İzleme listenizdeki tüm sembolleri temizler. Bu işlem sadece yerel tarayıcı verilerini siler, portföyünüzü etkilemez.
        </Typography>
        
        <Button 
          variant="contained" 
          sx={{ bgcolor: '#2979ff', '&:hover': { bgcolor: '#1565c0' } }}
          onClick={() => setOpenWatchlist(true)}
          startIcon={<VisibilityOffIcon />}
        >
          Listeyi Temizle
        </Button>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mt: 3, maxWidth: 600 }}>
          {successMsg}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3, maxWidth: 600 }}>
          {error}
        </Alert>
      )}

      {/* Reset Dialog */}
      <Dialog
        open={openReset}
        onClose={() => setOpenReset(false)}
        PaperProps={{ sx: { bgcolor: '#1a1a1a', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ color: '#FF3B30' }}>Emin misiniz?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#a0a0a0' }}>
            Tüm verileriniz silinecek ve sıfırlanacaktır. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReset(false)} sx={{ color: 'white' }}>İptal</Button>
          <Button onClick={handleReset} color="error" variant="contained" autoFocus>
            Evet, Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Watchlist Dialog */}
      <Dialog
        open={openWatchlist}
        onClose={() => setOpenWatchlist(false)}
        PaperProps={{ sx: { bgcolor: '#1a1a1a', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ color: '#2979ff' }}>İzleme Listesini Temizle</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#a0a0a0' }}>
            İzleme listenizdeki tüm semboller kaldırılacak. Devam etmek istiyor musunuz?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWatchlist(false)} sx={{ color: 'white' }}>İptal</Button>
          <Button onClick={handleClearWatchlist} variant="contained" sx={{ bgcolor: '#2979ff', '&:hover': { bgcolor: '#1565c0' } }} autoFocus>
            Evet, Temizle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}