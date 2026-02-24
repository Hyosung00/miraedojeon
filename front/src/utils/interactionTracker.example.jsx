/**
 * interactionTracker 사용 예제
 * 
 * 이 파일은 interactionTracker를 다양한 상황에서 어떻게 사용하는지 보여주는 예제입니다.
 */

import { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import interactionTracker from './interactionTracker';

function ExampleComponent({ userId }) {
  const [count, setCount] = useState(0);
  const [data, setData] = useState(null);
  
  // 1. 컴포넌트 마운트/언마운트 추적
  useEffect(() => {
    const mountTime = interactionTracker.trackMount('ExampleComponent', { userId });
    
    return () => {
      interactionTracker.trackUnmount('ExampleComponent', mountTime);
    };
  }, [userId]);

  // 2. State 변경 추적
  const prevCountRef = useRef(count);
  useEffect(() => {
    if (prevCountRef.current !== count) {
      interactionTracker.trackStateChange('ExampleComponent', 'count', prevCountRef.current, count);
      prevCountRef.current = count;
    }
  }, [count]);

  // 3. 버튼 클릭 - 간단한 로그
  const handleSimpleClick = () => {
    interactionTracker.log('ExampleComponent', 'Simple Button Click', {
      count,
      timestamp: new Date()
    });
    setCount(count + 1);
  };

  // 4. 버튼 클릭 - 반응 시간 측정 (동기)
  const handleSyncClick = () => {
    const startTime = performance.now();
    
    interactionTracker.log('ExampleComponent', 'Sync Button Click', {
      count,
      action: 'increment'
    });
    
    // 동기 작업 수행
    setCount(count + 1);
    
    const endTime = performance.now();
    console.log(`⏱️  버튼 클릭 반응 시간: ${(endTime - startTime).toFixed(2)}ms`);
  };

  // 5. 버튼 클릭 - 비동기 작업 반응 시간 측정
  const handleAsyncClick = async () => {
    await interactionTracker.measureResponse(
      'ExampleComponent',
      'Async Data Fetch',
      async () => {
        // 비동기 작업 시뮬레이션
        const response = await fetch('/api/data');
        const result = await response.json();
        setData(result);
        return result;
      },
      { userId, count }
    );
  };

  // 6. measureSimple 사용 예제
  const handleMeasureSimpleClick = () => {
    const endMeasure = interactionTracker.measureSimple('간단한 작업');
    
    // 작업 수행
    setCount(count + 1);
    
    // 측정 종료
    endMeasure();
  };

  // 7. measureResponseSync 사용 예제
  const handleSyncMeasureClick = () => {
    const { result, responseTime } = interactionTracker.measureResponseSync(
      'ExampleComponent',
      'Synchronous Calculation',
      () => {
        // 복잡한 계산 수행
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
          sum += i;
        }
        setCount(count + 1);
        return sum;
      },
      { count }
    );
    
    console.log('계산 결과:', result, '시간:', responseTime);
  };

  // 8. try-catch와 함께 사용
  const handleErrorClick = async () => {
    try {
      await interactionTracker.measureResponse(
        'ExampleComponent',
        'Error Test',
        async () => {
          // 에러를 발생시키는 작업
          throw new Error('테스트 에러');
        },
        { userId }
      );
    } catch (error) {
      console.error('에러가 발생했지만 추적되었습니다:', error);
    }
  };

  return (
    <div>
      <h2>interactionTracker 사용 예제</h2>
      
      <div>
        <p>Count: {count}</p>
        
        {/* 1. 간단한 로그 */}
        <Button onClick={handleSimpleClick}>
          간단한 로그
        </Button>
        
        {/* 2. 동기 작업 측정 */}
        <Button onClick={handleSyncClick}>
          동기 작업 측정
        </Button>
        
        {/* 3. 비동기 작업 측정 */}
        <Button onClick={handleAsyncClick}>
          비동기 작업 측정
        </Button>
        
        {/* 4. measureSimple 사용 */}
        <Button onClick={handleMeasureSimpleClick}>
          간단한 측정
        </Button>
        
        {/* 5. measureResponseSync 사용 */}
        <Button onClick={handleSyncMeasureClick}>
          동기 함수 측정
        </Button>
        
        {/* 6. 에러 처리 테스트 */}
        <Button onClick={handleErrorClick}>
          에러 테스트
        </Button>
      </div>
      
      {data && (
        <div>
          <h3>데이터:</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default ExampleComponent;

/**
 * 사용 가능한 메서드:
 * 
 * 1. interactionTracker.log(componentName, actionType, data)
 *    - 간단한 상호작용 로깅
 *    - 반환값: 없음
 * 
 * 2. interactionTracker.measureResponse(componentName, actionType, asyncFn, data)
 *    - 비동기 작업의 반응 시간 측정
 *    - 반환값: Promise<{result, responseTime}>
 * 
 * 3. interactionTracker.measureResponseSync(componentName, actionType, syncFn, data)
 *    - 동기 작업의 반응 시간 측정
 *    - 반환값: {result, responseTime}
 * 
 * 4. interactionTracker.measureSimple(label)
 *    - 간단한 반응 시간 측정 (시작 함수 호출 후 종료 함수 반환)
 *    - 반환값: () => responseTime
 * 
 * 5. interactionTracker.trackMount(componentName, props)
 *    - 컴포넌트 마운트 추적
 *    - 반환값: mountTime (언마운트 시 사용)
 * 
 * 6. interactionTracker.trackUnmount(componentName, mountTime)
 *    - 컴포넌트 언마운트 추적
 *    - 반환값: 없음
 * 
 * 7. interactionTracker.trackStateChange(componentName, stateName, oldValue, newValue)
 *    - State 변경 추적
 *    - 반환값: 없음
 */
