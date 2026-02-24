// 상호작용 추적 유틸리티
// 컴포넌트의 모든 사용자 상호작용(클릭, 선택 등)을 추적하고 반응 시간을 측정합니다.

/**
 * 타임스탬프를 한국 시간 형식으로 포맷
 * @returns {string} 포맷된 시간 문자열
 */
const formatTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
};

/**
 * 상호작용 정보를 콘솔에 로깅
 * @param {string} componentName - 컴포넌트 이름
 * @param {string} actionType - 액션 타입
 * @param {object} data - 추가 데이터
 */
const log = (componentName, actionType, data = {}) => {
  const timestamp = formatTimestamp();
  console.log(`
╔════════════════════════════════════════════════════════════════
║ 🔍 상호작용 추적 로그
╠════════════════════════════════════════════════════════════════
║ ⏰ 시각: ${timestamp}
║ 📦 컴포넌트: ${componentName}
║ 🎯 액션: ${actionType}
║ 📊 데이터:`, data, `
╚════════════════════════════════════════════════════════════════`);
};

/**
 * 비동기 작업의 반응 시간을 측정하고 로깅
 * @param {string} componentName - 컴포넌트 이름
 * @param {string} actionType - 액션 타입
 * @param {Function} asyncFn - 측정할 비동기 함수
 * @param {object} data - 입력 데이터
 * @returns {Promise<{result: any, responseTime: number}>}
 */
const measureResponse = async (componentName, actionType, asyncFn, data = {}) => {
  const startTime = performance.now();
  const startTimestamp = formatTimestamp();
  
  console.log(`
╔════════════════════════════════════════════════════════════════
║ ⚡ 반응 시간 측정 시작
╠════════════════════════════════════════════════════════════════
║ ⏰ 시각: ${startTimestamp}
║ 📦 컴포넌트: ${componentName}
║ 🎯 액션: ${actionType}
║ 📊 입력 데이터:`, data, `
╚════════════════════════════════════════════════════════════════`);

  try {
    const result = await asyncFn();
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    console.log(`
╔════════════════════════════════════════════════════════════════
║ ✅ 반응 시간 측정 완료
╠════════════════════════════════════════════════════════════════
║ ⏰ 완료 시각: ${formatTimestamp()}
║ 📦 컴포넌트: ${componentName}
║ 🎯 액션: ${actionType}
║ ⏱️  반응 시간: ${responseTime.toFixed(2)}ms (${(responseTime / 1000).toFixed(3)}초)
║ 📊 결과:`, result, `
╚════════════════════════════════════════════════════════════════`);

    return { result, responseTime };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    console.error(`
╔════════════════════════════════════════════════════════════════
║ ❌ 반응 시간 측정 - 에러 발생
╠════════════════════════════════════════════════════════════════
║ ⏰ 에러 시각: ${formatTimestamp()}
║ 📦 컴포넌트: ${componentName}
║ 🎯 액션: ${actionType}
║ ⏱️  반응 시간 (에러까지): ${responseTime.toFixed(2)}ms
║ ❌ 에러:`, error, `
╚════════════════════════════════════════════════════════════════`);
    
    throw error;
  }
};

/**
 * 동기 작업의 반응 시간을 측정하고 로깅
 * @param {string} componentName - 컴포넌트 이름
 * @param {string} actionType - 액션 타입
 * @param {Function} syncFn - 측정할 동기 함수
 * @param {object} data - 입력 데이터
 * @returns {{result: any, responseTime: number}}
 */
