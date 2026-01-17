import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';
import { API_URL } from '../../config';

export default function LoginView({ onLogin }: { onLogin: (user: any) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Şifre Sıfırlama State'leri
  const [openForgot, setOpenForgot] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email Gir, 2: Kod ve Yeni Şifre Gir
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState({ type: '', text: '' });

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok) {
        onLogin(data.user);
        navigate('/');
      } else {
        setError(data.error || 'Giriş başarısız.');
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError('Sunucu hatası. Backend çalışıyor mu?');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setResetMsg({ type: '', text: '' });
    try {
      const res = await fetch(`${API_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setResetMsg({ type: 'success', text: data.message });
        setResetStep(2);
      } else {
        setResetMsg({ type: 'error', text: data.error || 'Hata oluştu.' });
      }
    } catch (err) {
      setResetMsg({ type: 'error', text: 'Sunucu hatası.' });
    }
  };

  const handleResetConfirm = async () => {
    setResetMsg({ type: '', text: '' });
    try {
      const res = await fetch(`${API_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setResetMsg({ type: 'success', text: 'Şifreniz güncellendi. Giriş yapabilirsiniz.' });
        setTimeout(() => { setOpenForgot(false); setResetStep(1); }, 2000);
      } else {
        setResetMsg({ type: 'error', text: data.error || 'Hata oluştu.' });
      }
    } catch (err) {
      setResetMsg({ type: 'error', text: 'Sunucu hatası.' });
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000', p: 2 }}>
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%', bgcolor: '#111', color: 'white', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(41, 121, 255, 0.1)', borderRadius: '50%', mb: 2, color: '#2979ff' }}>
            <CandlestickChartIcon sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h5" fontWeight="bold">Hoş Geldiniz</Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>BorsaApp hesabınıza giriş yapın</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Kullanıcı Adı"
            fullWidth
            variant="filled"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2, '& .MuiFilledInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: 'white' }, '& .MuiInputLabel-root': { color: '#888' } }}
          />
          <TextField
            label="Şifre"
            type="password"
            fullWidth
            variant="filled"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3, '& .MuiFilledInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: 'white' }, '& .MuiInputLabel-root': { color: '#888' } }}
          />
          <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ bgcolor: '#2979ff', fontWeight: 'bold', py: 1.5, borderRadius: 2, mb: 2 }}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </Button>
        </form>

        <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography 
            variant="body2" 
            onClick={() => setOpenForgot(true)}
            sx={{ color: '#888', cursor: 'pointer', '&:hover': { color: '#2979ff' } }}
          >
            Şifremi Unuttum
          </Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>
            Hesabınız yok mu? <Link to="/register" style={{ color: '#2979ff', textDecoration: 'none', fontWeight: 'bold' }}>Kayıt Ol</Link>
          </Typography>
        </Box>
      </Paper>

      {/* Şifre Sıfırlama Dialog */}
      <Dialog open={openForgot} onClose={() => setOpenForgot(false)} PaperProps={{ sx: { bgcolor: '#1a1a1a', color: 'white', minWidth: 350 } }}>
        <DialogTitle>Şifre Sıfırlama</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#a0a0a0', mb: 2 }}>
            {resetStep === 1 
              ? "Kayıtlı e-posta adresinizi girin. Size bir doğrulama kodu göndereceğiz." 
              : "E-postanıza (veya masaüstünüze) gelen kodu ve yeni şifrenizi girin."}
          </DialogContentText>
          
          {resetMsg.text && (
            <Alert severity={resetMsg.type as any} sx={{ mb: 2 }}>{resetMsg.text}</Alert>
          )}

          {resetStep === 1 ? (
            <TextField
              autoFocus
              label="E-posta Adresi"
              type="email"
              fullWidth
              variant="filled"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              sx={{ '& .MuiFilledInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: 'white' }, '& .MuiInputLabel-root': { color: '#888' } }}
            />
          ) : (
            <>
              <TextField
                label="Doğrulama Kodu"
                fullWidth
                variant="filled"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                sx={{ mb: 2, '& .MuiFilledInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: 'white' }, '& .MuiInputLabel-root': { color: '#888' } }}
              />
              <TextField
                label="Yeni Şifre"
                type="password"
                fullWidth
                variant="filled"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                sx={{ '& .MuiFilledInput-root': { bgcolor: 'rgba(255,255,255,0.05)', color: 'white' }, '& .MuiInputLabel-root': { color: '#888' } }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenForgot(false)} sx={{ color: '#888' }}>İptal</Button>
          {resetStep === 1 ? (
            <Button onClick={handleSendCode} variant="contained">Kod Gönder</Button>
          ) : (
            <Button onClick={handleResetConfirm} variant="contained" color="success">Şifreyi Güncelle</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
