'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from 'next/link';

export default function Navbar() {
  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Typography variant="h2" sx={{ color: 'primary.main', fontSize: '20px' }}>
            ATS Platform
          </Typography>
        </Link>
        <Box />
      </Toolbar>
    </AppBar>
  );
}
