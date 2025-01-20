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
  width = '100%',
  height = '100%',
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
  const containerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
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

  useEffect(() => {
    if (containerRef.current) {
      const updateSize = () => {
        const container = containerRef.current;
        if (container) {
          setStageSize({
            width: container.offsetWidth,
            height: container.offsetHeight
          });
        }
      };

      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

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
    setIsDrawing(true);

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const { x, y } = point;

    if (tool === 'dot') {
      // For dot tool, create a small circle
      const newLine = {
        tool,
        points: [x, y, x + 0.001, y + 0.001], // Tiny line to make a dot
        color,
        strokeWidth,
        isDot: true
      };
      setLines([...lines, newLine]);
      addToHistory([...lines, newLine]);
    } else {
      setLastPointerPosition(point);
      const newLine = {
        tool,
        points: [x, y],
        color,
        strokeWidth,
        tension: tool === 'brush' ? 0.5 : 0
      };
      setLines([...lines, newLine]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || readOnly) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (tool === 'dot') return; // Dots don't need mouse move handling

    const lastLine = lines[lines.length - 1];
    if (lastLine) {
      const newPoints = [...lastLine.points];
      
      if (tool === 'brush') {
        // Add points with smoothing for brush
        const { x: lastX, y: lastY } = lastPointerPosition;
        const { x, y } = point;
        
        // Calculate midpoint for smoothing
        const midX = (lastX + x) / 2;
        const midY = (lastY + y) / 2;
        
        newPoints.push(midX, midY);
        setLastPointerPosition(point);
      } else {
        // Regular points for pencil
        newPoints.push(point.x, point.y);
      }

      const updatedLines = lines.slice(0, -1);
      updatedLines.push({
        ...lastLine,
        points: newPoints
      });

      setLines(updatedLines);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    addToHistory([...lines]);
  };

  const handleSave = async () => {
    if (onSave) {
      const drawingData = {
        lines,
        width: stageSize.width,
        height: stageSize.height,
        timestamp: new Date().toISOString()
      };
      await onSave(drawingData);
    }
  };

  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        p: 1, 
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {!readOnly && (
          <>
            {/* Drawing Tools */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title="Pencil">
                <IconButton
                  color={tool === 'pencil' ? 'primary' : 'default'}
                  onClick={() => setTool('pencil')}
                  sx={{
                    bgcolor: tool === 'pencil' ? 'action.selected' : 'transparent'
                  }}
                >
                  <PencilIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Brush">
                <IconButton
                  color={tool === 'brush' ? 'primary' : 'default'}
                  onClick={() => setTool('brush')}
                  sx={{
                    bgcolor: tool === 'brush' ? 'action.selected' : 'transparent'
                  }}
                >
                  <BrushIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Dot">
                <IconButton
                  color={tool === 'dot' ? 'primary' : 'default'}
                  onClick={() => setTool('dot')}
                  sx={{
                    bgcolor: tool === 'dot' ? 'action.selected' : 'transparent'
                  }}
                >
                  <DotIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Size Control */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
              <Typography variant="body2" color="text.secondary">
                Size
              </Typography>
              <Slider
                value={strokeWidth}
                onChange={(_, value) => setStrokeWidth(value)}
                min={1}
                max={20}
                size="small"
                sx={{ 
                  width: '100px',
                  ml: 1
                }}
              />
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Color Control */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Color
              </Typography>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '2px solid',
                  borderColor: 'divider'
                }}
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{
                    width: '150%',
                    height: '150%',
                    margin: '-25%',
                    padding: 0,
                    border: 'none'
                  }}
                />
              </Box>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title="Show/Hide Grid">
                <IconButton
                  onClick={() => setShowGrid(!showGrid)}
                  color={showGrid ? 'primary' : 'default'}
                >
                  {showGrid ? <GridOffIcon /> : <GridIcon />}
                </IconButton>
              </Tooltip>

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

              <Tooltip title="Clear Canvas">
                <IconButton
                  onClick={handleClear}
                  color="error"
                >
                  <ClearIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Save Drawing">
                <span>
                  <IconButton
                    onClick={handleSave}
                    disabled={lines.length === 0}
                    color="primary"
                  >
                    <SaveIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, position: 'relative', minHeight: 0 }}>
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          <Layer>
            {/* Grid */}
            {showGrid && (
              <>
                {Array.from({ length: Math.ceil(stageSize.height / gridSize) }).map((_, i) => (
                  <Line
                    key={`h${i}`}
                    points={[0, i * gridSize, stageSize.width, i * gridSize]}
                    stroke={gridColor}
                    strokeWidth={gridStrokeWidth}
                  />
                ))}
                {Array.from({ length: Math.ceil(stageSize.width / gridSize) }).map((_, i) => (
                  <Line
                    key={`v${i}`}
                    points={[i * gridSize, 0, i * gridSize, stageSize.height]}
                    stroke={gridColor}
                    strokeWidth={gridStrokeWidth}
                  />
                ))}
              </>
            )}
            {/* Drawing Lines */}
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color || color}
                strokeWidth={line.isDot ? line.strokeWidth * 2 : line.strokeWidth}
                tension={line.tension || 0}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            ))}
          </Layer>
        </Stage>
      </Box>
    </Box>
  );
};

export default DrawingCanvas;
