// src/components/portfolio/Holdings.tsx
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { holdingsData } from '../../data/mockData';

export default function Holdings() {
  const calculateTotalValue = (quantity: number, price: number) => (quantity * price).toFixed(2);
  const calculateGainLoss = (quantity: number, avgPrice: number, currentPrice: number) => {
    const gain = (currentPrice - avgPrice) * quantity;
    return gain.toFixed(2);
  };
  const gainLossPercent = (avgPrice: number, currentPrice: number) => {
      const percent = ((currentPrice - avgPrice) / avgPrice) * 100;
      return percent.toFixed(2);
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Varlıklarım
        </Typography>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Sembol</TableCell>
                <TableCell>Ad</TableCell>
                <TableCell align="right">Miktar</TableCell>
                <TableCell align="right">Ort. Maliyet</TableCell>
                <TableCell align="right">Güncel Fiyat</TableCell>
                <TableCell align="right">Toplam Değer</TableCell>
                <TableCell align="right">Kar/Zarar</TableCell>
                <TableCell align="right">Kar/Zarar (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holdingsData.map((row) => (
                <TableRow key={row.symbol}>
                  <TableCell component="th" scope="row">{row.symbol}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="right">{row.quantity}</TableCell>
                  <TableCell align="right">{`$${row.avgPrice.toFixed(2)}`}</TableCell>
                  <TableCell align="right">{`$${row.currentPrice.toFixed(2)}`}</TableCell>
                  <TableCell align="right">{`$${calculateTotalValue(row.quantity, row.currentPrice)}`}</TableCell>
                   <TableCell align="right" style={{ color: parseFloat(calculateGainLoss(row.quantity, row.avgPrice, row.currentPrice)) >= 0 ? 'green' : 'red' }}>
                    {`$${calculateGainLoss(row.quantity, row.avgPrice, row.currentPrice)}`}
                  </TableCell>
                  <TableCell align="right" style={{ color: parseFloat(gainLossPercent(row.avgPrice, row.currentPrice)) >= 0 ? 'green' : 'red' }}>
                    {`${gainLossPercent(row.avgPrice, row.currentPrice)}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
