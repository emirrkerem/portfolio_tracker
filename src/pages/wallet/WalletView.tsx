import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default function WalletView() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Cüzdan
      </Typography>
      <Typography>
        Bu sayfada nakit bakiyeniz, para yatırma, para çekme ve cüzdanla ilgili diğer bilgileriniz gösterilecektir.
      </Typography>
    </Box>
  );
}
