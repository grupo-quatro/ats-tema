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
  Avatar,
  Stack,
} from '@mui/material';
import {
  BriefcaseBusiness,
  Mail,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  EMPLOYEE_ROLES,
  GMAIL_STATUS,
  type EmployeeRole,
} from '@ats/shared-types';
import { useAuth } from '../../shared/lib/authContext';
import ConnectGmailButton from '../../features/gmail/components/ConnectGmailButton';
import ConnectCalendarButton from '../../features/calendar/components/ConnectCalendarButton';
import ConnectGoogleButton from '../../features/auth/components/ConnectGoogleButton';
import CalendarLinkEditor from '../../features/calendar/components/CalendarLinkEditor';
import { useEmployeeProfile } from '../../features/calendar/hooks/useEmployeeProfile';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const STORAGE_KEY = 'ats-sidebar-collapsed';

const NAV_ITEMS: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
  allowedRoles?: EmployeeRole[];
}> = [
  {
    label: 'Posiciones',
    href: '/dashboard/positions',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Plantillas',
    href: '/dashboard/communication-templates',
    icon: Mail,
    allowedRoles: [EMPLOYEE_ROLES.HR, EMPLOYEE_ROLES.AREA_LEADER],
  },
];

const ROLE_LABELS: Record<EmployeeRole, string> = {
  hr: 'Recruiter',
  area_leader: 'Área Líder',
  admin: 'Admin',
  tech_lead: 'Tech Lead',
};

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, role, signOut } = useAuth();
  const { employee } = useEmployeeProfile();
  const gmailConnected = employee?.gmailStatus === GMAIL_STATUS.CONNECTED;
  const calendarConnected = employee?.calendarStatus === GMAIL_STATUS.CONNECTED;
  const gmailRevoked = employee?.gmailStatus === GMAIL_STATUS.DISCONNECTED;
  const calendarRevoked =
    employee?.calendarStatus === GMAIL_STATUS.DISCONNECTED;
  const showUnifiedConnect =
    role === EMPLOYEE_ROLES.HR && !gmailConnected && !calendarConnected;

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
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.allowedRoles || (role && item.allowedRoles.includes(role)),
  );

  return (
    <Box
      component="aside"
      sx={{
        width,
        minWidth: width,
        height: '100vh',
        position: 'sticky',
        top: 0,
        bgcolor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
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
        sx={{
          flex: 1,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          px: 1,
        }}
      >
        {visibleItems.map((item) => {
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

      {/* User info + logout */}
      <Box sx={{ px: collapsed ? 1 : 2, py: 1.5, flexShrink: 0 }}>
        {collapsed ? (
          <Stack sx={{ alignItems: 'center' }} spacing={1}>
            <Tooltip title={user?.email ?? ''} placement="right">
              <Avatar
                src={user?.photoURL ?? undefined}
                sx={{ width: 32, height: 32 }}
              />
            </Tooltip>
            <Tooltip title="Cerrar sesión" placement="right">
              <IconButton
                onClick={signOut}
                size="small"
                sx={{ color: '#64748b' }}
              >
                <LogOut size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                src={user?.photoURL ?? undefined}
                sx={{ width: 32, height: 32, flexShrink: 0 }}
              />
              <Box sx={{ overflow: 'hidden', flex: 1 }}>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    fontWeight: 500,
                    color: 'text.primary',
                    fontSize: '0.813rem',
                  }}
                >
                  {user?.displayName ?? '—'}
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    color: '#94a3b8',
                    fontSize: '0.7rem',
                    display: 'block',
                  }}
                >
                  {user?.email}
                </Typography>
                {role && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#64748b',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                    }}
                  >
                    {ROLE_LABELS[role]}
                  </Typography>
                )}
              </Box>
              <Tooltip title="Cerrar sesión" placement="right">
                <IconButton
                  onClick={signOut}
                  size="small"
                  sx={{ color: '#64748b', flexShrink: 0 }}
                >
                  <LogOut size={16} />
                </IconButton>
              </Tooltip>
            </Box>
            {showUnifiedConnect ? (
              <>
                {(gmailRevoked || calendarRevoked) && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 1,
                      bgcolor: 'warning.light',
                      color: 'warning.contrastText',
                      fontSize: '0.75rem',
                      lineHeight: 1.4,
                    }}
                  >
                    Tus conexiones de Google fueron desconectadas. Reconectá
                    para continuar.
                  </Box>
                )}
                <ConnectGoogleButton />
              </>
            ) : (
              <>
                {gmailRevoked && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 1,
                      bgcolor: 'warning.light',
                      color: 'warning.contrastText',
                      fontSize: '0.75rem',
                      lineHeight: 1.4,
                    }}
                  >
                    Tu cuenta de Gmail fue desconectada. Reconectá para
                    continuar enviando emails.
                  </Box>
                )}
                <ConnectGmailButton gmailStatus={employee?.gmailStatus} />
                {role === EMPLOYEE_ROLES.HR && calendarRevoked && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 1,
                      bgcolor: 'warning.light',
                      color: 'warning.contrastText',
                      fontSize: '0.75rem',
                      lineHeight: 1.4,
                    }}
                  >
                    Tu cuenta de Google Calendar fue desconectada. Reconectá
                    para continuar detectando reservas.
                  </Box>
                )}
                {role === EMPLOYEE_ROLES.HR && (
                  <ConnectCalendarButton
                    calendarStatus={employee?.calendarStatus}
                  />
                )}
              </>
            )}
            {role === EMPLOYEE_ROLES.HR && <CalendarLinkEditor />}
            <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              ATS · Tema Consulting
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
