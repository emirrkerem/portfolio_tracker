import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import { styled } from '@mui/material/styles';

// Styled component for our text fields
const StyledTextField = styled(TextField)({
  '& .MuiInputLabel-root': {
    color: '#8e8e8e',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#ffffff',
  },
  '& .MuiOutlinedInput-root': {
    color: '#ffffff',
    '& fieldset': {
      borderColor: '#424242',
    },
    '&:hover fieldset': {
      borderColor: '#616161',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#ffffff',
    },
  },
  '& .MuiInputBase-input': {
    '&::-webkit-calendar-picker-indicator': {
      filter: 'invert(1)',
    },
  },
});

interface TransactionFormProps {
  currentPrice: number;
  unit: 'shares' | 'usd';
  onUnitChange: (unit: 'shares' | 'usd') => void;
  transactionType: 'buy' | 'sell' | null;
}

export default function TransactionForm({ currentPrice, unit, onUnitChange, transactionType }: TransactionFormProps) {
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [price, setPrice] = useState(currentPrice.toFixed(2));
  const [commission, setCommission] = useState('1.99');

  // Update price if currentPrice prop changes
  useEffect(() => {
    setPrice(currentPrice.toFixed(2));
  }, [currentPrice]);

  const handleUnitChange = (event: SelectChangeEvent<'shares' | 'usd'>) => {
    onUnitChange(event.target.value as 'shares' | 'usd');
  };

  const handlePriceBlur = () => {
    const numericPrice = parseFloat(price as any);
    if (!isNaN(numericPrice)) {
      setPrice(numericPrice.toFixed(2));
    }
  };

  const estimatedTotal = (parseFloat(quantity as any) * parseFloat(price as any) + parseFloat(commission as any)).toFixed(2);
  const transactionColor = transactionType === 'buy' ? '#00c853' : '#ff5252';

  return (
    <Box component="form" noValidate autoComplete="off" sx={{ width: '100%' }}>
      
      {/* Row 1: Miktar ve Birim */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, alignItems: 'start' }}>
        <StyledTextField
          label={unit === 'shares' ? 'Miktar (Adet)' : 'Tutar (USD)'}
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <FormControl sx={{ minWidth: 120 }}>
          <Select
            value={unit}
            onChange={handleUnitChange}
            sx={{
              height: '100%',
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#424242' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#616161' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
              '& .MuiSvgIcon-root': { color: '#8e8e8e' },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  border: '1px solid #424242',
                },
              },
            }}
          >
            <MenuItem value="shares">Hisse</MenuItem>
            <MenuItem value="usd">USD</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Row 2: Tarih ve Fiyat */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
        <StyledTextField
          label="Tarih"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <StyledTextField
          label="Fiyat (USD)"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={handlePriceBlur}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {/* Row 3: Komisyon */}
      <Box sx={{ mb: 2.5 }}>
        <StyledTextField
          label="Komisyon (USD)"
          type="number"
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Box>
      
       <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mb: 3, 
          mt: 3, 
          p: 2, 
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: transactionColor,
          bgcolor: 'rgba(0, 0, 0, 0.2)'
        }}>
          <Typography variant="body1" sx={{ color: '#a0a0a0' }}>
            Tahmini Tutar
          </Typography>
          <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
            ${estimatedTotal}
          </Typography>
        </Box>
    </Box>
  );
}
