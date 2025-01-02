import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import {
  Box,
  IconButton,
  ButtonGroup,
  Tooltip,
  Slider,
  Typography,
  Paper,
} from '@mui/material';
import {
  Brush,
  Undo,
  Delete as Clear,
  Save,
  RadioButtonUnchecked,
} from '@mui/icons-material';

const DrawingCanvas = ({ onSave, readOnly = false }) => {
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('brush');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [color, setColor] = useState('#000000');
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef(null);
  const [lastPointerPosition, setLastPointerPosition] = useState(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setStageSize({
          width: offsetWidth - 20,
          height: offsetHeight - 60
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

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
      setLines([...lines, newDot]);
    } else {
      // For brush strokes, start drawing
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
    setIsDrawing(false);
    setLastPointerPosition(null);
  };

  const handleUndo = () => {
    setLines(lines.slice(0, -1));
  };

  const handleClear = () => {
    setLines([]);
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave(lines);
      } catch (error) {
        console.error('Error saving drawing:', error);
      }
    }
  };

  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Paper sx={{ p: 1, mb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <ButtonGroup>
            <Tooltip title="Brush">
              <IconButton 
                color={tool === 'brush' ? 'primary' : 'default'}
                onClick={() => setTool('brush')}
                disabled={readOnly}
              >
                <Brush />
              </IconButton>
            </Tooltip>
            <Tooltip title="Dot">
              <IconButton 
                color={tool === 'dot' ? 'primary' : 'default'}
                onClick={() => setTool('dot')}
                disabled={readOnly}
              >
                <RadioButtonUnchecked />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          <Box sx={{ width: 200, mx: 2 }}>
            <Typography gutterBottom>Stroke Width</Typography>
            <Slider
              value={strokeWidth}
              onChange={(_, value) => setStrokeWidth(value)}
              min={1}
              max={20}
              disabled={readOnly}
            />
          </Box>

          <Box>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={readOnly}
              style={{ 
                width: '40px', 
                height: '40px',
                padding: 0,
                border: 'none'
              }}
            />
          </Box>

          <ButtonGroup>
            <Tooltip title="Undo">
              <span>
                <IconButton 
                  onClick={handleUndo}
                  disabled={readOnly || lines.length === 0}
                >
                  <Undo />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Clear">
              <span>
                <IconButton 
                  onClick={handleClear}
                  disabled={readOnly || lines.length === 0}
                >
                  <Clear />
                </IconButton>
              </span>
            </Tooltip>
            {onSave && (
              <Tooltip title="Save">
                <span>
                  <IconButton 
                    onClick={handleSave}
                    disabled={readOnly || lines.length === 0}
                    color="primary"
                  >
                    <Save />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </ButtonGroup>
        </Box>
      </Paper>

      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onMouseleave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        ref={stageRef}
        style={{ 
          backgroundColor: '#fff',
          borderRadius: '4px',
          border: '1px solid #ccc'
        }}
      >
        <Layer>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.color}
              strokeWidth={line.isDot ? line.strokeWidth * 2 : line.strokeWidth}
              lineCap="round"
              lineJoin="round"
              tension={0.5}
              // For dots, use a circle shape
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
