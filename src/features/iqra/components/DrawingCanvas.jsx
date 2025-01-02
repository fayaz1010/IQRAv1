import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import { 
  Box, 
  IconButton, 
  Paper, 
  Tooltip, 
  Divider,
  Slider,
  Typography,
  useTheme
} from '@mui/material';
import {
  Brush as BrushIcon,
  RadioButtonUnchecked as DotIcon,
  GridOn as GridIcon,
  GridOff as GridOffIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Delete as ClearIcon,
  Edit as PencilIcon
} from '@mui/icons-material';

const DrawingCanvas = ({ 
  readOnly = false,
  onSave,
  savedDrawing = null,
  width = 800,
  height = 600,
  initialStrokeWidth = 3,
  initialColor = '#000000'
}) => {
  const [lines, setLines] = useState([]);
  const [tool, setTool] = useState('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [lastPointerPosition, setLastPointerPosition] = useState(null);
  const [strokeWidth, setStrokeWidth] = useState(initialStrokeWidth);
  const [color, setColor] = useState(initialColor);
  const stageRef = useRef(null);
  const theme = useTheme();

  // Grid configuration
  const gridSize = 20;
  const gridColor = '#CCCCCC';
  const gridStrokeWidth = 0.5;

  useEffect(() => {
    if (savedDrawing && savedDrawing.lines) {
      setLines(savedDrawing.lines);
      setHistory([savedDrawing.lines]);
      setHistoryStep(0);
    }
  }, [savedDrawing]);

  const addToHistory = (newLines) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newLines);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setLines(history[historyStep - 1]);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setLines(history[historyStep + 1]);
    }
  };

  const handleClear = () => {
    setLines([]);
    addToHistory([]);
  };

  const handleMouseDown = (e) => {
    if (readOnly) return;
    
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    setLastPointerPosition(pos);

    if (tool === 'dot') {
      // For dots, create them immediately on mouse down
      const newDot = {
        tool: 'dot',
        points: [pos.x, pos.y],
        strokeWidth,
        color,
        isDot: true
      };
      const newLines = [...lines, newDot];
      setLines(newLines);
      addToHistory(newLines);
    } else {
      setIsDrawing(true);
      const newLine = {
        tool: 'brush',
        points: [pos.x, pos.y],
        strokeWidth,
        color,
        isDot: false
      };
      setLines([...lines, newLine]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || readOnly || tool === 'dot') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastLine = lines[lines.length - 1];

    // Add points only if the distance is significant
    const dx = point.x - lastPointerPosition.x;
    const dy = point.y - lastPointerPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.5) {  // Reduced threshold for smoother lines
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      setLines([...lines.slice(0, -1), lastLine]);
      setLastPointerPosition(point);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setLastPointerPosition(null);
    addToHistory([...lines]);
  };

  const handleSave = async () => {
    if (onSave) {
      const drawingData = {
        lines,
        width,
        height,
        timestamp: new Date().toISOString()
      };
      await onSave(drawingData);
    }
  };

  // Generate grid lines
  const gridLines = showGrid ? Array.from({ length: Math.floor(width / gridSize) + Math.floor(height / gridSize) }, (_, i) => {
    const isVertical = i < Math.floor(width / gridSize);
    return {
      points: isVertical 
        ? [i * gridSize, 0, i * gridSize, height]
        : [0, (i - Math.floor(width / gridSize)) * gridSize, width, (i - Math.floor(width / gridSize)) * gridSize],
      stroke: gridColor,
      strokeWidth: gridStrokeWidth
    };
  }) : [];

  return (
    <Box sx={{ position: 'relative' }}>
      <Paper 
        elevation={3}
        sx={{ 
          p: 1.5,
          mb: 2,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#333' : '#f8f9fa',
          borderRadius: 2,
          border: '1px solid',
          borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'
        }}
      >
        {/* Drawing Tools */}
        <Box display="flex" gap={1}>
          <Tooltip title="Pencil Tool">
            <IconButton 
              onClick={() => setTool('pencil')}
              color={tool === 'pencil' ? 'primary' : 'default'}
              sx={{
                backgroundColor: tool === 'pencil' ? (theme) => 
                  theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(33, 150, 243, 0.08)' : 'transparent'
              }}
            >
              <PencilIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Brush Tool">
            <IconButton 
              onClick={() => setTool('brush')}
              color={tool === 'brush' ? 'primary' : 'default'}
              sx={{
                backgroundColor: tool === 'brush' ? (theme) => 
                  theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(33, 150, 243, 0.08)' : 'transparent'
              }}
            >
              <BrushIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Dot Tool">
            <IconButton 
              onClick={() => setTool('dot')}
              color={tool === 'dot' ? 'primary' : 'default'}
              sx={{
                backgroundColor: tool === 'dot' ? (theme) => 
                  theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(33, 150, 243, 0.08)' : 'transparent'
              }}
            >
              <DotIcon />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem />
          <Tooltip title={showGrid ? "Hide Grid" : "Show Grid"}>
            <IconButton 
              onClick={() => setShowGrid(!showGrid)}
              color={showGrid ? 'primary' : 'default'}
              sx={{
                backgroundColor: showGrid ? (theme) => 
                  theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(33, 150, 243, 0.08)' : 'transparent'
              }}
            >
              {showGrid ? <GridOffIcon /> : <GridIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Drawing Settings */}
        <Box display="flex" alignItems="center" gap={2} sx={{ flex: 1, mx: 2 }}>
          <Box sx={{ minWidth: 120 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Size
            </Typography>
            <Slider
              value={strokeWidth}
              onChange={(_, value) => setStrokeWidth(value)}
              min={1}
              max={20}
              disabled={readOnly}
              size="small"
              sx={{ 
                color: theme.palette.primary.main,
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                }
              }}
            />
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Color
            </Typography>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={readOnly}
              style={{ 
                width: '40px', 
                height: '30px',
                padding: 0,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box display="flex" gap={1}>
          <Tooltip title="Undo">
            <span>
              <IconButton 
                onClick={handleUndo}
                disabled={historyStep === 0}
              >
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo">
            <span>
              <IconButton 
                onClick={handleRedo}
                disabled={historyStep === history.length - 1}
              >
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Divider orientation="vertical" flexItem />
          <Tooltip title="Clear Canvas">
            <IconButton 
              onClick={handleClear}
              color="error"
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save Drawing">
            <IconButton 
              onClick={handleSave}
              disabled={readOnly || lines.length === 0}
              color="primary"
              sx={{
                '&.Mui-disabled': {
                  backgroundColor: 'transparent'
                }
              }}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={stageRef}
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: '#fff'
        }}
      >
        <Layer>
          {/* Grid Layer */}
          {gridLines.map((line, i) => (
            <Line
              key={`grid-${i}`}
              points={line.points}
              stroke={line.stroke}
              strokeWidth={line.strokeWidth}
            />
          ))}

          {/* Drawing Layer */}
          {lines.map((line, i) => (
            <Line
              key={`drawing-${i}`}
              points={line.points}
              stroke={line.color}
              strokeWidth={line.isDot ? line.strokeWidth * 2 : line.strokeWidth}
              lineCap="round"
              lineJoin="round"
              tension={0.5}
              {...(line.isDot && {
                tension: 0,
                closed: true,
                fill: line.color
              })}
              globalCompositeOperation="source-over"
            />
          ))}
        </Layer>
      </Stage>
    </Box>
  );
};

export default DrawingCanvas;
