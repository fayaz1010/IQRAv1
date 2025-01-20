import React from 'react';
import { Paper, Box, Typography, alpha } from '@mui/material';

const StatsCard = ({ icon, title, value, subtitle, color = 'primary' }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-2px)',
          transition: 'transform 0.2s ease-in-out'
        }
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          right: -10,
          opacity: 0.1,
          transform: 'rotate(30deg)',
          '& > *': {
            fontSize: '5rem',
            color: `${color}.main`
          }
        }}
      >
        {icon}
      </Box>
      
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: `${color}.main`,
            fontWeight: 'medium',
            mb: 1
          }}
        >
          {title}
        </Typography>

        <Typography variant="h3" sx={{ mb: 0.5 }}>
          {value}
        </Typography>

        {subtitle && (
          <Typography
            variant="subtitle2"
            sx={{
              color: 'text.secondary',
              fontWeight: 'regular'
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default StatsCard;
