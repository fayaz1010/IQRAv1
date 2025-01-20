import React from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Logo = ({ height = 40 }) => {
  const navigate = useNavigate();

  return (
    <Box
      onClick={() => navigate('/')}
      sx={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        '&:hover': {
          opacity: 0.8,
        },
      }}
    >
      <img
        src="/logo.png"
        alt="Iqra App Logo"
        style={{
          height: `${height}px`,
          width: 'auto',
          marginRight: '8px',
        }}
      />
      <Typography
        variant="h6"
        component="div"
        sx={{
          fontWeight: 600,
          fontSize: `${height * 0.5}px`,
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        IQRA
      </Typography>
    </Box>
  );
};

export default Logo;
