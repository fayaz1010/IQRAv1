import { motion } from 'framer-motion';
import { styled } from '@mui/material/styles';
import { Card, Box } from '@mui/material';

export const AnimatedCard = styled(motion(Card))`
  overflow: hidden;
  transition: all 0.3s ease-in-out;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }
`;

export const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

export const FadeInBox = styled(motion(Box))``;
FadeInBox.defaultProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5 }
};

export const SlideUpBox = styled(motion(Box))``;
SlideUpBox.defaultProps = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export const GradientBackground = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'light'
    ? 'linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%)'
    : 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
  minHeight: '100vh',
  width: '100%',
}));
