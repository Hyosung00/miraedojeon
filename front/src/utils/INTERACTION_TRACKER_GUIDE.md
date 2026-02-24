# Interaction Tracker 사용 가이드

사용자 상호작용을 추적하고 반응 시간을 측정하는 유틸리티입니다.

## 설치

```javascript
import interactionTracker from '../../../utils/interactionTracker';
```

## 주요 기능

### 1. 기본 상호작용 로깅

사용자의 클릭, 선택 등의 상호작용을 콘솔에 로깅합니다.

```javascript
interactionTracker.log('ComponentName', 'Button Click', {
  buttonId: 'submit',
  userId: 123
});
```

**출력 예시:**
```
╔════════════════════════════════════════════════════════════════
║ 🔍 상호작용 추적 로그
╠════════════════════════════════════════════════════════════════
║ ⏰ 시각: 2026-02-24T10:30:45.123Z
║ 📦 컴포넌트: ComponentName
║ 🎯 액션: Button Click
║ 📊 데이터: { buttonId: 'submit', userId: 123 }
╚════════════════════════════════════════════════════════════════
```

### 2. 비동기 작업 반응 시간 측정

비동기 함수의 실행 시간을 자동으로 측정하고 로깅합니다.

```javascript
const handleAsyncClick = async () => {
  await interactionTracker.measureResponse(
    'ComponentName',
    'Fetch Data',
    async () => {
      const response = await fetch('/api/data');
      const data = await response.json();
      return data;
    },
    { userId: 123 }
  );
};
```

**출력 예시:**
```
⚡ 반응 시간 측정 시작
...
✅ 반응 시간 측정 완료
⏱️  반응 시간: 234.56ms (0.235초)
```

### 3. 동기 작업 반응 시간 측정

동기 함수의 실행 시간을 측정합니다.

```javascript
const handleClick = () => {
  const { result, responseTime } = interactionTracker.measureResponseSync(
    'ComponentName',
    'Calculate Sum',
    () => {
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += i;
      }
      return sum;
    },
    { iterations: 1000000 }
  );
  
  console.log('결과:', result, '시간:', responseTime);
};
```

### 4. 간단한 반응 시간 측정

최소한의 로깅으로 빠르게 시간을 측정합니다.

```javascript
const handleClick = () => {
  const endMeasure = interactionTracker.measureSimple('버튼 클릭');
  
  // 작업 수행
  doSomething();
  
  // 측정 종료 및 시간 출력
  const responseTime = endMeasure(); // ⏱️  버튼 클릭 반응 시간: 12.34ms
};
```

### 5. 컴포넌트 생명주기 추적

컴포넌트의 마운트와 언마운트를 추적합니다.

```javascript
function MyComponent({ userId }) {
  useEffect(() => {
    // 마운트 시간 기록
    const mountTime = interactionTracker.trackMount('MyComponent', { userId });
    
    return () => {
      // 언마운트 및 생존 시간 출력
      interactionTracker.trackUnmount('MyComponent', mountTime);
    };
  }, [userId]);
  
  return <div>컴포넌트 내용</div>;
}
```

### 6. State 변경 추적

React State의 변경을 추적합니다.

```javascript
function MyComponent() {
  const [count, setCount] = useState(0);
  const prevCountRef = useRef(count);
  
  useEffect(() => {
    if (prevCountRef.current !== count) {
      interactionTracker.trackStateChange(
        'MyComponent',
        'count',
        prevCountRef.current,
        count
      );
      prevCountRef.current = count;
    }
  }, [count]);
  
  return <button onClick={() => setCount(count + 1)}>+</button>;
}
```

## API 참조

### `interactionTracker.log(componentName, actionType, data)`

**매개변수:**
- `componentName` (string): 컴포넌트 이름
- `actionType` (string): 액션 타입 (예: 'Button Click')
- `data` (object): 추가 데이터

**반환값:** 없음

---

### `interactionTracker.measureResponse(componentName, actionType, asyncFn, data)`

**매개변수:**
- `componentName` (string): 컴포넌트 이름
- `actionType` (string): 액션 타입
- `asyncFn` (async function): 측정할 비동기 함수
- `data` (object): 입력 데이터

**반환값:** `Promise<{result: any, responseTime: number}>`

---

### `interactionTracker.measureResponseSync(componentName, actionType, syncFn, data)`

**매개변수:**
- `componentName` (string): 컴포넌트 이름
- `actionType` (string): 액션 타입
- `syncFn` (function): 측정할 동기 함수
- `data` (object): 입력 데이터

**반환값:** `{result: any, responseTime: number}`

---

### `interactionTracker.measureSimple(label)`

**매개변수:**
- `label` (string): 측정 라벨

**반환값:** `() => number` (종료 함수, 호출 시 반응 시간 반환)

---

### `interactionTracker.trackMount(componentName, props)`

**매개변수:**
- `componentName` (string): 컴포넌트 이름
- `props` (object): 컴포넌트 props

**반환값:** `number` (마운트 시간, trackUnmount에서 사용)

---

### `interactionTracker.trackUnmount(componentName, mountTime)`

**매개변수:**
- `componentName` (string): 컴포넌트 이름
- `mountTime` (number): trackMount에서 반환된 시간

**반환값:** 없음

---

### `interactionTracker.trackStateChange(componentName, stateName, oldValue, newValue)`

**매개변수:**
- `componentName` (string): 컴포넌트 이름
- `stateName` (string): State 이름
- `oldValue` (any): 이전 값
- `newValue` (any): 새 값

**반환값:** 없음

## 실전 예제

### 버튼 클릭 추적

```javascript
import interactionTracker from '../../../utils/interactionTracker';

function MyButton() {
  const handleClick = () => {
    const startTime = performance.now();
    
    interactionTracker.log('MyButton', 'Click', {
      timestamp: new Date(),
      buttonText: 'Submit'
    });
    
    // 버튼 로직
    submitForm();
    
    const endTime = performance.now();
    console.log(`⏱️  버튼 처리 시간: ${(endTime - startTime).toFixed(2)}ms`);
  };
  
  return <button onClick={handleClick}>Submit</button>;
}
```

### API 호출 추적

```javascript
const fetchUserData = async (userId) => {
  const { result, responseTime } = await interactionTracker.measureResponse(
    'UserProfile',
    'Fetch User Data',
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      setUserData(data);
      return data;
    },
    { userId }
  );
  
  console.log(`사용자 데이터 로딩 시간: ${responseTime}ms`);
};
```

### 네트워크 그래프 노드 선택 추적

```javascript
network.on('selectNode', async (params) => {
  await interactionTracker.measureResponse(
    'NetworkGraph',
    'Node Selection',
    async () => {
      const nodeId = params.nodes[0];
      const nodeData = await fetchNodeDetails(nodeId);
      updateNodeInfo(nodeData);
      return nodeData;
    },
    {
      nodeId: params.nodes[0],
      selectionType: 'click'
    }
  );
});
```

## 주의사항

1. **성능 영향**: 프로덕션 환경에서는 필요한 부분만 추적하세요.
2. **민감한 정보**: 사용자 민감 정보는 로깅하지 마세요.
3. **콘솔 출력**: 개발 환경에서만 사용하거나, 프로덕션에서는 로깅 레벨을 조정하세요.

## 추가 개선 아이디어

- 로그 레벨 설정 (DEBUG, INFO, WARN, ERROR)
- 원격 서버로 로그 전송
- 성능 메트릭 대시보드 통합
- 사용자별 세션 추적
