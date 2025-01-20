import React from 'react';
import { Alert, Button, Container, Typography, Box } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    // You can also log the error to an error reporting service here
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Optionally refresh the page or perform other recovery actions
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm">
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6" component="div" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {this.state.error?.message || 'An unexpected error occurred'}
              </Typography>
            </Alert>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.handleReset}
              sx={{ mt: 2 }}
            >
              Reload Page
            </Button>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
