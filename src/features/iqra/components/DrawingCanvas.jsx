import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { 
  Box, 
  Stack, 
  IconButton, 
  Menu, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Tooltip 
} from '@mui/material';
import {
  Brush as BrushIcon,
  Create as PencilIcon,
  Palette as PaletteIcon,
  Undo as UndoIcon,
  Delete as ClearIcon,
  Save as SaveIcon,
  FormatColorFill as HighlighterIcon
} from '@mui/icons-material';

const GRID_SIZE = 20;
const COLORS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
const BRUSH_SIZES = [1, 2, 4, 8, 16];

const DrawingCanvas = ({ initialDrawing, onSave, readOnly }) => {
  const [lines, setLines] = useState(initialDrawing?.lines || []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('brush');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [currentLine, setCurrentLine] = useState(null);
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [colorMenuAnchor, setColorMenuAnchor] = useState(null);

  const stageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (initialDrawing?.lines) {
      setLines(initialDrawing.lines);
    }
  }, [initialDrawing]);

  useEffect(() => {
    if (containerRef.current) {
      const updateSize = () => {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setStageSize({ width, height });
      };
      
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  const handleMouseDown = (e) => {
    if (readOnly) return;

    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setCurrentLine({
      tool,
      color,
      brushSize,
      points: [pos.x, pos.y]
    });
    setDrawingHistory([...lines]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentLine || readOnly) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastLine = currentLine;
    
    // Add points with smoothing
    const newPoints = [...lastLine.points];
    if (tool === 'brush') {
      // Add control point for smoother curves
      const lastX = newPoints[newPoints.length - 2];
      const lastY = newPoints[newPoints.length - 1];
      const dx = point.x - lastX;
      const dy = point.y - lastY;
      const controlX = lastX + dx * 0.5;
      const controlY = lastY + dy * 0.5;
      newPoints.push(controlX, controlY);
    }
    newPoints.push(point.x, point.y);

    setCurrentLine({
      ...lastLine,
      points: newPoints
    });
    
    setLines([...lines, currentLine]);
  };

  const handleMouseUp = () => {
    if (readOnly) return;

    setIsDrawing(false);
    if (currentLine) {
      const newLines = [...lines, currentLine];
      setLines(newLines);
      onSave?.({ lines: newLines });
    }
  };

  const handleUndo = () => {
    if (readOnly) return;

    if (drawingHistory.length > 0) {
      setLines(drawingHistory);
      setDrawingHistory([]);
      onSave?.({ lines: drawingHistory });
    }
  };

  const handleClear = () => {
    if (readOnly) return;

    setDrawingHistory([...lines]);
    setLines([]);
    onSave?.({ lines: [] });
  };

  const renderGrid = () => {
    const gridLines = [];
    const { width, height } = stageSize;
    
    // Vertical lines
    for (let i = 0; i < width; i += GRID_SIZE) {
      gridLines.push(
        <Line
          key={`v${i}`}
          points={[i, 0, i, height]}
          stroke="#eee"
          strokeWidth={0.5}
        />
      );
    }
    
    // Horizontal lines
    for (let i = 0; i < height; i += GRID_SIZE) {
      gridLines.push(
        <Line
          key={`h${i}`}
          points={[0, i, width, i]}
          stroke="#eee"
          strokeWidth={0.5}
        />
      );
    }
    
    return gridLines;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!readOnly && (
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Drawing Tools */}
            <Stack direction="row" spacing={1}>
              <Tooltip title="Brush">
                <IconButton 
                  onClick={() => setTool('brush')}
                  color={tool === 'brush' ? 'primary' : 'default'}
                >
                  <BrushIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Pencil">
                <IconButton 
                  onClick={() => setTool('pencil')}
                  color={tool === 'pencil' ? 'primary' : 'default'}
                >
                  <PencilIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Highlighter">
                <IconButton 
                  onClick={() => setTool('highlighter')}
                  color={tool === 'highlighter' ? 'primary' : 'default'}
                >
                  <HighlighterIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            {/* Color Picker */}
            <IconButton onClick={(e) => setColorMenuAnchor(e.currentTarget)}>
              <PaletteIcon sx={{ color }} />
            </IconButton>
            <Menu
              anchorEl={colorMenuAnchor}
              open={Boolean(colorMenuAnchor)}
              onClose={() => setColorMenuAnchor(null)}
            >
              <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5 }}>
                {COLORS.map((c) => (
                  <Box
                    key={c}
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: c,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: c === color ? '2px solid #000' : '1px solid #ccc',
                    }}
                    onClick={() => {
                      setColor(c);
                      setColorMenuAnchor(null);
                    }}
                  />
                ))}
              </Box>
            </Menu>

            {/* Brush Size */}
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Brush Size</InputLabel>
              <Select
                value={brushSize}
                onChange={(e) => setBrushSize(e.target.value)}
                label="Brush Size"
              >
                {BRUSH_SIZES.map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}px
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Action Buttons */}
            <Stack direction="row" spacing={1}>
              <Tooltip title="Undo">
                <IconButton onClick={handleUndo}>
                  <UndoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear">
                <IconButton onClick={handleClear} color="error">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Save">
                <IconButton 
                  onClick={() => onSave?.({ lines })} 
                  color="primary"
                >
                  <SaveIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>
      )}

      <Box 
        ref={containerRef}
        sx={{ 
          flex: 1,
          border: '1px solid #ccc',
          borderRadius: 1,
          backgroundColor: '#fff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onMouseleave={handleMouseUp}
          ref={stageRef}
        >
          <Layer>
            {renderGrid()}
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.brushSize}
                tension={line.tool === 'brush' ? 0.5 : 0}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.tool === 'highlighter' ? 'multiply' : 'source-over'
                }
              />
            ))}
            {currentLine && (
              <Line
                points={currentLine.points}
                stroke={currentLine.color}
                strokeWidth={currentLine.brushSize}
                tension={currentLine.tool === 'brush' ? 0.5 : 0}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  currentLine.tool === 'highlighter' ? 'multiply' : 'source-over'
                }
              />
            )}
          </Layer>
        </Stage>
      </Box>
    </Box>
  );
};

export default DrawingCanvas;