const measureResponseSync = (componentName, actionType, syncFn, data = {}) => {
  const startTime = performance.now();
  const startTimestamp = formatTimestamp();
  
  console.log(`
╔════════════════════════════════════════════════════════════════
║ ⚡ 반응 시간 측정 시작 (동기)
╠════════════════════════════════════════════════════════════════
║ ⏰ 시각: ${startTimestamp}
║ 📦 컴포넌트: ${componentName}
║ 🎯 액션: ${actionType}
║ 📊 입력 데이터:`, data, `
╚════════════════════════════════════════════════════════════════`);

  try {
    const result = syncFn();
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    console.log(`
╔════════════════════════════════════════════════════════════════
║ ✅ 반응 시간 측정 완료 (동기)
╠════════════════════════════════════════════════════════════════
║ ⏰ 완료 시각: ${formatTimestamp()}
║ 📦 컴포넌트: ${componentName}
║ 🎯 액션: ${actionType}
║ ⏱️  반응 시간: ${responseTime.toFixed(2)}ms (${(responseTime / 1000).toFixed(3)}초)
║ 📊 결과:`, result, `
╚════════════════════════════════════════════════════════════════`);

    return { result, responseTime };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    console.error(`
╔════════════════════════════════════════════════════════════════
║ ❌ 반응 시간 측정 - 에러 발생 (동기)
╠════════════════════════════════════════════════════════════════
║ ⏰ 에러 시각: ${formatTimestamp()}
║ 📦 컴포넌트: ${componentName}
║ 🎯 액션: ${actionType}
║ ⏱️  반응 시간 (에러까지): ${responseTime.toFixed(2)}ms
║ ❌ 에러:`, error, `
╚════════════════════════════════════════════════════════════════`);
    
    throw error;
  }
};

/**
 * 간단한 반응 시간 측정 (로그 없이)
 * @param {string} label - 측정 라벨
 * @returns {number} 반응 시간 (ms)
 */
const measureSimple = (label = 'Action') => {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    console.log(`⏱️  ${label} 반응 시간: ${responseTime.toFixed(2)}ms`);
    return responseTime;
  };
};

/**
 * 컴포넌트 마운트 추적
 * @param {string} componentName - 컴포넌트 이름
 * @param {object} props - 컴포넌트 props
 */
const trackMount = (componentName, props = {}) => {
  const timestamp = formatTimestamp();
  console.log(`
╔════════════════════════════════════════════════════════════════
║ 🚀 컴포넌트 마운트
╠════════════════════════════════════════════════════════════════
║ ⏰ 시각: ${timestamp}
║ 📦 컴포넌트: ${componentName}
║ 🎛️  Props:`, props, `
╚════════════════════════════════════════════════════════════════`);
  
  return performance.now();
};

/**
 * 컴포넌트 언마운트 추적
 * @param {string} componentName - 컴포넌트 이름
 * @param {number} mountTime - 마운트 시작 시간 (performance.now())
 */
const trackUnmount = (componentName, mountTime) => {
  const timestamp = formatTimestamp();
  const lifeTime = mountTime ? performance.now() - mountTime : null;
  
  console.log(`
╔════════════════════════════════════════════════════════════════
║ 👋 컴포넌트 언마운트
╠════════════════════════════════════════════════════════════════
║ ⏰ 시각: ${timestamp}
║ 📦 컴포넌트: ${componentName}
║ ⏱️  생존 시간: ${lifeTime ? `${lifeTime.toFixed(2)}ms (${(lifeTime / 1000).toFixed(2)}초)` : 'N/A'}
╚════════════════════════════════════════════════════════════════`);
};

/**
 * State 변경 추적
 * @param {string} componentName - 컴포넌트 이름
 * @param {string} stateName - State 이름
 * @param {any} oldValue - 이전 값
 * @param {any} newValue - 새 값
 */
const trackStateChange = (componentName, stateName, oldValue, newValue) => {
  const timestamp = formatTimestamp();
  console.log(`
╔════════════════════════════════════════════════════════════════
║ 🔄 State 변경
╠════════════════════════════════════════════════════════════════
║ ⏰ 시각: ${timestamp}
║ 📦 컴포넌트: ${componentName}
║ 🏷️  State: ${stateName}
║ 📤 이전 값:`, oldValue, `
║ 📥 새 값:`, newValue, `
╚════════════════════════════════════════════════════════════════`);
};

const interactionTracker = {
  log,
  measureResponse,
  measureResponseSync,
  measureSimple,
  trackMount,
  trackUnmount,
  trackStateChange
};

export default interactionTracker;
