import Box from '@mui/material/Box';
import Sidebar from '../components/sidebar/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          bgcolor: '#f8fafc',
          overflowY: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
