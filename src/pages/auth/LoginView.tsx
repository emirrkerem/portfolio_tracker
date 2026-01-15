import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';
import { API_URL } from '../../config';

export default function LoginView({ onLogin }: { onLogin: (user: any) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      setError('Sunucu hatası. Backend çalışıyor mu?');
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
          <Button type="submit" fullWidth variant="contained" size="large" sx={{ bgcolor: '#2979ff', fontWeight: 'bold', py: 1.5, borderRadius: 2 }}>
            Giriş Yap
          </Button>
        </form>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#888' }}>
            Hesabınız yok mu? <Link to="/register" style={{ color: '#2979ff', textDecoration: 'none', fontWeight: 'bold' }}>Kayıt Ol</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
