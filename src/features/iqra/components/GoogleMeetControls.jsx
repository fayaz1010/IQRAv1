import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Typography,
  Paper
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Edit as WhiteboardIcon,
  ExitToApp as LeaveIcon
} from '@mui/icons-material';

const GoogleMeetControls = ({ meetLink, onError }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [meetWindow, setMeetWindow] = useState(null);

  useEffect(() => {
    setIsLoading(false); // No need to load API anymore
  }, []);

  const openMeet = () => {
    if (!meetWindow || meetWindow.closed) {
      const newWindow = window.open(meetLink, '_blank', 'width=800,height=600');
      setMeetWindow(newWindow);
    } else {
      meetWindow.focus();
    }
  };

  const handleAction = (action) => {
    if (meetWindow && !meetWindow.closed) {
      meetWindow.postMessage({ action }, '*');
    } else {
      openMeet();
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" p={2}>
        <CircularProgress size={24} />
        <Typography variant="body2" ml={1}>
          Loading Meet controls...
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Box display="flex" gap={1} alignItems="center">
        <Tooltip title={isCameraOn ? "Turn off camera" : "Turn on camera"}>
          <IconButton onClick={() => {
            setIsCameraOn(!isCameraOn);
            handleAction('toggleCamera');
          }}>
            {isCameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={isMicOn ? "Turn off microphone" : "Turn on microphone"}>
          <IconButton onClick={() => {
            setIsMicOn(!isMicOn);
            handleAction('toggleMic');
          }}>
            {isMicOn ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={isScreenSharing ? "Stop sharing screen" : "Share screen"}>
          <IconButton onClick={() => {
            setIsScreenSharing(!isScreenSharing);
            handleAction('toggleScreenShare');
          }}>
            {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Open whiteboard">
          <IconButton onClick={() => handleAction('openWhiteboard')}>
            <WhiteboardIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Join/Leave meeting">
          <IconButton 
            onClick={openMeet}
            sx={{ 
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'error.dark',
              }
            }}
          >
            <LeaveIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default GoogleMeetControls;
