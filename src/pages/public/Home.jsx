import { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Divider,
  useTheme,
} from '@mui/material';
import {
  School as SchoolIcon,
  Book as BookIcon,
  Assignment as AssignmentIcon,
  Google as GoogleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const FreeResource = ({ title, description, image, link }) => {
  const theme = useTheme();
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="140"
        image={image}
        alt={title}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="h2">
          {title}
        </Typography>
        <Typography>
          {description}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" color="primary" href={link}>
          Learn More
        </Button>
      </CardActions>
    </Card>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const theme = useTheme();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const freeResources = [
    {
      title: 'Arabic Alphabet Basics',
      description: 'Learn the fundamentals of Arabic letters and their pronunciations.',
      image: '/path/to/alphabet-image.jpg',
      link: '/learn/alphabet',
    },
    {
      title: 'Iqra Book 1 Preview',
      description: 'Get started with the first few lessons of Iqra Book 1.',
      image: '/path/to/iqra-image.jpg',
      link: '/learn/iqra-preview',
    },
    {
      title: 'Practice Exercises',
      description: 'Try our interactive exercises to test your knowledge.',
      image: '/path/to/practice-image.jpg',
      link: '/learn/practice',
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Hero Section */}
      <Paper
        sx={{
          position: 'relative',
          backgroundColor: 'grey.800',
          color: '#fff',
          mb: 4,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundImage: 'url(/path/to/hero-image.jpg)',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography component="h1" variant="h3" color="inherit" gutterBottom>
                Welcome to IQRA
              </Typography>
              <Typography variant="h5" color="inherit" paragraph>
                Start your journey in learning Quran and Arabic with our interactive platform
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleSignIn}
                sx={{ mt: 2 }}
              >
                Sign in with Google to Get Started
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Paper>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Free Learning Resources
        </Typography>
        <Grid container spacing={4}>
          {freeResources.map((resource) => (
            <Grid item key={resource.title} xs={12} sm={6} md={4}>
              <FreeResource {...resource} />
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Call to Action */}
      <Paper sx={{ py: 6, px: 2, bgcolor: theme.palette.primary.main, color: 'white' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" align="center" gutterBottom>
            Ready to Start Learning?
          </Typography>
          <Typography variant="h6" align="center" paragraph>
            Join our community of learners and start your journey today
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              color="secondary"
              onClick={handleGoogleSignIn}
            >
              Get Started Now
            </Button>
          </Box>
        </Container>
      </Paper>
    </Box>
  );
};

export default Home;
