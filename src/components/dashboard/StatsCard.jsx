import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon, color, loading = false, prefix = '', suffix = '', onClick }) => {
  return (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, #ffffff 100%)`,
        borderLeft: `4px solid ${color}`,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          boxShadow: 3,
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                <>
                  {prefix}{value}{suffix}
                </>
              )}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: '50%',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
