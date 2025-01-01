import { useState } from 'react';
import {
  Box,
  Container,
  Button,
  Typography,
  useTheme,
  alpha,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  Avatar,
  Rating,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import {
  School as SchoolIcon,
  MenuBook as BookIcon,
  Group as GroupIcon,
  Timeline as TimelineIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Login from '../auth/Login';
import Register from '../auth/Register';

// Import images
import heroImage from '../../assets/images/hero-bg.jpg';
import logoImage from '../../assets/images/logo.png';
import teacherIcon from '../../assets/images/features/teacher.png';
import curriculumIcon from '../../assets/images/features/curriculum.png';
import progressIcon from '../../assets/images/features/progress.png';
import interactiveIcon from '../../assets/images/features/interactive.png';

// Styled components
const HeroSection = styled(Box)(({ theme }) => ({
  minHeight: '85vh',
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.95)} 0%, ${alpha(theme.palette.primary.dark, 0.95)} 100%)`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url(${heroImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: 0.15,
    filter: 'blur(1px)',
    transform: 'scale(1.1)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(180deg, 
      ${alpha(theme.palette.primary.dark, 0.4)} 0%,
      ${alpha(theme.palette.primary.main, 0.6)} 100%
    )`,
    opacity: 0.8,
  },
}));

const ScrollIndicator = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 40,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  color: theme.palette.common.white,
  opacity: 0.7,
  transition: 'opacity 0.3s ease',
  cursor: 'pointer',
  zIndex: 3,
  '&:hover': {
    opacity: 1,
  },
  animation: 'bounce 2s infinite',
  '@keyframes bounce': {
    '0%, 20%, 50%, 80%, 100%': {
      transform: 'translateY(0) translateX(-50%)',
    },
    '40%': {
      transform: 'translateY(-10px) translateX(-50%)',
    },
    '60%': {
      transform: 'translateY(-5px) translateX(-50%)',
    },
  },
}));

const ContentWrapper = styled(Box)({
  position: 'relative',
  zIndex: 2,
});

const FeatureCard = styled(Card)(({ theme }) => ({
  height: '100%',
  background: alpha(theme.palette.background.paper, 0.9),
  backdropFilter: 'blur(10px)',
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
  },
}));

const GlowingText = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.contrastText,
  textShadow: `0 0 10px ${alpha(theme.palette.primary.light, 0.5)}`,
}));

const features = [
  {
    icon: <SchoolIcon fontSize="large" />,
    title: 'Expert Teachers',
    description: 'Learn from qualified and experienced Quran teachers',
  },
  {
    icon: <BookIcon fontSize="large" />,
    title: 'Structured Learning',
    description: 'Follow a systematic approach to learning Quran and Arabic',
  },
  {
    icon: <TimelineIcon fontSize="large" />,
    title: 'Track Progress',
    description: 'Monitor your learning journey with detailed progress tracking',
  },
  {
    icon: <GroupIcon fontSize="large" />,
    title: 'Interactive Classes',
    description: 'Engage in interactive online classes with real-time feedback',
  },
];

const testimonials = [
  {
    name: "Ahmad Hassan",
    role: "Parent",
    image: "https://i.pravatar.cc/150?img=1",
    content: "My children have shown remarkable improvement in their Quran reading. The teachers are very patient and professional.",
    rating: 5,
  },
  {
    name: "Sarah Ahmed",
    role: "Student",
    image: "https://i.pravatar.cc/150?img=2",
    content: "The interactive learning methods make it easy to understand and remember the lessons. I love the practice exercises!",
    rating: 5,
  },
  {
    name: "Mohammed Ali",
    role: "Parent",
    image: "https://i.pravatar.cc/150?img=3",
    content: "Excellent platform for learning Quran. The flexible scheduling works perfectly for our busy family life.",
    rating: 5,
  },
];

const pricingPlans = [
  {
    title: "Basic",
    price: "49",
    features: [
      "2 Classes per week",
      "Basic Quran Reading",
      "Email Support",
      "Progress Tracking",
    ],
    recommended: false,
  },
  {
    title: "Standard",
    price: "89",
    features: [
      "4 Classes per week",
      "Advanced Tajweed",
      "24/7 Support",
      "Progress Tracking",
      "Recorded Sessions",
      "Practice Materials",
    ],
    recommended: true,
  },
  {
    title: "Premium",
    price: "149",
    features: [
      "Daily Classes",
      "Advanced Tajweed",
      "1-on-1 Sessions",
      "24/7 Priority Support",
      "Recorded Sessions",
      "All Learning Materials",
      "Certificate",
    ],
    recommended: false,
  },
];

const LandingPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [openDialog, setOpenDialog] = useState(null);

  const handleOpenDialog = (type) => {
    setOpenDialog(type);
  };

  const handleCloseDialog = () => {
    setOpenDialog(null);
  };

  const handleAuthSuccess = () => {
    // Close the dialog first
    handleCloseDialog();
    
    // Navigate based on role
    switch (userRole) {
      case 'admin':
        navigate('/admin');
        break;
      case 'teacher':
        navigate('/teacher');
        break;
      case 'parent':
        navigate('/parent');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return (
    <Box>
      <HeroSection>
        <Container maxWidth="lg">
          <ContentWrapper>
            <Grid
              container
              spacing={4}
              sx={{
                minHeight: '85vh',
                alignItems: 'center',
                pb: 8,
              }}
            >
              <Grid item xs={12} md={6}>
                <Box component={motion.div} initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                  <GlowingText variant="h2" component="h1" gutterBottom>
                    Begin Your Journey
                    <br />
                    in
                    <br />
                    Quranic Learning
                  </GlowingText>
                  <Typography
                    variant="h5"
                    sx={{ color: 'primary.contrastText', mb: 4, opacity: 0.9 }}
                  >
                    Interactive online Quran & Arabic learning platform with expert teachers
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      size="large"
                      color="secondary"
                      onClick={() => handleOpenDialog('register')}
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        fontSize: '1.1rem',
                      }}
                    >
                      Get Started
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => handleOpenDialog('login')}
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        fontSize: '1.1rem',
                        color: 'white',
                        borderColor: 'white',
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: alpha(theme.palette.common.white, 0.1),
                        },
                      }}
                    >
                      Sign In
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </ContentWrapper>
          <ScrollIndicator
            onClick={() => {
              window.scrollTo({
                top: window.innerHeight * 0.85,
                behavior: 'smooth'
              });
            }}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>Scroll to explore</Typography>
            <motion.div
              animate={{
                y: [0, 5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              <KeyboardArrowDownIcon />
            </motion.div>
          </ScrollIndicator>
        </Container>
      </HeroSection>

      <Box sx={{ py: 8, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 6 }}
          >
            Why Choose IQRA?
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <FeatureCard>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Box sx={{ color: 'primary.main', mb: 2 }}>
                        {feature.icon}
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </FeatureCard>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: 8, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 6 }}
          >
            What Our Students Say
          </Typography>
          <Grid container spacing={4}>
            {testimonials.map((testimonial, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          src={testimonial.image}
                          sx={{ width: 60, height: 60, mr: 2 }}
                        />
                        <Box>
                          <Typography variant="h6">{testimonial.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {testimonial.role}
                          </Typography>
                        </Box>
                      </Box>
                      <Rating value={testimonial.rating} readOnly sx={{ mb: 2 }} />
                      <Typography variant="body1">{testimonial.content}</Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: 8, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 6 }}
          >
            Choose Your Plan
          </Typography>
          <Grid container spacing={4}>
            {pricingPlans.map((plan, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      border: plan.recommended ? `2px solid ${theme.palette.secondary.main}` : 'none',
                    }}
                  >
                    {plan.recommended && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 20,
                          right: 20,
                          bgcolor: 'secondary.main',
                          color: 'secondary.contrastText',
                          px: 2,
                          py: 0.5,
                          borderRadius: 1,
                        }}
                      >
                        Recommended
                      </Box>
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h4" component="h3" gutterBottom align="center">
                        {plan.title}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', mb: 4 }}>
                        <Typography variant="h3" component="span">
                          ${plan.price}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                          /month
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      {plan.features.map((feature, featureIndex) => (
                        <Box
                          key={featureIndex}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 1,
                          }}
                        >
                          <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                          <Typography>{feature}</Typography>
                        </Box>
                      ))}
                    </CardContent>
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Button
                        variant={plan.recommended ? 'contained' : 'outlined'}
                        color={plan.recommended ? 'secondary' : 'primary'}
                        size="large"
                        fullWidth
                        onClick={() => handleOpenDialog('register')}
                      >
                        Get Started
                      </Button>
                    </Box>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Auth Dialogs */}
      <Dialog
        open={Boolean(openDialog)}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        aria-labelledby="auth-dialog-title"
        disablePortal={false}
        keepMounted={false}
      >
        <Box 
          sx={{ 
            position: 'relative', 
            p: 2,
            '& .MuiDialog-paper': {
              margin: 0,
            },
          }}
        >
          <IconButton
            onClick={handleCloseDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
            aria-label="close dialog"
          >
            <CloseIcon />
          </IconButton>
          <Typography id="auth-dialog-title" variant="h6" component="h2" sx={{ mb: 2, textAlign: 'center' }}>
            {openDialog === 'login' ? 'Sign In' : 'Create Account'}
          </Typography>
          {openDialog === 'login' && (
            <Login 
              onSuccess={handleAuthSuccess} 
            />
          )}
          {openDialog === 'register' && (
            <Register 
              onSuccess={handleAuthSuccess} 
            />
          )}
        </Box>
      </Dialog>

    </Box>
  );
};

export default LandingPage;
