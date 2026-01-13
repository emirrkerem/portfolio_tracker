import { Card, CardContent, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import { portfolioSummaryData } from '../../data/mockData';

export default function PortfolioSummary() {
  const { totalValue, dayChange, dayChangePercent, totalGain, totalGainPercent } = portfolioSummaryData;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  };

  const changeColor = (value: number) => (value >= 0 ? 'green' : 'red');

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Portföy Özeti
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ width: '100%' }}>
            <Typography variant="h4">
              {formatCurrency(totalValue)}
            </Typography>
            <Typography color="text.secondary">
              Toplam Portföy Değeri
            </Typography>
          </Box>
          <Box sx={{ width: 'calc(50% - 8px)' }}>
            <Typography variant="h6" style={{ color: changeColor(dayChange) }}>
              {formatCurrency(dayChange)}
            </Typography>
            <Typography color="text.secondary">
              Günlük Değişim
            </Typography>
          </Box>
          <Box sx={{ width: 'calc(50% - 8px)' }}>
            <Typography variant="h6" style={{ color: changeColor(dayChange) }}>
              {dayChangePercent.toFixed(2)}%
            </Typography>
            <Typography color="text.secondary">
              Günlük Değişim (%)
            </Typography>
          </Box>
          <Box sx={{ width: 'calc(50% - 8px)' }}>
            <Typography variant="h6" style={{ color: changeColor(totalGain) }}>
              {formatCurrency(totalGain)}
            </Typography>
            <Typography color="text.secondary">
              Toplam Kar/Zarar
            </Typography>
          </Box>
          <Box sx={{ width: 'calc(50% - 8px)' }}>
            <Typography variant="h6" style={{ color: changeColor(totalGain) }}>
              {totalGainPercent.toFixed(2)}%
            </Typography>
            <Typography color="text.secondary">
              Toplam Kar/Zarar (%)
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
