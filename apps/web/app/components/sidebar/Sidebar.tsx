'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Divider,
} from '@mui/material';
import {
  BriefcaseBusiness,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const STORAGE_KEY = 'ats-sidebar-collapsed';

const NAV_ITEMS = [
  {
    label: 'Posiciones',
    href: '/dashboard/positions',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Candidatos',
    href: '/dashboard/candidates',
    icon: Users,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === 'true');
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box
      component="aside"
      sx={{
        width,
        minWidth: width,
        height: '100%',
        bgcolor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 0 : 2,
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            Menú
          </Typography>
        )}

        <Tooltip title={collapsed ? 'Expandir' : 'Colapsar'} placement="right">
          <IconButton
            onClick={toggle}
            size="small"
            sx={{
              color: '#64748b',
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: 32,
              height: 32,
              '&:hover': { bgcolor: '#f1f5f9' },
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Nav items */}
      <Box
        component="nav"
        sx={{ flex: 1, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5, px: 1 }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Tooltip
              key={item.href}
              title={collapsed ? item.label : ''}
              placement="right"
            >
              <Link href={item.href} style={{ textDecoration: 'none' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: collapsed ? 0 : 1.5,
                    py: 1,
                    borderRadius: '10px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    bgcolor: isActive ? '#eff6ff' : 'transparent',
                    color: isActive ? '#2563eb' : '#334155',
                    transition: 'background-color 0.15s, color 0.15s',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: isActive ? '#eff6ff' : '#f8fafc',
                      color: isActive ? '#2563eb' : '#0f172a',
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: '8px',
                      bgcolor: isActive ? '#dbeafe' : 'transparent',
                    }}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
                  </Box>

                  {!collapsed && (
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 400,
                        whiteSpace: 'nowrap',
                        color: 'inherit',
                      }}
                    >
                      {item.label}
                    </Typography>
                  )}
                </Box>
              </Link>
            </Tooltip>
          );
        })}
      </Box>

      <Divider />

      {/* Footer label */}
      {!collapsed && (
        <Box sx={{ px: 2.5, py: 2 }}>
          <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            ATS · Tema Consulting
          </Typography>
        </Box>
      )}
    </Box>
  );
}
