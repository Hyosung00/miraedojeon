import React, { useState } from 'react';
import { Card, CardContent, Button } from '@mui/material';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import ConsoleView from '../../Console/ConsoleView';

const TreatAnalysis = ({ open = true, isPopup = false }) => {
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

  return (
    <Card sx={{
      width: '100%',
      height: isPopup ? '100%' : 'calc(97vh - 93px)',
      bgcolor: 'background.paper',
      boxShadow: 3,
      m: 0
    }}>
      <CardContent sx={{
        p: 1,
        height: '100%',
        '&:last-child': { pb: 1 },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          background: '#f0edfd',
          color: '#39306b',
          padding: '20px',
          fontFamily: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', Arial, Helvetica, sans-serif",
          height: '100%',
          fontSize: '14px',
          lineHeight: '1.5',
          overflow: 'hidden',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* 헤더 */}
          <div style={{
            borderBottom: '2px solid #39306b',
            paddingBottom: '10px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexShrink: 0
          }}>
            <div>
              <h2 style={{ margin: 0 }}>위험 노출도 및 공격 가능도 측정</h2>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>
                Loading ~ Neo4j - neo4j+s://eff16e19.databases.neo4j.io
              </div>
            </div>
            {/* 제어 버튼 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                size="small"
                variant="contained"
                onClick={handleStart}
                disabled={isRunning}
                startIcon={<PlayCircleOutlined />}
                sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, '&:disabled': { bgcolor: '#aaa' }, fontSize: '0.75rem', py: 0.5 }}
              >
                Start
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleStop}
                disabled={!isRunning}
                startIcon={<PauseCircleOutlined />}
                sx={{ bgcolor: '#b71c1c', '&:hover': { bgcolor: '#7f0000' }, '&:disabled': { bgcolor: '#aaa' }, fontSize: '0.75rem', py: 0.5 }}
              >
                Stop
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleRestart}
                startIcon={<ReloadOutlined />}
                sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' }, fontSize: '0.75rem', py: 0.5 }}
              >
                Restart
              </Button>
            </div>
          </div>
          {/* 출력 영역 */}
          <div style={{ flex: 1, minHeight: 0, borderRadius: '4px', overflow: 'auto' }}>
            <ConsoleView
              key={consoleKey}
              type="treatAnalysis"
              open={isRunning}
              isPopup={true}
              bare={true}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TreatAnalysis;
