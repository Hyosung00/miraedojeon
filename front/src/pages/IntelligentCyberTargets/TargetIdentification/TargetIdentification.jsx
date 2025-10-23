import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@mui/material';

const FusionDBConsole = ({ open = true, isPopup = false }) => {
  const [displayText, setDisplayText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const animationIntervalRef = React.useRef(null);
  const cursorIntervalRef = React.useRef(null);

  useEffect(() => {
    if (open) {
      // 팝업이 열릴 때 상태 초기화 및 파일 내용 자동 로드
      setDisplayText('');
      setIsLoading(false);
      loadFileContent();
      
      // 커서 깜빡임 효과
      cursorIntervalRef.current = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
    } else {
      // 팝업이 닫힐 때 모든 interval 정리 및 상태 초기화
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
        cursorIntervalRef.current = null;
      }
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setDisplayText('');
      setIsLoading(false);
    }

    // cleanup: 컴포넌트 언마운트 시 모든 interval 정리
    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [open]);

  const loadFileContent = async () => {
    setIsLoading(true);
    setDisplayText(''); // 로드 시작 전 텍스트 초기화
    try {
      // 백엔드 API에서 파일 내용 가져오기
      const response = await fetch('/api/read-info-file?file=inter.txt');
      const text = await response.text();
      animateText(text);
    } catch (error) {
      console.error('파일 로드 실패:', error);
      setDisplayText('파일을 로드할 수 없습니다.');
      setIsLoading(false);
    }
  };

  const animateText = (text) => {
    // 이전 애니메이션이 있다면 정리
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

    let i = 0;
    setDisplayText('');
    setIsLoading(true);
    
    animationIntervalRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayText((prev) => prev + text[i]);
        i++;
      } else {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
        setIsLoading(false);
      }
    }, 15); // 50ms마다 한 글자씩 출력
  };

  return (
    <Card 
      component="main"
      role="main"
      aria-label="표적 식별"
      sx={{
        width: '100%',
        height: isPopup ? '100%' : 'calc(100vh - 120px)',
        bgcolor: 'background.paper',
        boxShadow: 3,
        m: 0
      }}
    >
      <CardContent sx={{
        p: 1,
        height: '100%',
        '&:last-child': { pb: 1 },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto'
      }}>
        <div style={{
          background: '#f0edfd',
          color: '#39306b',
          padding: '20px',
          fontFamily: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', Arial, Helvetica, sans-serif",
          height: '100%',
          fontSize: '14px',
          lineHeight: '1.5',
          overflow: 'auto',
          borderRadius: '4px'
        }}>
          <div style={{ 
            borderBottom: '2px solid #39306b', 
            paddingBottom: '10px', 
            marginBottom: '20px' 
          }}>
            <h2 style={{ margin: 0 }}>네트워크 구조 분석 및 표적 식별</h2>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              Loading ~ Neo4j - neo4j+s://eff16e19.databases.neo4j.io
n
            </div>
          </div>
          
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            position: 'relative'
          }}>
            {displayText}
            {isLoading && (
              <span style={{ 
                display: 'inline-block',
                width: '8px',
                height: '16px',
                backgroundColor: '#0f0',
                marginLeft: '2px',
                animation: showCursor ? 'none' : 'blink 1s step-end infinite',
                opacity: showCursor ? 1 : 0
              }}>
                {showCursor ? '█' : ''}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FusionDBConsole;
