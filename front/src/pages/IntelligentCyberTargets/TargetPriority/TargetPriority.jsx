import React, { useState } from 'react';
import { Button } from '@mui/material';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import ConsoleView from '../../Console/ConsoleView';

const TargetPriority = ({ open = true, isPopup = false }) => {
  const [isRunning, setIsRunning] = useState(true);
  const [consoleKey, setConsoleKey] = useState(0);

  const handleStart = () => setIsRunning(true);
  const handleStop = () => setIsRunning(false);
  const handleRestart = () => {
    setIsRunning(false);
    setTimeout(() => {
      setConsoleKey(prev => prev + 1);
      setIsRunning(true);
    }, 100);
  };

  const controls = (
    <>
      <Button size="small" variant="contained" onClick={handleStart} disabled={isRunning}
        startIcon={<PlayCircleOutlined />}
        sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, '&:disabled': { bgcolor: '#aaa' }, fontSize: '0.75rem', py: 0.5 }}>
        Start
      </Button>
      <Button size="small" variant="contained" onClick={handleStop} disabled={!isRunning}
        startIcon={<PauseCircleOutlined />}
        sx={{ bgcolor: '#b71c1c', '&:hover': { bgcolor: '#7f0000' }, '&:disabled': { bgcolor: '#aaa' }, fontSize: '0.75rem', py: 0.5 }}>
        Stop
      </Button>
      <Button size="small" variant="contained" onClick={handleRestart}
        startIcon={<ReloadOutlined />}
        sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' }, fontSize: '0.75rem', py: 0.5 }}>
        Restart
      </Button>
    </>
  );

  return <ConsoleView key={consoleKey} type="targetPriority" open={isRunning} isPopup={isPopup} controls={controls} />;
};

export default TargetPriority;
