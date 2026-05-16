import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Box from '@mui/material/Box';

export const metadata: Metadata = {
  title: 'ATS Recruiting Platform',
  description: 'Applicant Tracking System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <Box component="main" sx={{ flex: 1 }}>
              {children}
            </Box>
            <Footer />
          </Box>
        </Providers>
      </body>
    </html>
  );
}
