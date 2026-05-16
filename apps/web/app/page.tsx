import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

export default function Home() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 3,
      }}
    >
      <Typography variant="h1">Bienvenido</Typography>
      <Link href="/postulation/demo" style={{ textDecoration: 'none' }}>
        <Button variant="contained" size="large">
          Postulación
        </Button>
      </Link>
    </Box>
  );
}
