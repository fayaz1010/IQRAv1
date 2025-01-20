import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import IqraBookService from '../../features/iqra/services/iqraBookService';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const BookManager = () => {
  const { currentUser } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newBookId, setNewBookId] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  // Load all books
  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const booksCollection = collection(db, 'iqra-books');
      const snapshot = await getDocs(booksCollection);
      const booksList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBooks(booksList);
    } catch (error) {
      console.error('Error loading books:', error);
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  // Create new book
  const handleCreateBook = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const cleanId = newBookId.trim();
      if (!cleanId) {
        setError('Please enter a book ID');
        return;
      }

      // Create book metadata
      const bookRef = doc(db, 'iqra-books', cleanId);
      const bookData = {
        id: cleanId,
        title: `Iqra Book ${cleanId}`,
        description: 'Iqra Book',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalPages: 30
      };

      await setDoc(bookRef, bookData);
      await loadBooks();
      setNewBookId('');
      setSuccess('Book created successfully');
    } catch (error) {
      console.error('Error creating book:', error);
      setError('Failed to create book');
    } finally {
      setLoading(false);
    }
  };

  // Initialize book pages
  const handleInitializePages = async (book) => {
    try {
      setSelectedBook(book);
      setOpenDialog(true);
    } catch (error) {
      console.error('Error initializing pages:', error);
      setError('Failed to initialize pages');
    }
  };

  const confirmInitializePages = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      await IqraBookService.initializeBookPagesAdmin(selectedBook.id);
      setSuccess(`Pages initialized for book ${selectedBook.id}`);
      setOpenDialog(false);
    } catch (error) {
      console.error('Error initializing pages:', error);
      setError('Failed to initialize pages');
    } finally {
      setLoading(false);
      setSelectedBook(null);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          You must be an administrator to access this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Book Manager
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="New Book ID"
              value={newBookId}
              onChange={(e) => setNewBookId(e.target.value)}
              disabled={loading}
              helperText="Enter a numeric ID (e.g., 1, 2, 3)"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateBook}
              disabled={loading}
              sx={{ height: '56px' }}
            >
              Create Book
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Books</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadBooks}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {books.map((book) => (
              <ListItem key={book.id} divider>
                <ListItemText
                  primary={book.title}
                  secondary={`Created: ${book.createdAt?.toDate().toLocaleString() || 'N/A'}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleInitializePages(book)}
                    disabled={loading}
                  >
                    <StorageIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Initialize Book Pages</DialogTitle>
        <DialogContent>
          <Typography>
            This will create blank pages for book "{selectedBook?.title}". 
            Any existing pages will not be affected.
            Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={confirmInitializePages} color="primary" variant="contained">
            Initialize Pages
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BookManager;
