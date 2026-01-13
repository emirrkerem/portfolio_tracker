import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Alert from '@mui/material/Alert';

export default function SettingsView() {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/reset', { method: 'POST' });
      if (res.ok) {
        setSuccess(true);
        setOpen(false);
        // Sayfayı yenilemek iyi olabilir verilerin temizlendiğini görmek için
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError('Sıfırlama başarısız oldu.');
      }
    } catch (err) {
      setError('Sunucu hatası.');
    }
  };

  return (
    <Box sx={{ p: 3, pt: '90px', minHeight: '100vh', bgcolor: 'black', color: 'white' }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>Ayarlar</Typography>

      <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', maxWidth: 600 }}>
        <Typography variant="h6" sx={{ color: '#FF3B30', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteForeverIcon /> Tehlikeli Bölge
        </Typography>
        <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 3 }}>
          Bu işlem, portföyünüzdeki tüm hisse senedi işlemlerini, cüzdan geçmişini (para giriş/çıkış) ve hedeflerinizi kalıcı olarak silecektir. Bu işlem geri alınamaz.
        </Typography>
        
        <Button 
          variant="contained" 
          color="error" 
          onClick={() => setOpen(true)}
          startIcon={<DeleteForeverIcon />}
        >
          Bütün Verileri Sil
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mt: 3, maxWidth: 600 }}>
          Veriler başarıyla silindi. Sayfa yenileniyor...
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3, maxWidth: 600 }}>
          {error}
        </Alert>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { bgcolor: '#1a1a1a', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ color: '#FF3B30' }}>Emin misiniz?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#a0a0a0' }}>
            Tüm verileriniz silinecek ve sıfırlanacaktır. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ color: 'white' }}>İptal</Button>
          <Button onClick={handleReset} color="error" variant="contained" autoFocus>
            Evet, Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}