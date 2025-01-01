import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const IqraBookViewer = () => {
  return (
    <Paper elevation={2} sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        Iqra Book Viewer
      </Typography>
      <Box>
        {/* Basic placeholder content */}
        <Typography>Book content will be displayed here</Typography>
      </Box>
    </Paper>
  );
};

export default IqraBookViewer;
