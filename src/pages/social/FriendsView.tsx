import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import GroupIcon from '@mui/icons-material/Group';
import Alert from '@mui/material/Alert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { API_URL } from '../../config';

export default function FriendsView() {
  const [friends, setFriends] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Detay Modalı State'leri
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendHoldings, setFriendHoldings] = useState<any[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);

  const fetchFriends = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
      const headers = { 'X-User-ID': String(user.id || '1') };
      
      // Arkadaşları Çek
      const res = await fetch(`${API_URL}/api/friends`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setFriends(data);
      }
      
      // Gelen İstekleri Çek
      const reqRes = await fetch(`${API_URL}/api/friends/requests`, { headers });
      const reqData = await reqRes.json();
      if (Array.isArray(reqData)) {
        setFriendRequests(reqData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    try {
      const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
      const headers = { 'X-User-ID': String(user.id || '1') };
      const res = await fetch(`${API_URL}/api/users/search?q=${searchQuery}`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        // Zaten arkadaş olduklarımızı filtrele
        const friendIds = friends.map(f => f.id);
        const filtered = data.filter(u => !friendIds.includes(u.id));
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendFriendRequest = async (friendId: number) => {
    try {
      const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
      const headers = { 'Content-Type': 'application/json', 'X-User-ID': String(user.id || '1') };
      
      const res = await fetch(`${API_URL}/api/friends/request`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ friend_id: friendId })
      });
      
      if (res.ok) {
        setSuccess('İstek gönderildi!');
        // Listeden kaldır (tekrar göndermeyi önlemek için)
        setSearchResults(prev => prev.filter(u => u.id !== friendId)); 
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await res.json();
        setError(d.error || 'İstek gönderilemedi.');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Sunucu hatası.');
    }
  };

  const handleRequestResponse = async (requestId: number, action: 'accept' | 'reject') => {
    try {
      const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
      const headers = { 'Content-Type': 'application/json', 'X-User-ID': String(user.id || '1') };
      
      const res = await fetch(`${API_URL}/api/friends/requests/respond`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ request_id: requestId, action })
      });
      
      if (res.ok) {
        setSuccess(action === 'accept' ? 'Arkadaşlık kabul edildi!' : 'İstek reddedildi.');
        fetchFriends(); // Listeleri güncelle
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeFriend = async (friendId: number) => {
    if (!window.confirm('Arkadaşı silmek istediğinize emin misiniz?')) return;
    
    try {
      const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
      const headers = { 'X-User-ID': String(user.id || '1') };
      
      const res = await fetch(`${API_URL}/api/friends?id=${friendId}`, {
        method: 'DELETE',
        headers
      });
      
      if (res.ok) {
        setFriends(prev => prev.filter(f => f.id !== friendId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewFriend = async (friend: any) => {
    setSelectedFriend(friend);
    setViewDialogOpen(true);
    setHoldingsLoading(true);
    setFriendHoldings([]);
    
    try {
        const user = JSON.parse(localStorage.getItem('borsa_user') || '{}');
        const headers = { 'X-User-ID': String(user.id || '1') };
        const res = await fetch(`${API_URL}/api/friends/holdings/${friend.id}`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
            setFriendHoldings(data);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setHoldingsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, pt: '90px', minHeight: '100vh', background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)', color: 'white' }}>
      <Typography variant="h4" fontWeight="800" sx={{ mb: 4, letterSpacing: '-1px' }}>Arkadaşlar</Typography>

      {/* Gelen İstekler Bölümü (Varsa Göster) */}
      {friendRequests.length > 0 && (
        <Paper sx={{ p: 3, mb: 4, bgcolor: '#000000', borderRadius: 4, border: '1px solid rgba(255, 152, 0, 0.3)', background: 'linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(0,0,0,0) 100%)' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, color: '#ff9800' }}>
                <NotificationsActiveIcon /> Gelen İstekler ({friendRequests.length})
            </Typography>
            <List>
                {friendRequests.map((req) => (
                    <ListItem 
                        key={req.id}
                        sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, mb: 1 }}
                        secondaryAction={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button 
                                    variant="contained" 
                                    size="small" 
                                    color="success" 
                                    startIcon={<CheckIcon />}
                                    onClick={() => handleRequestResponse(req.id, 'accept')}
                                >
                                    Kabul Et
                                </Button>
                                <Button 
                                    variant="outlined" 
                                    size="small" 
                                    color="error" 
                                    startIcon={<CloseIcon />}
                                    onClick={() => handleRequestResponse(req.id, 'reject')}
                                >
                                    Reddet
                                </Button>
                            </Box>
                        }
                    >
                        <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#ff9800' }}>{req.username[0].toUpperCase()}</Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                            primary={req.username} 
                            secondary={new Date(req.created_at).toLocaleDateString('tr-TR')}
                            primaryTypographyProps={{ fontWeight: 'bold' }}
                            secondaryTypographyProps={{ sx: { color: '#aaa' } }}
                        />
                    </ListItem>
                ))}
            </List>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {/* Sol: Arkadaş Listesi */}
        <Paper sx={{ flex: 1, minWidth: 300, p: 3, bgcolor: '#000000', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'rgba(41, 121, 255, 0.1)', color: '#2979ff', width: 40, height: 40 }}><GroupIcon /></Avatar>
            Arkadaş Listem
          </Typography>
          
          {friends.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 2 }}>
                <Typography sx={{ color: '#666', fontStyle: 'italic' }}>Henüz arkadaşınız yok.</Typography>
            </Box>
          ) : (
            <List>
              {friends.map((friend) => (
                <ListItem 
                  key={friend.id}
                  secondaryAction={
                    <Box>
                        <IconButton onClick={() => handleViewFriend(friend)} sx={{ color: '#2979ff', mr: 1, bgcolor: 'rgba(41, 121, 255, 0.1)', '&:hover': { bgcolor: 'rgba(41, 121, 255, 0.2)' } }}>
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton edge="end" onClick={() => removeFriend(friend.id)} sx={{ color: '#ff1744', bgcolor: 'rgba(255, 23, 68, 0.1)', '&:hover': { bgcolor: 'rgba(255, 23, 68, 0.2)' } }}>
                            <PersonRemoveIcon fontSize="small" />
                        </IconButton>
                    </Box>
                  }
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.02)', 
                    mb: 1.5, 
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', transform: 'translateY(-2px)' }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#2979ff', fontWeight: 'bold' }}>{friend.username[0].toUpperCase()}</Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={friend.username} 
                    primaryTypographyProps={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                    secondary="Aktif Kullanıcı"
                    secondaryTypographyProps={{ sx: { color: '#666', fontSize: '0.8rem' } }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* Sağ: Arkadaş Ekle */}
        <Paper sx={{ flex: 1, minWidth: 300, p: 3, bgcolor: '#000000', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', height: 'fit-content', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'rgba(0, 230, 118, 0.1)', color: '#00e676', width: 40, height: 40 }}><PersonAddIcon /></Avatar>
            Arkadaş Ekle
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              fullWidth
              variant="filled"
              placeholder="Kullanıcı adı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                disableUnderline: true,
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#666' }} /></InputAdornment>
              }}
              sx={{ 
                '& .MuiFilledInput-root': { 
                    bgcolor: 'rgba(255,255,255,0.05)', 
                    borderRadius: 2, 
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                    '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.08)' }
                }
              }}
            />
            <Button 
                variant="contained" 
                onClick={handleSearch} 
                sx={{ 
                    bgcolor: '#2979ff', 
                    borderRadius: 2, 
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(41, 121, 255, 0.3)',
                    '&:hover': { bgcolor: '#1565c0' }
                }}
            >
                Ara
            </Button>
          </Box>

          {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <List>
            {searchResults.map((user) => (
              <ListItem 
                key={user.id}
                secondaryAction={
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => sendFriendRequest(user.id)} 
                    sx={{ 
                        color: '#00e676', 
                        borderColor: 'rgba(0, 230, 118, 0.5)', 
                        borderRadius: 2,
                        '&:hover': { borderColor: '#00e676', bgcolor: 'rgba(0, 230, 118, 0.1)' }
                    }}
                  >
                    İstek Gönder
                  </Button>
                }
                sx={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    py: 1.5
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold' }}>{user.username[0].toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={user.username} primaryTypographyProps={{ fontWeight: 'bold' }} />
              </ListItem>
            ))}
            {searchResults.length === 0 && searchQuery.length >= 2 && (
              <Typography variant="caption" sx={{ color: '#666', display: 'block', textAlign: 'center', py: 2 }}>Sonuç bulunamadı.</Typography>
            )}
          </List>
        </Paper>
      </Box>

      {/* Arkadaş Portföy Detay Modalı */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        PaperProps={{
            sx: {
                background: 'linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)',
                color: 'white',
                borderRadius: 4,
                minWidth: '450px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
            }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#2979ff' }}>{selectedFriend?.username[0].toUpperCase()}</Avatar>
            <Box>
                <Typography variant="h6" fontWeight="bold">{selectedFriend?.username}</Typography>
                <Typography variant="caption" sx={{ color: '#a0a0a0' }}>Portföy Dağılımı</Typography>
            </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
            {holdingsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : friendHoldings.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: '#666' }}>Bu kullanıcının portföyü boş veya gizli.</Box>
            ) : (
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Sembol</TableCell>
                                <TableCell align="right" sx={{ color: '#a0a0a0', fontWeight: 'bold' }}>Ağırlık (%)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {friendHoldings.map((h) => (
                                <TableRow key={h.symbol} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar src={`${API_URL}/logos/${h.symbol}.png`} sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{h.symbol[0]}</Avatar>
                                        {h.symbol}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Chip label={`%${h.allocation}`} size="small" sx={{ bgcolor: 'rgba(41, 121, 255, 0.15)', color: '#2979ff', fontWeight: 'bold' }} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
