'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import { Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Link from 'next/link';
import Image from 'next/image';
import logo from '../images/LOGO-ANIVERSARIO-TEMA-2025.png';

export default function Navbar() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Image src={logo} alt="TEMA" height={40} priority />
        </Link>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Link href="/dashboard/positions" style={{ textDecoration: 'none' }}>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
              Dashboard
            </Typography>
          </Link>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
