import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// Örnek Veriler
const rows = [
  { symbol: 'NVDA', price: '$185', change: '+5', pctChange: '2.15%', cap: '3.5 T', ytd: '%27' },
  { symbol: 'AAPL', price: '$225', change: '-1.2', pctChange: '-0.53%', cap: '3.4 T', ytd: '%18' },
  { symbol: 'MSFT', price: '$415', change: '+2.5', pctChange: '0.60%', cap: '3.1 T', ytd: '%22' },
  { symbol: 'AMZN', price: '$178', change: '+1.8', pctChange: '1.02%', cap: '1.9 T', ytd: '%15' },
  { symbol: 'GOOGL', price: '$165', change: '-0.5', pctChange: '-0.30%', cap: '2.1 T', ytd: '%12' },
];

export default function DashboardView() {
  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Sol Panel: Hisseler (Ekranın %40'ı - ortanın biraz solu) */}
      <Box sx={{ width: '40%', pr: 2, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Piyasalar
        </Typography>
        <TableContainer>
          <Table size="small" aria-label="market table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Symbol</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>PRICE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>CHANGE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>%CHANGE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>CAP</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>YTD</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.symbol}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                    {row.symbol}
                  </TableCell>
                  <TableCell align="right">{row.price}</TableCell>
                  <TableCell align="right" sx={{ color: row.change.includes('+') ? 'success.main' : 'error.main' }}>
                    {row.change}
                  </TableCell>
                  <TableCell align="right" sx={{ color: row.pctChange.includes('-') ? 'error.main' : 'success.main' }}>
                    {row.pctChange}
                  </TableCell>
                  <TableCell align="right">{row.cap}</TableCell>
                  <TableCell align="right">{row.ytd}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Dikey Ayırıcı Çizgi */}
      <Divider orientation="vertical" flexItem sx={{ mr: 2 }} />

      {/* Sağ Panel (Şimdilik boş) */}
      <Box sx={{ flex: 1 }}>
        {/* Buraya sağ tarafın içeriği gelecek */}
      </Box>
    </Box>
  );
}