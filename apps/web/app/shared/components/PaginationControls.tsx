'use client';

import { Box, Pagination, Typography } from '@mui/material';

type Props = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function PaginationControls({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: Props) {
  if (totalItems === 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 2,
        mt: 3,
      }}
    >
      <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
        {startItem}-{endItem} de {totalItems}
      </Typography>

      {totalPages > 1 ? (
        <Pagination
          count={totalPages}
          page={Math.min(page, totalPages)}
          onChange={(_, value) => onPageChange(value)}
          color="primary"
        />
      ) : null}
    </Box>
  );
}
