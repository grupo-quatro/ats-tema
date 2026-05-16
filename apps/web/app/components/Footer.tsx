import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 3,
        px: { xs: 2, md: 4 },
        borderTop: '1px solid #e2e8f0',
        bgcolor: '#ffffff',
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {new Date().getFullYear()} ATS Recruiting Platform. Todos los derechos reservados.
      </Typography>
    </Box>
  );
}
