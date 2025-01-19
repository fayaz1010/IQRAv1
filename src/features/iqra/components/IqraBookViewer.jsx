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
} from '@mui/icons-material';
import { IqraBookService } from '../services/iqraBookService';

const DrawingTool = {
  POINTER: 'pointer',
  BRUSH: 'brush',
  HIGHLIGHTER: 'highlighter',
};

const IqraBookViewer = ({ bookId, initialPage = 1, onPageChange, readOnly = false }) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(100);
  const [pageUrl, setPageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookMetadata, setBookMetadata] = useState(null);
  const [currentTool, setCurrentTool] = useState(DrawingTool.POINTER);
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 1000 });
  const containerRef = useRef(null);
  const stageRef = useRef(null);

  const [pageImage] = useImage(pageUrl);

  useEffect(() => {
    const loadBookData = async () => {
      try {
        const metadata = await IqraBookService.getBookMetadata(bookId);
        setBookMetadata(metadata);
        await loadPage(currentPage);
      } catch (error) {
        console.error(error);
        setError('Failed to load book data');
      } finally {
        setLoading(false);
      }
    };

    loadBookData();
  }, [bookId, currentPage]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current && pageImage) {
        const container = containerRef.current;
        const containerWidth = container.offsetWidth - 40; // Account for padding
        const containerHeight = container.offsetHeight - 40;
        
        // Calculate dimensions maintaining aspect ratio
        const imageRatio = pageImage.height / pageImage.width;
        let width = containerWidth;
        let height = width * imageRatio;

        // If height exceeds container, scale down
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

  const loadPage = async (pageNumber) => {
    try {
      const url = await IqraBookService.getPageUrl(bookId, pageNumber);
      setPageUrl(url);
      if (onPageChange) {
        onPageChange(pageNumber);
      }
    } catch (error) {
      console.error(error);
      setError('Failed to load page');
    }
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

  const handleZoom = (newZoom) => {
    setZoom(Math.max(50, Math.min(200, newZoom)));
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
    <Box ref={containerRef} sx={{ width: '100%', height: 'calc(100vh - 200px)', p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          {/* Navigation Controls */}
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              onClick={() => {
                const newPage = Math.max(1, currentPage - 1);
                setCurrentPage(newPage);
                loadPage(newPage);
              }}
              disabled={currentPage <= 1}
            >
              <NavigateBefore />
            </IconButton>
            <Box sx={{ minWidth: 100 }}>
              Page {currentPage} of {bookMetadata?.totalPages}
            </Box>
            <IconButton
              onClick={() => {
                const newPage = Math.min(bookMetadata?.totalPages || currentPage, currentPage + 1);
                setCurrentPage(newPage);
                loadPage(newPage);
              }}
              disabled={currentPage >= (bookMetadata?.totalPages || 1)}
            >
              <NavigateNext />
            </IconButton>
          </Stack>

          {/* Zoom Controls */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: 200 }}>
            <IconButton onClick={() => handleZoom(zoom - 10)} disabled={zoom <= 50}>
              <ZoomOut />
            </IconButton>
            <Slider
              value={zoom}
              onChange={(_, value) => handleZoom(value)}
              min={50}
              max={200}
              step={10}
              valueLabelDisplay="auto"
              valueLabelFormat={value => `${value}%`}
            />
            <IconButton onClick={() => handleZoom(zoom + 10)} disabled={zoom >= 200}>
              <ZoomIn />
            </IconButton>
          </Stack>

          {/* Drawing Tools */}
          {!readOnly && (
            <ButtonGroup>
              <Tooltip title="Brush">
                <IconButton
                  onClick={() => setCurrentTool(DrawingTool.BRUSH)}
                  color={currentTool === DrawingTool.BRUSH ? 'primary' : 'default'}
                >
                  <Brush />
                </IconButton>
              </Tooltip>
              <Tooltip title="Highlighter">
                <IconButton
                  onClick={() => setCurrentTool(DrawingTool.HIGHLIGHTER)}
                  color={currentTool === DrawingTool.HIGHLIGHTER ? 'primary' : 'default'}
                >
                  <Highlight />
                </IconButton>
              </Tooltip>
              <Tooltip title="Undo">
                <IconButton onClick={handleUndo} disabled={lines.length === 0}>
                  <Undo />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear">
                <IconButton onClick={handleClear} disabled={lines.length === 0}>
                  <Clear />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          )}
        </Stack>

        {/* Canvas */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'grey.100',
            borderRadius: 1,
            overflow: 'auto',
            flex: 1,
          }}
        >
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            ref={stageRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              cursor: currentTool === DrawingTool.POINTER ? 'default' : 'crosshair'
            }}
          >
            <Layer>
              {pageImage && (
                <KonvaImage
                  image={pageImage}
                  width={stageSize.width}
                  height={stageSize.height}
                />
              )}
              {lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.tool === DrawingTool.HIGHLIGHTER
                      ? 'multiply'
                      : 'source-over'
                  }
                />
              ))}
            </Layer>
          </Stage>
        </Box>
      </Stack>
    </Box>
  );
};

export default IqraBookViewer;
