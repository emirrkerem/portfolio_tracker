// src/components/portfolio/PortfolioChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, Typography } from '@mui/material';
import { portfolioChartData } from '../../data/mockData';

export default function PortfolioChart() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Portföy Değeri
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={portfolioChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} name="Değer" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
