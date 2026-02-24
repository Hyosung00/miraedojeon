import { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import interactionTracker from '../../../../utils/interactionTracker';

// 타이핑 애니메이션
const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const Cursor = styled('span')({
  animation: `${blink} 1s infinite`,
  marginLeft: '2px'
});

// 데이터 수집 단계
const DATA_COLLECTION_STEPS = [
  { id: 1, text: '🌐 BGP Archive 데이터 소스 연결 중...', duration: 2000 },
  { id: 2, text: '📥 라우팅 정보 수집 중...', duration: 3000 },
  { id: 3, text: '🔍 AS(Autonomous System) 정보 분석 중...', duration: 2500 },
  { id: 4, text: '💾 MongoDB에 저장 중...', duration: 2000 },
  { id: 5, text: '✅ 데이터 저장 완료!', duration: 1500 }
];

export default function DataCollectionStorage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [progress, setProgress] = useState(0);

  // 타이핑 효과
  useEffect(() => {
    if (currentStep >= DATA_COLLECTION_STEPS.length) {
      setIsTyping(false);
      return;
    }

    const step = DATA_COLLECTION_STEPS[currentStep];
    const text = step.text;
    let charIndex = 0;

    setDisplayText('');
    setIsTyping(true);
    
    // 단계 시작 추적
    interactionTracker.log('DataCollectionStorage', 'Step Started', { 
      step: currentStep + 1, 
      stepText: step.text,
      totalSteps: DATA_COLLECTION_STEPS.length 
    });

    const typingInterval = setInterval(() => {
      if (charIndex < text.length) {
        setDisplayText(text.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
        
        // 다음 단계로 이동
        setTimeout(() => {
          if (currentStep < DATA_COLLECTION_STEPS.length - 1) {
            interactionTracker.log('DataCollectionStorage', 'Step Completed', { 
              completedStep: currentStep + 1,
              nextStep: currentStep + 2 
            });
            setCurrentStep(prev => prev + 1);
            setProgress(((currentStep + 2) / DATA_COLLECTION_STEPS.length) * 100);
          } else {
            interactionTracker.log('DataCollectionStorage', 'All Steps Completed', { 
              totalSteps: DATA_COLLECTION_STEPS.length 
            });
          }
        }, 1000);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [currentStep]);

  // 자동 반복
  useEffect(() => {
    if (currentStep === DATA_COLLECTION_STEPS.length - 1 && !isTyping) {
      const resetTimer = setTimeout(() => {
        interactionTracker.log('DataCollectionStorage', 'Pipeline Reset - Restarting', {});
        setCurrentStep(0);
        setProgress(0);
      }, 3000);

      return () => clearTimeout(resetTimer);
    }
  }, [currentStep, isTyping]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#0a0e27',
        position: 'relative',
        overflow: 'hidden',
        p: 4
      }}
    >
      {/* 배경 효과 */}
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
          animation: 'pulse 3s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 0.5 },
            '50%': { opacity: 1 }
          }
        }}
      />

      {/* 메인 컨텐츠 */}
      <Box sx={{ zIndex: 1, textAlign: 'center', width: '100%', maxWidth: 600 }}>
        {/* 타이틀 */}
        <Typography
          variant="h3"
          sx={{
            color: '#fff',
            fontWeight: 'bold',
            mb: 4,
            textShadow: '0 0 20px rgba(99, 102, 241, 0.5)'
          }}
        >
          💾 BGP Archive Data Pipeline
        </Typography>

        {/* 현재 단계 표시 */}
        <Box
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 2,
            p: 3,
            mb: 3,
            minHeight: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: '#fff',
              fontFamily: 'monospace',
              letterSpacing: 1
            }}
          >
            {displayText}
            {isTyping && <Cursor>|</Cursor>}
          </Typography>
        </Box>

        {/* 프로그레스 바 */}
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                bgcolor: '#6366f1',
                boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
              }
            }}
          />
        </Box>

        {/* 진행률 */}
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: 'monospace'
          }}
        >
          {Math.round(progress)}% 완료 | 단계 {currentStep + 1} / {DATA_COLLECTION_STEPS.length}
        </Typography>

        {/* 완료된 단계 목록 */}
        <Box sx={{ mt: 4, textAlign: 'left' }}>
          {DATA_COLLECTION_STEPS.slice(0, currentStep).map((step) => (
            <Typography
              key={step.id}
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.4)',
                fontFamily: 'monospace',
                mb: 0.5,
                textDecoration: 'line-through'
              }}
            >
              {step.text}
            </Typography>
          ))}
        </Box>
      </Box>

      {/* 장식용 데이터 플로우 애니메이션 */}
      {[...Array(5)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: 4,
            height: 4,
            bgcolor: '#6366f1',
            borderRadius: '50%',
            opacity: 0.6,
            animation: `float${i} ${3 + i}s ease-in-out infinite`,
            left: `${20 + i * 15}%`,
            '@keyframes float0': {
              '0%, 100%': { transform: 'translateY(0)', opacity: 0 },
              '50%': { transform: 'translateY(-100px)', opacity: 0.6 }
            },
            '@keyframes float1': {
              '0%, 100%': { transform: 'translateY(0)', opacity: 0 },
              '50%': { transform: 'translateY(-120px)', opacity: 0.6 }
            },
            '@keyframes float2': {
              '0%, 100%': { transform: 'translateY(0)', opacity: 0 },
              '50%': { transform: 'translateY(-90px)', opacity: 0.6 }
            },
            '@keyframes float3': {
              '0%, 100%': { transform: 'translateY(0)', opacity: 0 },
              '50%': { transform: 'translateY(-110px)', opacity: 0.6 }
            },
            '@keyframes float4': {
              '0%, 100%': { transform: 'translateY(0)', opacity: 0 },
              '50%': { transform: 'translateY(-95px)', opacity: 0.6 }
            }
          }}
        />
      ))}
    </Box>
  );
}
