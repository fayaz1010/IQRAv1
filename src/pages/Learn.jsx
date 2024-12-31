import { useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Book as BookIcon,
  PlayCircleOutline as PlayIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const Learn = () => {
  const [courses] = useState([
    {
      id: 1,
      title: 'Arabic Alphabets',
      description: 'Learn the basic Arabic letters and their pronunciations',
      progress: 60,
      image: '/path/to/arabic-letters.jpg',
      type: 'alphabet',
    },
    {
      id: 2,
      title: 'Iqra Book 1',
      description: 'Foundation of Quranic reading',
      progress: 30,
      image: '/path/to/iqra1.jpg',
      type: 'iqra',
    },
    {
      id: 3,
      title: 'Writing Practice',
      description: 'Learn to write Arabic letters',
      progress: 0,
      image: '/path/to/writing.jpg',
      type: 'writing',
    },
  ]);

  const CourseCard = ({ course }) => (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <CardMedia
        component="div"
        sx={{
          height: 140,
          bgcolor: 'primary.light',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {course.type === 'alphabet' && <SchoolIcon sx={{ fontSize: 60 }} />}
        {course.type === 'iqra' && <BookIcon sx={{ fontSize: 60 }} />}
        {course.type === 'writing' && <CreateIcon sx={{ fontSize: 60 }} />}
      </CardMedia>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h5" component="h2">
          {course.title}
        </Typography>
        <Typography color="text.secondary" paragraph>
          {course.description}
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {course.progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={course.progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        <Button
          variant="contained"
          startIcon={<PlayIcon />}
          fullWidth
          onClick={() => {
            // TODO: Implement course navigation
            console.log('Navigate to course:', course.id);
          }}
        >
          {course.progress > 0 ? 'Continue' : 'Start'}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Learning Path
        </Typography>
        <Grid container spacing={4}>
          {courses.map((course) => (
            <Grid item key={course.id} xs={12} sm={6} md={4}>
              <CourseCard course={course} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default Learn;
