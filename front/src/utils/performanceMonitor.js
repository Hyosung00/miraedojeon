// 성능 모니터링 유틸리티

export const measurePerformance = (componentName) => {
  const start = performance.now();
  
  return {
    end: () => {
      const end = performance.now();
      const duration = end - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName}: ${duration.toFixed(2)}ms`);
      }
      
      // Performance API에 마크 추가
      if (typeof window !== 'undefined' && window.performance) {
        performance.mark(`${componentName}-end`);
        performance.measure(
          `${componentName}-duration`,
          `${componentName}-start`,
          `${componentName}-end`
        );
      }
      
      return duration;
    },
    
    markStart: () => {
      if (typeof window !== 'undefined' && window.performance) {
        performance.mark(`${componentName}-start`);
      }
    }
  };
};

// Web Vitals 측정
export const measureWebVitals = () => {
  if (typeof window === 'undefined') return;

  // LCP (Largest Contentful Paint)
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('[Web Vitals] LCP:', lastEntry.renderTime || lastEntry.loadTime);
  });
  
  try {
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    // Unsupported browser
  }

  // FCP (First Contentful Paint)
  const paintObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.name === 'first-contentful-paint') {
        console.log('[Web Vitals] FCP:', entry.startTime);
      }
    });
  });
  
  try {
    paintObserver.observe({ entryTypes: ['paint'] });
  } catch (e) {
    // Unsupported browser
  }
};

// 리소스 타이밍 분석
export const analyzeResourceTiming = () => {
  if (typeof window === 'undefined' || !window.performance) return;

  const resources = performance.getEntriesByType('resource');
  const analysis = {
    total: resources.length,
    byType: {},
    largest: null,
    slowest: null
  };

  resources.forEach(resource => {
    const type = resource.initiatorType;
    if (!analysis.byType[type]) {
      analysis.byType[type] = { count: 0, totalSize: 0, totalDuration: 0 };
    }
    
    analysis.byType[type].count++;
    analysis.byType[type].totalDuration += resource.duration;
    
    if (resource.transferSize) {
      analysis.byType[type].totalSize += resource.transferSize;
      
      if (!analysis.largest || resource.transferSize > analysis.largest.size) {
        analysis.largest = { name: resource.name, size: resource.transferSize };
      }
    }
    
    if (!analysis.slowest || resource.duration > analysis.slowest.duration) {
      analysis.slowest = { name: resource.name, duration: resource.duration };
    }
  });

  console.table(analysis.byType);
  console.log('Largest resource:', analysis.largest);
  console.log('Slowest resource:', analysis.slowest);
  
  return analysis;
};

// 메모리 사용량 모니터링 (Chrome only)
export const monitorMemory = () => {
  if (typeof window === 'undefined' || !performance.memory) {
    console.log('Memory monitoring not supported in this browser');
    return null;
  }

  const memory = performance.memory;
  const mbUsed = (memory.usedJSHeapSize / 1048576).toFixed(2);
  const mbLimit = (memory.jsHeapSizeLimit / 1048576).toFixed(2);
  
  console.log(`[Memory] Used: ${mbUsed}MB / Limit: ${mbLimit}MB`);
  
  return {
    usedMB: mbUsed,
    limitMB: mbLimit,
    percentage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)
  };
};

// FPS 모니터
export const createFPSMonitor = () => {
  let lastTime = performance.now();
  let frames = 0;
  let fps = 0;

  const update = () => {
    frames++;
    const currentTime = performance.now();
    
    if (currentTime >= lastTime + 1000) {
      fps = Math.round((frames * 1000) / (currentTime - lastTime));
      frames = 0;
      lastTime = currentTime;
      
      if (fps < 30) {
        console.warn(`[FPS] Low frame rate: ${fps} FPS`);
      }
    }
    
    requestAnimationFrame(update);
  };

  update();
  
  return {
    getFPS: () => fps
  };
};

// 번들 크기 분석 (빌드 후)
export const analyzeBundleSize = async () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Bundle analysis only available in production build');
    return;
  }

  try {
    const response = await fetch('/stats.json');
    const stats = await response.json();
    console.log('Bundle analysis:', stats);
    return stats;
  } catch (error) {
    console.log('No bundle stats available');
  }
};
