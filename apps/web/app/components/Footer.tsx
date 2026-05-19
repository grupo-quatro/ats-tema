import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MuiLink from '@mui/material/Link';

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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {new Date().getFullYear()}{' '}
        <MuiLink
          href="https://www.temaconsulting.com.ar/"
          target="_blank"
          rel="noopener noreferrer"
          color="text.secondary"
          underline="hover"
        >
          Tema Consulting
        </MuiLink>
        . Todos los derechos reservados
      </Typography>
      <IconButton
        component="a"
        href="https://www.linkedin.com/in/recruiting-tema-consulting/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LinkedIn de Tema Consulting"
        size="small"
        sx={{ color: '#0a66c2' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </IconButton>
    </Box>
  );
}
