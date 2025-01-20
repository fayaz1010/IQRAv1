import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import useImage from 'use-image';
import {
  Box,
  IconButton,
  Slider,
  Stack,
  Tooltip,
  Paper,
  CircularProgress,
  ButtonGroup,
  Button,
  Typography,
  Alert
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  Brush,
  Highlight,
  Undo,
  Delete as Clear,
  NavigateBefore,
  NavigateNext,
  Save,
} from '@mui/icons-material';
import { IqraBookService } from '../services/iqraBookService';
import { useSession } from '../contexts/SessionContext';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';

const DrawingTool = {
  POINTER: 'pointer',
  BRUSH: 'brush',
  HIGHLIGHTER: 'highlighter',
};

const IqraBookViewer = ({ 
  bookId, 
  initialPage = 1, 
  onPageChange,
  readOnly = false,
  studentId = null, 
  showSaveButton = false 
}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [pageUrls, setPageUrls] = useState({});
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageUrl, setPageUrl] = useState(null);
  const [bookMetadata, setBookMetadata] = useState(null);
  const [currentTool, setCurrentTool] = useState(DrawingTool.POINTER);
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 1000 });
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const imageRef = useRef(null);

  const { activeSession, saveDrawing, updateStudentProgress } = useSession();
  const [pageImage] = useImage(pageUrl);

  useEffect(() => {
    if (bookId) {
      loadBookData();
    }
  }, [bookId]);

  useEffect(() => {
    if (initialPage !== currentPage) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        const url = pageUrls[currentPage];
        setPageUrl(url);
        if (onPageChange) {
          onPageChange(currentPage);
        }
        if (activeSession && studentId) {
          await updateStudentProgress(studentId, currentPage);
        }
      } catch (error) {
        console.error(error);
        setError('Failed to load page');
      }
    };

    loadPageData();
  }, [currentPage, pageUrls]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current && pageImage) {
        const container = containerRef.current;
        const containerWidth = container.offsetWidth - 40;
        const containerHeight = container.offsetHeight - 40;
        
        const imageRatio = pageImage.height / pageImage.width;
        let width = containerWidth;
        let height = width * imageRatio;

        if (height > containerHeight) {
          height = containerHeight;
          width = height / imageRatio;
        }

        setStageSize({
          width: width * (zoom / 100),
          height: height * (zoom / 100)
        });
      }
    };

    if (pageImage) {
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
    }

    return () => window.removeEventListener('resize', updateDimensions);
  }, [pageImage, zoom]);

  useEffect(() => {
    const loadDrawings = async () => {
      if (activeSession && studentId) {
        try {
          const sessionRef = doc(db, 'classes', activeSession.classId, 'sessions', activeSession.id);
          const sessionDoc = await getDoc(sessionRef);
          
          if (sessionDoc.exists()) {
            const sessionData = sessionDoc.data();
            const studentDrawings = sessionData.studentProgress[studentId]?.drawings[currentPage];
            
            if (studentDrawings) {
              setLines(studentDrawings);
            } else {
              setLines([]);
            }
          }
        } catch (error) {
          console.error('Error loading drawings:', error);
        }
      }
    };

    loadDrawings();
  }, [currentPage, activeSession, studentId]);

  const loadBookData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading book data for:', bookId);
      
      // Convert book ID to storage path format
      // e.g., "Iqra Book 1" -> "iqra-1"
      const bookFolder = bookId.toLowerCase()
        .replace(/iqra book (\d+)/i, 'iqra-$1')
        .replace(/\s+/g, '-');
      
      console.log('Book folder path:', bookFolder);
      
      const storage = getStorage();
      const bookRef = ref(storage, `iqra-books/${bookFolder}/pages`);
      
      console.log('Listing pages from:', bookRef.fullPath);
      
      // List all pages in the book directory
      const result = await listAll(bookRef);
      console.log('Found pages:', result.items.length);
      
      const pages = result.items.sort((a, b) => {
        // Extract page numbers from "page_X.png" format
        const pageA = parseInt(a.name.match(/page_(\d+)/i)?.[1] || '0');
        const pageB = parseInt(b.name.match(/page_(\d+)/i)?.[1] || '0');
        return pageA - pageB;
      });
      
      if (pages.length === 0) {
        throw new Error(`No pages found in book: ${bookFolder}`);
      }
      
      console.log('Total pages found:', pages.length);
      setTotalPages(pages.length);

      // Load URLs for current page and several pages ahead/behind
      const pagesToLoad = new Set([
        ...Array(5).fill().map((_, i) => currentPage - 2 + i), // 2 pages before, current, and 2 pages after
        ...Array(5).fill().map((_, i) => currentPage + 3 + i), // Next 5 pages
      ].filter(p => p > 0 && p <= pages.length));

      console.log('Loading pages:', [...pagesToLoad]);
      
      const urls = {};
      await Promise.all([...pagesToLoad].map(async (pageNum) => {
        const pageFile = pages.find(p => {
          const num = parseInt(p.name.match(/page_(\d+)/i)?.[1] || '0');
          return num === pageNum;
        });
        
        if (pageFile) {
          try {
            const url = await getDownloadURL(pageFile);
            urls[pageNum] = url;
            console.log('Loaded URL for page', pageNum);
          } catch (error) {
            console.error('Error loading page', pageNum, error);
          }
        }
      }));
      
      console.log('Loaded URLs:', Object.keys(urls));
      setPageUrls(prev => ({ ...prev, ...urls }));
      setLoading(false);
    } catch (err) {
      console.error('Error in loadBookData:', err);
      setError(err.message || 'Failed to load book data');
      setLoading(false);
    }
  };

  const loadPageData = async (pageNum) => {
    if (!pageUrls[pageNum] && pageNum > 0 && pageNum <= totalPages) {
      try {
        const bookFolder = bookId.toLowerCase()
          .replace(/iqra book (\d+)/i, 'iqra-$1')
          .replace(/\s+/g, '-');
        
        const storage = getStorage();
        const pageRef = ref(storage, `iqra-books/${bookFolder}/pages/page_${pageNum}.png`);
        const url = await getDownloadURL(pageRef);
        
        // Also load the next few pages proactively
        const nextPages = Array(3).fill().map((_, i) => pageNum + i + 1)
          .filter(p => p <= totalPages && !pageUrls[p]);
        
        const nextUrls = await Promise.all(nextPages.map(async (p) => {
          try {
            const nextRef = ref(storage, `iqra-books/${bookFolder}/pages/page_${p}.png`);
            const nextUrl = await getDownloadURL(nextRef);
            return [p, nextUrl];
          } catch (error) {
            console.error(`Error loading page ${p}:`, error);
            return null;
          }
        }));
        
        setPageUrls(prev => ({
          ...prev,
          [pageNum]: url,
          ...Object.fromEntries(nextUrls.filter(Boolean))
        }));
      } catch (error) {
        console.error(`Error loading page ${pageNum}:`, error);
      }
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      loadPageData(newPage);
      onPageChange?.(newPage);
    }
  };

  const handleZoom = (delta) => {
    setZoom(prev => Math.min(Math.max(50, prev + delta), 200));
  };

  const handleMouseDown = (e) => {
    if (currentTool === DrawingTool.POINTER || readOnly) return;
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, {
      tool: currentTool,
      points: [pos.x, pos.y],
      color: currentTool === DrawingTool.HIGHLIGHTER ? '#ffeb3b80' : '#ff0000',
      strokeWidth: currentTool === DrawingTool.HIGHLIGHTER ? 20 : 2,
    }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || currentTool === DrawingTool.POINTER || readOnly) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    setLines([...lines.slice(0, -1), lastLine]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleUndo = () => {
    setLines(lines.slice(0, -1));
  };

  const handleClear = () => {
    setLines([]);
  };

  const handleSaveDrawings = async () => {
    if (!activeSession || !studentId) return;
    
    try {
      await saveDrawing(studentId, currentPage, lines);
    } catch (error) {
      console.error('Error saving drawings:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Paper elevation={2} sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
          {error}
        </Paper>
      </Box>
    );
  }

  return (
    <Box 
      ref={containerRef}
      display="flex" 
      flexDirection="column" 
      height="100%"
      sx={{ backgroundColor: '#f5f5f5' }}
    >
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        p={1}
        sx={{ backgroundColor: '#fff', borderBottom: 1, borderColor: 'divider' }}
      >
        <Box display="flex" alignItems="center">
          <Tooltip title="Previous Page">
            <span>
              <IconButton 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <NavigateBefore />
              </IconButton>
            </span>
          </Tooltip>
          <Typography sx={{ mx: 2 }}>
            Page {currentPage} of {totalPages}
          </Typography>
          <Tooltip title="Next Page">
            <span>
              <IconButton 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <NavigateNext />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        <Box display="flex" alignItems="center">
          <Tooltip title="Zoom Out">
            <span>
              <IconButton onClick={() => handleZoom(-10)} disabled={zoom <= 50}>
                <ZoomOut />
              </IconButton>
            </span>
          </Tooltip>
          <Typography sx={{ mx: 1 }}>{zoom}%</Typography>
          <Tooltip title="Zoom In">
            <span>
              <IconButton onClick={() => handleZoom(10)} disabled={zoom >= 200}>
                <ZoomIn />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
      
      <Box 
        flex={1} 
        overflow="auto" 
        display="flex" 
        justifyContent="center" 
        alignItems="flex-start"
        p={2}
      >
        {pageUrls[currentPage] && (
          <img 
            ref={imageRef}
            src={pageUrls[currentPage]} 
            alt={`Page ${currentPage}`}
            style={{
              maxWidth: '100%',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s'
            }}
          />
        )}
      </Box>
      
      <Box px={2} py={1}>
        <Slider
          value={currentPage}
          min={1}
          max={totalPages}
          onChange={(_, value) => handlePageChange(value)}
          valueLabelDisplay="auto"
          valueLabelFormat={value => `Page ${value}`}
        />
      </Box>
    </Box>
  );
};

export default IqraBookViewer;
