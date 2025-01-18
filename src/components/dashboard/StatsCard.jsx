import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';

const colorMap = {
  info: {
    main: '#7986cb',
    gradient: 'linear-gradient(135deg, #7986cb33 0%, #7986cb15 100%)'
  },
  warning: {
    main: '#ffd54f',
    gradient: 'linear-gradient(135deg, #ffd54f33 0%, #ffd54f15 100%)'
  },
  success: {
    main: '#81c784',
    gradient: 'linear-gradient(135deg, #81c78433 0%, #81c78415 100%)'
  },
  error: {
    main: '#e57373',
    gradient: 'linear-gradient(135deg, #e5737333 0%, #e5737315 100%)'
  }
};

const StatsCard = ({ title, value, icon, color = 'info', loading = false }) => {
  const theme = colorMap[color] || colorMap.info;

  return (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
      sx={{
        height: '100%',
        background: theme.gradient,
        borderRadius: 2,
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 100%)',
          zIndex: 1
        }
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: theme.main,
                fontWeight: 600,
                mb: 1
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              component="div"
              sx={{
                fontWeight: 'bold',
                color: 'text.primary'
              }}
            >
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                value
              )}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${theme.main}20`,
              borderRadius: '12px',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.main
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
