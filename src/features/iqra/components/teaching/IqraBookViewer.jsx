import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  CircularProgress,
  Typography,
  Stack,
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import { IqraBookService } from '../../services/iqraBookService';

const IqraBookViewer = ({ bookId, initialPage = 1, onPageChange }) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageUrl, setPageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [bookMetadata, setBookMetadata] = useState(null);

  useEffect(() => {
    const loadBookMetadata = async () => {
      try {
        const metadata = await IqraBookService.getBookMetadata(bookId);
        setBookMetadata(metadata);
      } catch (err) {
        console.error('Error loading book metadata:', err);
        setError('Failed to load book information');
      }
    };

    loadBookMetadata();
  }, [bookId]);

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = await IqraBookService.getPageUrl(bookId, currentPage);
        setPageUrl(url);
      } catch (err) {
        console.error('Error loading page:', err);
        setError('Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [bookId, currentPage]);

  const handleNextPage = () => {
    if (bookMetadata && currentPage < bookMetadata.totalPages) {
      setCurrentPage(prev => {
        const newPage = prev + 1;
        onPageChange?.(newPage);
        return newPage;
      });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => {
        const newPage = prev - 1;
        onPageChange?.(newPage);
        return newPage;
      });
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  if (error) {
    return (
      <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <IconButton onClick={handlePrevPage} disabled={currentPage <= 1}>
            <PrevIcon />
          </IconButton>
          <Typography variant="body1" sx={{ alignSelf: 'center' }}>
            Page {currentPage} {bookMetadata && `of ${bookMetadata.totalPages}`}
          </Typography>
          <IconButton
            onClick={handleNextPage}
            disabled={bookMetadata && currentPage >= bookMetadata.totalPages}
          >
            <NextIcon />
          </IconButton>
          <IconButton onClick={handleZoomOut} disabled={zoom <= 0.5}>
            <ZoomOutIcon />
          </IconButton>
          <IconButton onClick={handleZoomIn} disabled={zoom >= 3}>
            <ZoomInIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            position: 'relative',
            overflow: 'auto',
          }}
        >
          {loading ? (
            <CircularProgress />
          ) : (
            <Box
              component="img"
              src={pageUrl}
              alt={`Page ${currentPage}`}
              sx={{
                maxWidth: '100%',
                height: 'auto',
                transform: `scale(${zoom})`,
                transformOrigin: 'center',
                transition: 'transform 0.2s ease-in-out',
              }}
            />
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

export default IqraBookViewer;
