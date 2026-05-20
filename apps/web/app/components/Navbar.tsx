'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
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
          <Image src={logo} alt="TEMA" height={40} />
        </Link>
        <Box />
      </Toolbar>
    </AppBar>
  );
}
