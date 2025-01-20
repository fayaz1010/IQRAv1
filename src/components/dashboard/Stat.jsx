import React from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { PersonOutline as PersonIcon } from '@mui/icons-material';

const Stat = ({ title, value, icon: Icon, color }) => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 2,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'background.paper',
        boxShadow: theme.shadows[2],
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <Box>
        <Typography
          variant="subtitle2"
          sx={{
            color: theme.palette.text.secondary,
            mb: 0.5,
            fontWeight: 500,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            color: color || theme.palette.primary.main,
            fontWeight: 600,
          }}
        >
          {value}
        </Typography>
      </Box>
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: color ? `${color}15` : theme.palette.primary.light + '15',
          color: color || theme.palette.primary.main,
        }}
      >
        {Icon && <Icon sx={{ fontSize: 32 }} />}
      </Box>
    </Paper>
  );
};

export default Stat;
