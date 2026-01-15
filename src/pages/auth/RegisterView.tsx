import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export default function RegisterView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.error || 'Kayıt başarısız.');
      }
    } catch (err) {
      setError('Sunucu hatası.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000', p: 2 }}>
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%', bgcolor: '#111', color: 'white', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 200, 83, 0.1)', borderRadius: '50%', mb: 2, color: '#00e676' }}>
            <PersonAddIcon sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h5" fontWeight="bold">Kayıt Ol</Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>Yeni bir BorsaApp hesabı oluşturun</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

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
          <Button type="submit" fullWidth variant="contained" size="large" sx={{ bgcolor: '#00c853', fontWeight: 'bold', py: 1.5, borderRadius: 2, '&:hover': { bgcolor: '#00e676' } }}>
            Kayıt Ol
          </Button>
        </form>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#888' }}>
            Zaten hesabınız var mı? <Link to="/login" style={{ color: '#00e676', textDecoration: 'none', fontWeight: 'bold' }}>Giriş Yap</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
