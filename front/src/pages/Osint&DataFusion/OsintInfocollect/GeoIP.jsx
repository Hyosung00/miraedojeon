import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as Cesium from 'cesium';
import { Box, Typography, Card, CardContent, Grid, IconButton, Slider, Dialog, DialogContent, DialogTitle } from '@mui/material';
import { FundOutlined, DatabaseOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import FusionDBConsole from '../FusionDB/FusionDB';
import { usePopup } from '../../../context/PopupContext';

// ==================== 상수 정의 ====================
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  ENDPOINTS: {
    NORTH_KOREA_ATTACKS: '/api/north-korea-attacks'
  },
  DEFAULT_LIMIT: 20  // 하루당 20개로 제한
};

const COLORS = {
  SOURCE: {
    NORMAL: Cesium.Color.YELLOW,
    OUTLINE: Cesium.Color.RED,
    HIGHLIGHT: Cesium.Color.ORANGE
  },
  TARGET: {
    NORMAL: Cesium.Color.CYAN,
    OUTLINE: Cesium.Color.BLUE,
    HIGHLIGHT: Cesium.Color.LIME
  },
  HIGHLIGHT_OUTLINE: Cesium.Color.WHITE
};

const MARKER_SIZES = {
  NORMAL: 8,
  HIGHLIGHT: 12,
  OUTLINE_WIDTH_NORMAL: 3,
  OUTLINE_WIDTH_HIGHLIGHT: 4
};

const ANIMATION_TIMINGS = {
  SCROLL_DURATION: 1300,
  PULSE_DURATION: 1200
};

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { box-shadow: 0 0 10px rgba(124,58,237,0.4); }
    50% { box-shadow: 0 0 20px rgba(124,58,237,0.6); }
    100% { box-shadow: 0 0 10px rgba(124,58,237,0.4); }
  }
`;
document.head.appendChild(style);

// Cesium Ion Access Token 설정
// 원본 토큰
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzODNiZmZiNC04YTUxLTQ1YzgtOWU1Mi1kNDUyY2I2ZDRkNTQiLCJpZCI6MzQyNDEzLCJpYXQiOjE3NTgxNzMyNDh9.zZRyMPovg5ALhNtG2_E-0ED0qHqd_uQQnAG84eQUyG4';

// 수정 된 토큰
// Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYmM5NTM1NC05YjlkLTQ3NmItOTRhYi0zOWFlNmRkOTU4OWEiLCJpZCI6MzUzNTE4LCJpYXQiOjE3NjEyNjk2OTh9.0pxPJQdwLFl9wTzqp60Zr1rbgPJLdhT00OaBhS84ORs';

// AS 정보 생성 함수
const generateAS = (country) => {
  const asNumbers = {
    '중국': ['AS4134 CHINANET', 'AS4837 CHINA169', 'AS9808 CMNET', 'AS24400 ALIBABA'],
    'China': ['AS4134 CHINANET', 'AS4837 CHINA169', 'AS9808 CMNET', 'AS24400 ALIBABA'],
    '러시아': ['AS8359 MTS', 'AS12389 ROSTELECOM', 'AS31133 MF-MGSM', 'AS42610 NCNET'],
    'Russia': ['AS8359 MTS', 'AS12389 ROSTELECOM', 'AS31133 MF-MGSM', 'AS42610 NCNET'],
    '북한': ['AS131279 STAR-KP', 'AS9769 DPRK-AS', 'AS17762 KPTC-AS'],
    'North Korea': ['AS131279 STAR-KP', 'AS9769 DPRK-AS', 'AS17762 KPTC-AS'],
    '이란': ['AS44244 IRANCELL', 'AS6736 BARIN', 'AS197207 MCCI', 'AS58224 TCI'],
    'Iran': ['AS44244 IRANCELL', 'AS6736 BARIN', 'AS197207 MCCI', 'AS58224 TCI'],
    '미국': ['AS15169 GOOGLE', 'AS8075 MICROSOFT', 'AS16509 AMAZON', 'AS32934 FACEBOOK'],
    'United States': ['AS15169 GOOGLE', 'AS8075 MICROSOFT', 'AS16509 AMAZON', 'AS32934 FACEBOOK'],
    '일본': ['AS2516 KDDI', 'AS4713 NTT', 'AS2497 IIJ', 'AS7506 GMO'],
    'Japan': ['AS2516 KDDI', 'AS4713 NTT', 'AS2497 IIJ', 'AS7506 GMO'],
    '독일': ['AS3320 DEUTSCHE', 'AS8881 1&1', 'AS20940 AKAMAI', 'AS24940 HETZNER'],
    'Germany': ['AS3320 DEUTSCHE', 'AS8881 1&1', 'AS20940 AKAMAI', 'AS24940 HETZNER'],
    '영국': ['AS2856 BT', 'AS5089 VIRGIN', 'AS12576 EE', 'AS13037 ZEN'],
    'United Kingdom': ['AS2856 BT', 'AS5089 VIRGIN', 'AS12576 EE', 'AS13037 ZEN'],
    '대한민국': ['AS9318 SKB', 'AS4766 KT', 'AS9644 LGU', 'AS17858 LG-DACOM'],
    'South Korea': ['AS9318 SKB', 'AS4766 KT', 'AS9644 LGU', 'AS17858 LG-DACOM'],
    'Burundi': ['AS37578 AS-KONNECT', 'AS37054 USAN', 'AS36945 ONATEL'],
    'default': ['AS0 UNKNOWN']
  };

  const asList = asNumbers[country.name] || asNumbers['default'];
  return asList[Math.floor(Math.random() * asList.length)];
};

// ==================== 유틸리티 함수 ====================

// Attack ID로 공격 찾기 (타입 안정성 개선)
const findAttackById = (attacks, attackId) => {
  if (!attacks || !attackId) return null;
  return attacks.find(attack =>
    attack.id === attackId ||
    attack.id === attackId.toString() ||
    attack.id === parseInt(attackId)
  );
};

// 엔티티 색상 복원 (중복 코드 통합)
const resetEntityColors = (entity, entityId) => {
  if (!entity || !entity.point) return;

  const isSource = entityId.includes('source');
  entity.point.color = isSource ? COLORS.SOURCE.NORMAL : COLORS.TARGET.NORMAL;
  entity.point.outlineColor = isSource ? COLORS.SOURCE.OUTLINE : COLORS.TARGET.OUTLINE;
  entity.point.outlineWidth = MARKER_SIZES.OUTLINE_WIDTH_NORMAL;
  entity.point.pixelSize = MARKER_SIZES.NORMAL;
};

// 엔티티 하이라이트 (중복 코드 통합)
const highlightEntity = (entity, isSource) => {
  if (!entity || !entity.point) return;

  entity.point.color = isSource ? COLORS.SOURCE.HIGHLIGHT : COLORS.TARGET.HIGHLIGHT;
  entity.point.outlineColor = COLORS.HIGHLIGHT_OUTLINE;
  entity.point.outlineWidth = MARKER_SIZES.OUTLINE_WIDTH_HIGHLIGHT;
  entity.point.pixelSize = MARKER_SIZES.HIGHLIGHT;
  entity.point.disableDepthTestDistance = Number.POSITIVE_INFINITY;
};

// 로그로 스크롤 (중복 코드 통합)
const scrollToLog = (attackId) => {
  const el = document.getElementById(`log-${attackId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.animation = `pulse ${ANIMATION_TIMINGS.PULSE_DURATION / 1000}s ease-out 1`;
    setTimeout(() => { el.style.animation = ''; }, ANIMATION_TIMINGS.SCROLL_DURATION);
  }
};

// API에서 실제 MongoDB 데이터를 가져와서 포맷팅하는 함수
const fetchAndFormatAttackData = async (startDate = null, endDate = null) => {
  try {
    let url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NORTH_KOREA_ATTACKS}?limit=${API_CONFIG.DEFAULT_LIMIT}`;

    if (startDate) {
      url += `&startDate=${startDate.toISOString()}`;
    }
    if (endDate) {
      url += `&endDate=${endDate.toISOString()}`;
    }

    console.log('🌐 API 요청:', url);
    const response = await fetch(url);
    console.log('📡 API 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 API 응답 데이터:', {
      success: data.success,
      count: data.count,
      attacks: data.attacks?.length || 0
    });

    if (!data.success) {
      console.error('API 호출 실패:', data.error);
      return [];
    }

    console.log(`✅ ${data.count}개의 공격 데이터를 가져왔습니다.`);
    console.log('📊 [2D] 전체 작전 데이터:', data.attacks);

    // API 데이터를 기존 형식에 맞게 변환
    const attacks = data.attacks.map((attack) => {
      return {
        id: attack.id,
        source: {
          name: attack.source.name,
          building: {
            name: attack.source.city || attack.source.name,
            lat: attack.source.lat,
            lon: attack.source.lon
          },
          ip: attack.source.ip,
          port: attack.source.port,
          subnet: attack.source.subnet,
          gateway: attack.source.gateway,
          dns: attack.source.dns,
          as: generateAS({ name: attack.source.name })
        },
        target: {
          name: attack.target.name,
          building: {
            name: attack.target.city || 'North Korea',
            lat: attack.target.lat,
            lon: attack.target.lon
          },
          ip: attack.target.ip,
          port: attack.target.port,
          subnet: attack.target.subnet,
          gateway: attack.target.gateway,
          dns: attack.target.dns,
          as: generateAS({ name: 'North Korea' })
        },
        type: attack.protocol,
        severity: Math.min(5, Math.ceil(attack.count / 5)),
        timestamp: new Date(attack.timestamp),
        status: attack.status,
        count: attack.count
      };
    });

    // 변환된 작전 데이터를 모두 로그로 출력
    console.log('🔍 [2D] 변환된 작전 데이터 (전체):', attacks);
    attacks.forEach((attack, index) => {
      console.log(`\n[2D 작전 ${index + 1}/${attacks.length}]`, {
        id: attack.id,
        type: attack.type,
        출발지: {
          국가: attack.source.name,
          도시: attack.source.building.name,
          IP: attack.source.ip,
          Port: attack.source.port,
          좌표: `${attack.source.building.lat}, ${attack.source.building.lon}`,
          Subnet: attack.source.subnet,
          Gateway: attack.source.gateway,
          DNS: attack.source.dns,
          AS: attack.source.as
        },
        목표지: {
          국가: attack.target.name,
          도시: attack.target.building.name,
          IP: attack.target.ip,
          Port: attack.target.port,
          좌표: `${attack.target.building.lat}, ${attack.target.building.lon}`,
          Subnet: attack.target.subnet,
          Gateway: attack.target.gateway,
          DNS: attack.target.dns,
          AS: attack.target.as
        },
        심각도: attack.severity,
        카운트: attack.count,
        상태: attack.status,
        시간: attack.timestamp
      });
    });

    console.log(`✅ ${attacks.length}개 작전 변환 완료`);
    return attacks;
  } catch (error) {
    console.error('❌ API 호출 중 오류:', error);
    console.error('❌ 에러 상세:', error.message, error.stack);
    return [];
  }
};


const TwoDPage = () => {
  const navigate = useNavigate();
  const cesiumContainer = useRef(null);
  const viewer = useRef(null);

  const logListRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [attacks, setAttacks] = useState([]);

  // 통합 PopupContext 사용
  const { popups, openPopup, closePopup } = usePopup();
  const fusionDBOpen = popups.osintDetail;

  // 메뉴에서 팝업 오픈 요청 시 자동으로 열리도록
  useEffect(() => {
    if (popups.osintDetail) {
      // 팝업이 이미 열려있으면 아무것도 하지 않음
    }
  }, [popups.osintDetail]);

  // 날짜 및 시간 필터링 상태
  const [allAttacks, setAllAttacks] = useState([]); // 전체 데이터 저장 (일주일, 하루당 20개 = 총 140개)
  const [timeRange, setTimeRange] = useState([0, 7]); // 시간 범위 (일 단위, 0일~7일)

  // attackStats를 useMemo로 최적화 (attacks가 변경될 때만 재계산)
  const attackStats = useMemo(() => {
    if (!attacks || attacks.length === 0) {
      return { total: 0, active: 0, blocked: 0, countries: 0 };
    }

    return {
      total: attacks.length,
      active: attacks.length,
      blocked: 0,
      countries: new Set([
        ...attacks.map(a => a.source.name),
        ...attacks.map(a => a.target.name)
      ]).size
    };
  }, [attacks]);

  // 시작 날짜 설정 (9/2 00:00:00)
  const startDate = useMemo(() => {
    const date = new Date('2025-09-02T00:00:00Z');
    return date;
  }, []);

  // 종료 날짜 설정 (9/8 23:59:59 - 7일간)
  const endDate = useMemo(() => {
    const date = new Date('2025-09-08T23:59:59Z');
    return date;
  }, []);

  // 현재 시간바 위치에 따른 필터링된 작전 데이터
  const filteredAttacks = useMemo(() => {
    console.log('🔄 filteredAttacks useMemo 실행');
    console.log('  - allAttacks 길이:', allAttacks ? allAttacks.length : 'null');
    console.log('  - timeRange:', timeRange);

    if (!allAttacks || allAttacks.length === 0) {
      console.log('⚠️ allAttacks가 비어있음');
      return [];
    }

    const baseTime = startDate.getTime();
    const rangeStartTime = baseTime + (timeRange[0] * 24 * 60 * 60 * 1000); // 범위 시작
    const rangeEndTime = baseTime + (timeRange[1] * 24 * 60 * 60 * 1000); // 범위 종료

    console.log('🔍 필터링 정보:', {
      '전체 작전 수': allAttacks.length,
      '범위 시작 (일)': timeRange[0],
      '범위 종료 (일)': timeRange[1],
      '범위 시작 시간': new Date(rangeStartTime).toISOString(),
      '범위 종료 시간': new Date(rangeEndTime).toISOString(),
      '첫 번째 작전 시간': allAttacks[0] ? new Date(allAttacks[0].timestamp).toISOString() : 'N/A',
      '마지막 작전 시간': allAttacks[allAttacks.length - 1] ? new Date(allAttacks[allAttacks.length - 1].timestamp).toISOString() : 'N/A'
    });

    // 범위 내의 작전만 표시
    const filtered = allAttacks.filter(attack => {
      const attackTime = new Date(attack.timestamp).getTime();
      const isInRange = attackTime >= rangeStartTime && attackTime <= rangeEndTime;

      // 처음 3개만 샘플로 로그 출력
      if (allAttacks.indexOf(attack) < 3) {
        console.log(`  작전 ${attack.id}:`, {
          시간: new Date(attackTime).toISOString(),
          '범위 내': isInRange,
          '시작보다 크거나 같음': attackTime >= rangeStartTime,
          '종료보다 작거나 같음': attackTime <= rangeEndTime
        });
      }

      return isInRange;
    });

    console.log(`✅ 필터링 결과: ${filtered.length}개 작전 (${timeRange[1] - timeRange[0]}일치)`);
    return filtered;
  }, [allAttacks, timeRange, startDate]);

  // attacks를 filteredAttacks로 동기화
  useEffect(() => {
    console.log('🔄 attacks 상태 업데이트:', filteredAttacks.length, '개');
    setAttacks(filteredAttacks);
  }, [filteredAttacks]);

  // 공격 데이터 초기화 및 업데이트 (API 호출)
  useEffect(() => {
    const initializeAttacks = async () => {
      console.log('📅 7일간 데이터 가져오기 (하루당 20개씩):', {
        시작: startDate.toISOString(),
        종료: endDate.toISOString()
      });

      // 7일간 데이터를 병렬로 가져오기 (하루당 20개)
      const promises = [];
      for (let day = 0; day < 7; day++) {
        // UTC 시간대로 날짜 생성
        const dayStart = new Date(Date.UTC(2025, 8, 2 + day, 0, 0, 0, 0)); // 2025년 9월 2일부터
        const dayEnd = new Date(Date.UTC(2025, 8, 2 + day, 23, 59, 59, 999));

        console.log(`📆 ${day + 1}일차 데이터 요청 시작: ${dayStart.toISOString()}`);

        promises.push(
          fetchAndFormatAttackData(dayStart, dayEnd)
            .then(dayData => {
              console.log(`  ✅ ${day + 1}일차 응답: ${dayData.length}개 작전`);

              // ID를 고유하게 만들기 (날짜 포함)
              const uniqueData = dayData.slice(0, 20).map((attack) => ({
                ...attack,
                id: `day${day}-${attack.id}` // 예: day0-attack-0, day1-attack-0
              }));

              return uniqueData;
            })
            .catch(error => {
              console.error(`  ❌ ${day + 1}일차 에러:`, error);
              return [];
            })
        );
      }

      // 모든 요청이 완료될 때까지 대기
      const allDayData = await Promise.all(promises);
      const allData = allDayData.flat(); // 2차원 배열을 1차원으로 평탄화

      console.log('📊 일자별 데이터 개수:', allDayData.map((data, i) => `${i+1}일: ${data.length}개`).join(', '));

      console.log(`✅ 총 ${allData.length}개의 작전 데이터를 가져왔습니다.`);

      if (allData.length > 0) {
        console.log('📊 전체 데이터 시간 범위:', {
          첫번째: new Date(allData[0].timestamp).toISOString(),
          마지막: new Date(allData[allData.length - 1].timestamp).toISOString()
        });
        console.log('📊 첫 3개 작전 샘플:', allData.slice(0, 3).map(a => ({
          id: a.id,
          timestamp: new Date(a.timestamp).toISOString(),
          source: a.source.name,
          target: a.target.name
        })));
      } else {
        console.error('❌ 데이터가 하나도 없습니다!');
      }

      setAllAttacks(allData);
      console.log('💾 allAttacks 상태에 저장 완료:', allData.length, '개');

      // 초기에는 전체 7일 표시
      setTimeRange([0, 7]);
      console.log('📅 초기 timeRange 설정: [0, 7]');
    };

    initializeAttacks();
  }, [startDate, endDate]);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    const initializeCesium = async () => {
      try {
        console.log('Cesium 2D 모드 초기화 시작...');
        console.log('Access Token:', Cesium.Ion.defaultAccessToken ? '설정됨' : '없음');

        // Cesium Viewer 생성 - 2D 모드만 지원
        viewer.current = new Cesium.Viewer(cesiumContainer.current, {
          // UI 요소들 정리
          animation: false,
          baseLayerPicker: true,
          fullscreenButton: false,
          geocoder: true,
          homeButton: true,
          infoBox: true,
          sceneModePicker: false,
          scene3DOnly: false, // 2D 모드 지원
          selectionIndicator: true,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,

          // 고품질 지형 데이터 사용
          terrainProvider: await Cesium.createWorldTerrainAsync({
            requestWaterMask: true,
            requestVertexNormals: true
          }),

          // 연속 렌더링 강제 활성화
          requestRenderMode: false,
          maximumRenderTimeChange: Infinity
        });

        console.log('Cesium Viewer 생성 완료');

        // 즉시 2D 모드로 전환
        viewer.current.scene.morphTo2D(0);
        console.log('2D 모드로 강제 전환');

        // 고해상도 이미지 레이어 추가
        try {
          const bingProvider = await Cesium.createWorldImageryAsync({
            style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
          });
          viewer.current.imageryLayers.addImageryProvider(bingProvider);
          console.log('고해상도 이미지 레이어 추가 완료');
        } catch (error) {
          console.log('고해상도 이미지 레이어 추가 실패:', error);
        }

        // 지구본 고급 설정
        const scene = viewer.current.scene;
        const globe = scene.globe;

        // 실제적인 조명 및 대기 효과
        scene.skyAtmosphere.show = true;
        scene.fog.enabled = true;
        scene.fog.density = 0.0001;
        scene.fog.screenSpaceErrorFactor = 2.0;

        // 고품질 지구본 렌더링
        globe.enableLighting = true;
        globe.dynamicAtmosphereLighting = true;
        globe.atmosphereLightIntensity = 10.0;
        globe.showWaterEffect = true;

        // 지형 상세도 최대화
        globe.maximumScreenSpaceError = 1.0;
        globe.tileCacheSize = 1000;

        // 2D 모드 카메라 컨트롤 설정
        scene.screenSpaceCameraController.enableRotate = false;
        scene.screenSpaceCameraController.enableTranslate = true;
        scene.screenSpaceCameraController.enableZoom = true;
        scene.screenSpaceCameraController.enableTilt = false;
        scene.screenSpaceCameraController.enableLook = false;
        scene.screenSpaceCameraController.enableInputs = true;

        // 2D 모드 확대 범위 최적화 - 전체 지도를 볼 수 있도록
        scene.screenSpaceCameraController.minimumZoomDistance = 100;
        scene.screenSpaceCameraController.maximumZoomDistance = 40000000;  // 40,000km - 전체 지구 보기

        // 2D 모드에서 안전한 패닝 설정
        scene.screenSpaceCameraController.translateEventTypes = [
          Cesium.CameraEventType.LEFT_DRAG,
          Cesium.CameraEventType.RIGHT_DRAG
        ];

        // 2D 모드에서 줌 속도 조정
        scene.screenSpaceCameraController.zoomEventTypes = [
          Cesium.CameraEventType.WHEEL,
          Cesium.CameraEventType.PINCH
        ];

        // 자연스러운 줌 속도 최적화
        scene.screenSpaceCameraController.zoomFactor = 5.0;
        scene.screenSpaceCameraController.wheelZoomFactor = 10.0;  // 정상적인 줌 속도

        // 관성 설정 최적화 (부드러운 움직임)
        scene.screenSpaceCameraController.inertiaSpin = 0.95;
        scene.screenSpaceCameraController.inertiaTranslate = 0.95;
        scene.screenSpaceCameraController.inertiaZoom = 0.9;

        // 카메라 이동 후 지도 중앙 위치로 복귀하는 리스너 추가
        scene.camera.moveEnd.addEventListener(() => {
          const cameraHeight = scene.camera.positionCartographic.height;

          // 최대 축소 상태일 때만 (38,000km 이상) 지도를 화면 중앙에 정렬
          if (cameraHeight >= 38000000) {
            const currentCenter = scene.camera.positionCartographic;
            const mapCenterLon = 125.7625;  // 경도 126도 (북한 가로 위치) - 좌우 밸런스
            const mapCenterLat = 0.0;       // 위도 0도 (적도) - 상하 밸런스

            // 현재 위치가 지도 중심에서 많이 벗어났을 경우만 부드럽게 중앙으로 이동
            const lonDiff = Math.abs(Cesium.Math.toDegrees(currentCenter.longitude) - mapCenterLon);
            const latDiff = Math.abs(Cesium.Math.toDegrees(currentCenter.latitude) - mapCenterLat);

            // 30도 이상 벗어났을 때만 복귀
            if (lonDiff > 30 || latDiff > 30) {
              scene.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(mapCenterLon, mapCenterLat, cameraHeight),
                orientation: {
                  heading: 0.0,
                  pitch: -Cesium.Math.PI_OVER_TWO,
                  roll: 0.0
                },
                duration: 1.0
              });
            }
          }
        });

        // 마우스 상호작용 및 정보 표시 활성화
        viewer.current.cesiumWidget.creditContainer.style.display = "none";

        // 지형 클릭 시 좌표 정보 표시
        viewer.current.screenSpaceEventHandler.setInputAction((event) => {
          const cartesian = viewer.current.camera.pickEllipsoid(event.position, scene.globe.ellipsoid);
          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const longitude = Cesium.Math.toDegrees(cartographic.longitude);
            const latitude = Cesium.Math.toDegrees(cartographic.latitude);
            const height = cartographic.height;

            console.log(`위치: 위도 ${latitude.toFixed(6)}, 경도 ${longitude.toFixed(6)}, 고도 ${height.toFixed(2)}m`);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // 초기 카메라 위치 - 북한 중심으로 설정 (2D 모드)
        // 2D 모드에서는 정확한 중앙 정렬이 필요
        const northKoreaView = {
          destination: Cesium.Cartesian3.fromDegrees(125.7625, 39.0392, 5000000),
          orientation: {
            heading: 0.0,
            pitch: -Cesium.Math.PI_OVER_TWO,  // 정확히 위에서 아래를 바라봄
            roll: 0.0
          }
        };

        // 2D 모드 전환 완료 후 카메라 설정
        setTimeout(() => {
          viewer.current.camera.setView(northKoreaView);
        }, 500);

        // 홈 버튼이 활성화되어 있을 때만 이벤트 등록
        if (viewer.current.homeButton) {
          viewer.current.homeButton.viewModel.command.beforeExecute.addEventListener((e) => {
            e.cancel = true;
            viewer.current.camera.setView(northKoreaView);
          });
        }

        // 고품질 렌더링 설정
        if (Cesium.FeatureDetection.supportsImageRenderingPixelated()) {
          viewer.current.resolutionScale = window.devicePixelRatio;
        }

        // 장면 설정
        scene.postProcessStages.fxaa.enabled = true;

        // 애니메이션 시계 설정
        viewer.current.clock.shouldAnimate = true;
        viewer.current.clock.multiplier = 1.0;
        viewer.current.clock.currentTime = Cesium.JulianDate.now();

        // 강제 연속 렌더링
        scene.requestRenderMode = false;
        scene.maximumRenderTimeChange = Infinity;

        // requestAnimationFrame ID 저장 (메모리 누수 방지)
        let animationFrameId = null;
        const forceRender = () => {
          if (viewer.current && !viewer.current.isDestroyed()) {
            scene.requestRender();
            animationFrameId = requestAnimationFrame(forceRender);
          }
        };
        forceRender();

        // 시계를 항상 실행 상태로 유지 (메모리 누수 방지 - interval ID 저장)
        const clockIntervalId = setInterval(() => {
          if (viewer.current && !viewer.current.isDestroyed()) {
            viewer.current.clock.tick();
          }
        }, 16);

        // cleanup 함수들을 외부에서 접근할 수 있도록 저장
        viewer.current._cleanupIds = {
          animationFrameId,
          clockIntervalId
        };

        setIsLoaded(true);

      } catch (error) {
        console.error('Cesium 초기화 오류:', error);
        setError(`Cesium 초기화 실패: ${error.message}`);
      }
    };

    initializeCesium();

    // 컴포넌트 언마운트 시 정리 (메모리 누수 방지)
    return () => {
      if (viewer.current) {
        // interval과 animationFrame 정리
        if (viewer.current._cleanupIds) {
          if (viewer.current._cleanupIds.animationFrameId) {
            cancelAnimationFrame(viewer.current._cleanupIds.animationFrameId);
          }
          if (viewer.current._cleanupIds.clockIntervalId) {
            clearInterval(viewer.current._cleanupIds.clockIntervalId);
          }
        }

        viewer.current.destroy();
        viewer.current = null;
      }
    };
  }, []);

  // 애니메이션 상태 관리
  const [animationEntities, setAnimationEntities] = useState([]);
  const [selectedAttackId, setSelectedAttackId] = useState(null);
  const [selectedBuildingAttacks, setSelectedBuildingAttacks] = useState([]);
  const [highlightedBuildings, setHighlightedBuildings] = useState([]);
  const [markerHighlights, setMarkerHighlights] = useState([]);

  // 모든 하이라이트를 강제로 제거하는 함수
  const clearAllHighlights = useCallback(() => {
    if (!viewer.current) return;

    // 모든 엔티티를 순회하며 하이라이트 제거
    const entities = viewer.current.entities.values;
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (entity && entity.id) {
        const entityId = entity.id;
        // source 또는 target 마커인 경우에만 색상 복원
        if (entityId.startsWith('source-2d-') || entityId.startsWith('target-2d-')) {
          resetEntityColors(entity, entityId);
        }
      }
    }

    // 상태 초기화
    setHighlightedBuildings([]);
    setMarkerHighlights([]);
  }, []);

  // 지도에서 건물 하이라이트 함수 (최적화 버전)
  const highlightBuildingOnMap = useCallback((attackId) => {
    if (!viewer.current || !attacks) return;

    const attack = findAttackById(attacks, attackId);
    if (!attack) return;

    // 기존 하이라이트 제거
    highlightedBuildings.forEach(entityId => {
      const entity = viewer.current.entities.getById(entityId);
      if (entity) {
        resetEntityColors(entity, entityId);
      }
    });

    // 새로운 하이라이트 적용 (2D 모드용 ID)
    const targetPrefix = `target-2d-${attack.id}`;
    const sourcePrefix = `source-2d-${attack.id}`;

    const targetEntity = viewer.current.entities.getById(targetPrefix);
    const sourceEntity = viewer.current.entities.getById(sourcePrefix);

    const newHighlighted = [];

    if (targetEntity) {
      highlightEntity(targetEntity, false);
      newHighlighted.push(targetPrefix);
    }

    if (sourceEntity) {
      highlightEntity(sourceEntity, true);
      newHighlighted.push(sourcePrefix);
    }

    setHighlightedBuildings(newHighlighted);
  }, [attacks, highlightedBuildings]);

  // 건물 클릭 시 관련된 모든 공격 하이라이트 (최적화 버전)
  const highlightBuildingAttacks = useCallback((clickedAttack, entityId) => {
    if (!viewer.current || !attacks) return;

    // 모든 하이라이트 강제 제거
    clearAllHighlights();

    // 클릭된 건물을 타겟으로 하는 모든 공격 찾기
    const isTargetClick = entityId.includes('target');
    const clickedBuildingName = isTargetClick
      ? clickedAttack.target.building.name
      : clickedAttack.source.building.name;

    const relatedAttacks = isTargetClick
      ? attacks.filter(attack => attack.target.building.name === clickedBuildingName)
      : attacks.filter(attack => attack.source.building.name === clickedBuildingName);

    if (relatedAttacks.length === 0) return;

    // 관련된 모든 마커 하이라이트
    const newMarkerHighlights = [];

    relatedAttacks.forEach(attack => {
      const sourceEntityId = `source-2d-${attack.id}`;
      const targetEntityId = `target-2d-${attack.id}`;

      const sourceEntity = viewer.current.entities.getById(sourceEntityId);
      const targetEntity = viewer.current.entities.getById(targetEntityId);

      if (sourceEntity) {
        highlightEntity(sourceEntity, true);
        newMarkerHighlights.push(sourceEntityId);
      }

      if (targetEntity) {
        highlightEntity(targetEntity, false);
        newMarkerHighlights.push(targetEntityId);
      }
    });

    setMarkerHighlights(newMarkerHighlights);

    // 관련된 모든 로그 하이라이트
    const relatedAttackIds = relatedAttacks.map(attack => attack.id);
    setSelectedBuildingAttacks(relatedAttackIds);
    setSelectedAttackId(null);

    // 첫 번째 관련 로그로 스크롤
    if (relatedAttacks.length > 0) {
      scrollToLog(relatedAttacks[0].id);
    }
  }, [attacks, clearAllHighlights]);

  // IP 기반 마커 하이라이트 함수 (최적화 버전)
  const highlightMarkerAndLogs = useCallback((clickedAttack, entityId) => {
    if (!viewer.current || !attacks) return;

    // 모든 하이라이트 강제 제거
    clearAllHighlights();

    // 클릭된 마커가 source인지 target인지 확인
    const isSource = entityId.includes('source');
    const clickedIP = isSource ? clickedAttack.source.ip : clickedAttack.target.ip;

    // 해당 IP와 관련된 모든 공격 찾기
    const relatedAttacks = attacks.filter(attack =>
      attack.source.ip === clickedIP || attack.target.ip === clickedIP
    );

    if (relatedAttacks.length > 0) {
      // 모든 관련된 마커 하이라이트
      const newMarkerHighlights = [];

      relatedAttacks.forEach(attack => {
        const sourceEntityId = `source-2d-${attack.id}`;
        const targetEntityId = `target-2d-${attack.id}`;

        const sourceEntity = viewer.current.entities.getById(sourceEntityId);
        const targetEntity = viewer.current.entities.getById(targetEntityId);

        // Source 마커 하이라이트
        if (sourceEntity && attack.source.ip === clickedIP) {
          highlightEntity(sourceEntity, true);
          newMarkerHighlights.push(sourceEntityId);
        }

        // Target 마커 하이라이트
        if (targetEntity && attack.target.ip === clickedIP) {
          highlightEntity(targetEntity, false);
          newMarkerHighlights.push(targetEntityId);
        }
      });

      setMarkerHighlights(newMarkerHighlights);

      // 관련된 로그들 하이라이트
      const relatedAttackIds = relatedAttacks.map(attack => attack.id);
      setSelectedBuildingAttacks(relatedAttackIds);
      setSelectedAttackId(null);

      // 첫 번째 관련 로그로 스크롤
      if (relatedAttacks.length > 0) {
        scrollToLog(relatedAttacks[0].id);
      }
    }
  }, [attacks, clearAllHighlights]);

  // 2D 모드용 엔티티 생성 함수
  const create2DEntities = (attacks) => {
    if (!viewer.current || !attacks || attacks.length === 0) {
      console.warn('⚠️ create2DEntities: viewer 또는 attacks가 없음', {
        viewer: !!viewer.current,
        attacksCount: attacks?.length || 0
      });
      return;
    }

    console.log(`🎨 create2DEntities 시작: ${attacks.length}개 작전 시각화`);
    let successCount = 0;
    let failCount = 0;

    try {
      attacks.forEach((attack, index) => {
        // 좌표 유효성 검증
        const sourceLon = parseFloat(attack.source.building.lon);
        const sourceLat = parseFloat(attack.source.building.lat);
        const targetLon = parseFloat(attack.target.building.lon);
        const targetLat = parseFloat(attack.target.building.lat);

        if (isNaN(sourceLon) || isNaN(sourceLat) || isNaN(targetLon) || isNaN(targetLat)) {
          console.warn('2D 모드: 잘못된 좌표 데이터', {
            id: attack.id,
            source: attack.source.name,
            target: attack.target.name
          });
          failCount++;
          return;
        }

        // 처음 5개는 상세 로그 출력
        if (index < 5) {
          console.log(`  작전 ${index + 1}:`, {
            id: attack.id,
            source: `${attack.source.name} (${sourceLat.toFixed(2)}, ${sourceLon.toFixed(2)})`,
            target: `${attack.target.name} (${targetLat.toFixed(2)}, ${targetLon.toFixed(2)})`,
            protocol: attack.type
          });
        }

        // 2D 모드에서는 높이를 0으로 설정
        const markerHeight = 0;
        const sourceMarkerPos = Cesium.Cartesian3.fromDegrees(sourceLon, sourceLat, markerHeight);
        const targetMarkerPos = Cesium.Cartesian3.fromDegrees(targetLon, targetLat, markerHeight);

        // 2D 소스 마커 (공격 출발지)
        viewer.current.entities.add({
          id: `source-2d-${attack.id}`,
          position: sourceMarkerPos,
          point: {
            pixelSize: MARKER_SIZES.NORMAL,
            color: COLORS.SOURCE.NORMAL,
            outlineColor: COLORS.SOURCE.OUTLINE,
            outlineWidth: MARKER_SIZES.OUTLINE_WIDTH_NORMAL,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            show: true
          },
          buildingData: {
            name: attack.source.building.name,
            country: attack.source.name,
            type: 'source'
          }
        });

        // 2D 타겟 마커 (공격 받는 곳)
        viewer.current.entities.add({
          id: `target-2d-${attack.id}`,
          position: targetMarkerPos,
          point: {
            pixelSize: MARKER_SIZES.NORMAL,
            color: COLORS.TARGET.NORMAL,
            outlineColor: COLORS.TARGET.OUTLINE,
            outlineWidth: MARKER_SIZES.OUTLINE_WIDTH_NORMAL,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            show: true
          },
          buildingData: {
            name: attack.target.building.name,
            country: attack.target.name,
            type: 'target'
          }
        });

        // 2D 직선 광선
        viewer.current.entities.add({
          id: `beam-2d-${attack.id}`,
          polyline: {
            positions: [sourceMarkerPos, targetMarkerPos],
            width: 6,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.05,
              color: new Cesium.CallbackProperty((time) => {
                const seconds = Cesium.JulianDate.secondsDifference(time, viewer.current.clock.startTime) % 2;
                const alpha = 0.15 + 0.05 * Math.sin(seconds * Math.PI);
                return Cesium.Color.RED.withAlpha(alpha);
              }, false)
            }),
            clampToGround: false,
            followSurface: false,
            granularity: Cesium.Math.RADIANS_PER_DEGREE
          },
          description: `🔴 사이버 작전: ${attack.source.name} → ${attack.target.name}`,
          attackData: attack
        });

        successCount++;
      });

      console.log(`✅ create2DEntities 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
      console.log(`📊 생성된 엔티티: 마커 ${successCount * 2}개, 광선 ${successCount}개`);
    } catch (error) {
      console.error('❌ 2D 엔티티 생성 오류:', error);
    }
  };

  // 공격 시각화 효과
  useEffect(() => {
    if (!viewer.current || !isLoaded || !attacks || attacks.length === 0) return;

    try {
      // 기존 엔티티 제거
      viewer.current.entities.removeAll();

      // 기존 애니메이션 정리
      animationEntities.forEach(entity => {
        if (entity.interval) clearInterval(entity.interval);
      });
      setAnimationEntities([]);

      // 2D 엔티티 생성
      create2DEntities(attacks);
    } catch (error) {
      console.error('엔티티 생성 중 오류 발생:', error);
    }

    // 클릭 이벤트 핸들러
    if (viewer.current.screenSpaceEventHandler) {
      viewer.current.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      viewer.current.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    }

    // 싱글 클릭 이벤트
    viewer.current.screenSpaceEventHandler.setInputAction((click) => {
      try {
        const pickedObject = viewer.current.scene.pick(click.position);

        if (pickedObject && pickedObject.id) {
          // ID 찾기
          let entityId = null;
          if (pickedObject.id.id) {
            entityId = pickedObject.id.id;
          } else if (pickedObject.id._id) {
            entityId = pickedObject.id._id;
          } else if (typeof pickedObject.id === 'string') {
            entityId = pickedObject.id;
          }

          // 먼저 모든 하이라이트 제거
          clearAllHighlights();

          // 건물 클릭 처리
          const isSourceBuilding = entityId && entityId.startsWith('source-2d-');
          const isTargetBuilding = entityId && entityId.startsWith('target-2d-');

          if (isSourceBuilding || isTargetBuilding) {
            // ID에서 attack ID 추출
            let attackId = null;
            if (entityId.startsWith('source-2d-')) {
              attackId = entityId.replace('source-2d-', '');
            } else if (entityId.startsWith('target-2d-')) {
              attackId = entityId.replace('target-2d-', '');
            }

            if (attackId) {
              // 공격 찾기 (타입 안정성 개선된 유틸리티 함수 사용)
              const clickedAttack = findAttackById(attacks, attackId);

              if (clickedAttack) {
                // 새로운 마커 하이라이트
                highlightBuildingAttacks(clickedAttack, entityId);
                return;
              }
            }
          }
        }

        // 빈 공간 클릭 시 선택 해제
        setSelectedAttackId(null);
        setSelectedBuildingAttacks([]);

        // 모든 하이라이트 제거
        clearAllHighlights();
      } catch (error) {
        console.error('클릭 이벤트 처리 오류:', error);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 더블 클릭 이벤트 - 마커로 확대
    viewer.current.screenSpaceEventHandler.setInputAction((click) => {
      try {
        const pickedObject = viewer.current.scene.pick(click.position);

        if (pickedObject && pickedObject.id) {
          // ID 찾기
          let entityId = null;
          if (pickedObject.id.id) {
            entityId = pickedObject.id.id;
          } else if (pickedObject.id._id) {
            entityId = pickedObject.id._id;
          } else if (typeof pickedObject.id === 'string') {
            entityId = pickedObject.id;
          }

          // 마커인지 확인
          const isSourceMarker = entityId && entityId.startsWith('source-2d-');
          const isTargetMarker = entityId && entityId.startsWith('target-2d-');

          if (isSourceMarker || isTargetMarker) {
            const entity = viewer.current.entities.getById(entityId);
            if (entity && entity.position) {
              const position = entity.position.getValue(viewer.current.clock.currentTime);
              if (position) {
                const cartographic = Cesium.Cartographic.fromCartesian(position);
                const longitude = Cesium.Math.toDegrees(cartographic.longitude);
                const latitude = Cesium.Math.toDegrees(cartographic.latitude);

                // 2D 모드에서 적절한 줌 레벨로 이동
                viewer.current.camera.flyTo({
                  destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 50000), // 50km 고도
                  duration: 1.5,
                  complete: () => {
                    // 카메라 이동 완료 후 컨트롤 재활성화
                    viewer.current.scene.screenSpaceCameraController.enableInputs = true;
                  }
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('더블클릭 이벤트 처리 오류:', error);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }, [attacks, isLoaded]);

  if (error) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
          borderRadius: 2,
          p: 2
        }}
      >
        <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
          {error}
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          1. https://cesium.com/ion/ 방문<br/>
          2. 무료 계정 생성<br/>
          3. Access Token 발급<br/>
          4. EarthGlobe.jsx 파일의 토큰 교체
        </Typography>
      </Box>
    );
  }

  return (
    <Card 
      component="main"
      role="main"
      aria-label="2D 지도 기반 사이버 공격 시각화"
      sx={{
        width: '100%',
        height: 'calc(100vh - 120px)',
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
        flexDirection: { xs: 'column', lg: 'row' },
        gap: 1,
        overflow: 'hidden'
      }}>
        {/* 지구본 영역 */}
        <Card 
          component="section"
          aria-label="2D 지도 영역"
          sx={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            height: '100%',
            bgcolor: '#000',
            border: '1px solid #333',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 }, position: 'relative' }}>
            {/* MultilayerVisualization 이동 버튼 */}
            <IconButton
              size="small"
              aria-label="3D 멀티레이어로 이동"
              title="3D 멀티레이어로 이동"
              onClick={() => navigate('/CyberObjectInfo/MultilayerVisualization')}
              sx={{
                position: 'absolute',
                top: 6.5,
                right: 125,
                zIndex: 1000,
                bgcolor: '#222b33',
                color: '#fff',
                borderRadius: '5%',
                width: 32,
                height: 32,
                boxShadow: '0 2px 8px #222b33',
                '&:hover': {
                  bgcolor: '#5b89b1ff',
                  color: '#fff',
                },
              }}
            >
              <FundOutlined style={{ fontSize: 18 }} />
            </IconButton>
            <div
              ref={cesiumContainer}
              role="img"
              aria-label="사이버 공격 경로를 표시하는 2D 지도"
              style={{
                width: '100%',
                height: '100%'
              }}
            />
            {!isLoaded && (
              <Box
                role="status"
                aria-live="polite"
                aria-label="지도 로딩 중"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.8)',
                  color: 'white'
                }}
              >
                <Typography>2D 모드 로딩 중...</Typography>
              </Box>
            )}

            {/* 품질 표시 */}
            {isLoaded && (
              <Box sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: 1,
                fontSize: 10
              }}>
                <Typography variant="caption" color="inherit">
                  🗺️ Osint 정보 수집
                </Typography>
              </Box>
            )}

            {/* FusionDB 팝업 버튼 */}
            {isLoaded && (
              <IconButton
                size="small"
                aria-label="융합 데이터베이스 열기"
                title="융합 데이터베이스 열기"
                onClick={() => openPopup('osintDetail')}
                sx={{
                  position: 'absolute',
                  bottom: '1%',
                  left: '98%',
                  transform: 'translateX(-50%)',
                  zIndex: 1000,
                  bgcolor: '#222b33',
                  color: '#fff',
                  borderRadius: '5%',
                  width: 48,
                  height: 48,
                  boxShadow: '0 4px 12px #222b33',
                  '&:hover': {
                    bgcolor: '#5b89b1ff',
                    color: '#fff',
                    transform: 'translateX(-50%) scale(1.1)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <DatabaseOutlined style={{ fontSize: 24 }} />
              </IconButton>
            )}
          </CardContent>
        </Card>

        {/* 공격 현황 패널 */}
        <Box 
          component="aside"
          aria-label="공격 현황 패널"
          sx={{
            width: { xs: '100%', lg: 350 },
            maxWidth: { xs: '100%', lg: 400 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {/* 실시간 통계 */}
          <Card 
            component="section"
            aria-label="실시간 공격 통계"
            sx={{
              bgcolor: '#f0edfd',
              color: '#333',
              border: '1px solid #d0c9f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              minHeight: 0,
              flexShrink: 0
            }}
          >
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography 
                      variant="h4" 
                      sx={{ color: '#7c3aed', fontWeight: 'bold' }}
                      aria-label={`총 작전 수 ${attackStats.total}개`}
                    >
                      {attackStats.total}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      총 작전 수
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography 
                      variant="h4" 
                      sx={{ color: '#9333ea', fontWeight: 'bold' }}
                      aria-label={`활성 작전 ${attackStats.active}개`}
                    >
                      {attackStats.active}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      활성 작전
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 최근 공격 목록 */}
          <Card 
            component="section"
            aria-label="최근 공격 목록"
            sx={{
              bgcolor: 'transparent',
              color: '#333',
              flex: 1,
              minHeight: 0,
              border: 'none',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <CardContent sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              '&:last-child': { pb: 2 }
            }}>
              <Box
                ref={logListRef}
                role="list"
                aria-label="공격 로그 목록"
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  minHeight: 0
                }}
              >
              {attacks && attacks.map((attack, index) => (
                <Box
                  id={`log-${attack.id}`}
                  key={attack.id}
                  data-attack-id={attack.id}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`공격 정보: ${attack.type}, ${attack.source.name}에서 ${attack.target.name}로, 출발지 IP ${attack.source.ip}`}
                  aria-selected={selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)}
                  sx={{
                    p: 1,
                    mb: 1,
                    bgcolor: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.05)',
                    borderRadius: 1,
                    borderLeft: '3px solid #7c3aed',
                    border: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? '2px solid #7c3aed' : 'none',
                    boxShadow: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? '0 0 10px rgba(124,58,237,0.4)' : 'none',
                    animation: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? 'pulse 1.5s infinite' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                  onClick={() => {
                    const newSelectedId = selectedAttackId === attack.id ? null : attack.id;
                    setSelectedAttackId(newSelectedId);
                    setSelectedBuildingAttacks([]);

                    // 로그 클릭 시 지도에서 해당 건물 하이라이트 및 이동
                    if (newSelectedId) {
                      clearAllHighlights();
                      highlightBuildingOnMap(attack.id);
                    } else {
                      // 선택 해제 시 모든 하이라이트 제거
                      clearAllHighlights();
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#333' }}>
                    🔴 {attack.type} - 진행중
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    {attack.source.name} → {attack.target.name}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#888', fontSize: '10px' }}>
                    출발지 IP: {attack.source.ip}:{attack.source.port}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#888', fontSize: '10px' }}>
                    대상 IP: {attack.target.ip}:{attack.target.port}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#888', fontSize: '10px' }}>
                    Subnet: {attack.target.subnet} | Gateway: {attack.target.gateway}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#888', fontSize: '10px' }}>
                    DNS: {attack.target.dns} | Count: {attack.count}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#888', fontSize: '10px' }}>
                    {attack.timestamp.toLocaleString('ko-KR', {
                      timeZone: 'Asia/Seoul',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </Typography>

                  {/* 내부망 이동 아이콘 */}
                  <IconButton
                    size="small"
                    aria-label="내부망 토폴로지로 이동"
                    title="내부망 토폴로지로 이동"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/ExtInt/internaltopology');
                    }}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      color: '#7c3aed',
                      bgcolor: 'rgba(124,58,237,0.1)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      '&:hover': {
                        bgcolor: 'rgba(124,58,237,0.2)',
                        color: '#9333ea'
                      },
                      width: 24,
                      height: 24
                    }}
                  >
                    <FundOutlined style={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              ))}
              </Box>
            </CardContent>
          </Card>

          {/* 시간 필터링 컨트롤 */}
          <Card 
            component="section"
            aria-label="날짜 범위 필터링 컨트롤"
            sx={{
              bgcolor: '#f0edfd',
              color: '#333',
              border: '1px solid #d0c9f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              flexShrink: 0,
              minHeight: 0
            }}
          >
            <CardContent>
              <Typography 
                variant="body2" 
                component="h3"
                sx={{ mb: 1, fontWeight: 'bold', color: '#7c3aed' }}
              >
                날짜 범위 필터링
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                {(() => {
                  const startDay = new Date(startDate);
                  startDay.setDate(startDay.getDate() + timeRange[0]);
                  const endDay = new Date(startDate);
                  endDay.setDate(endDay.getDate() + timeRange[1] - 1);
                  return `${startDay.toLocaleDateString('ko-KR')} ~ ${endDay.toLocaleDateString('ko-KR')} (${timeRange[1] - timeRange[0]}일)`;
                })()}
              </Typography>
              <Slider
                aria-label="날짜 범위 선택"
                value={timeRange}
                onChange={(_, newValue) => setTimeRange(newValue)}
                min={0}
                max={7}
                step={1}
                marks={[
                  { value: 0, label: '9/2' },
                  { value: 1, label: '9/3' },
                  { value: 2, label: '9/4' },
                  { value: 3, label: '9/5' },
                  { value: 4, label: '9/6' },
                  { value: 5, label: '9/7' },
                  { value: 6, label: '9/8' },
                  { value: 7, label: '9/9' }
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => {
                  const day = new Date(startDate);
                  day.setDate(day.getDate() + value);
                  return day.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                }}
                sx={{
                  color: '#7c3aed',
                  '& .MuiSlider-thumb': {
                    backgroundColor: '#7c3aed',
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: '0 0 0 8px rgba(124,58,237, 0.16)',
                    },
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: '#7c3aed',
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: '#d0c9f0',
                  },
                  '& .MuiSlider-mark': {
                    backgroundColor: '#b8aee0',
                  },
                  '& .MuiSlider-markLabel': {
                    color: '#666',
                    fontSize: '9px',
                  },
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: '#7c3aed',
                    color: '#fff',
                  },
                }}
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#888', fontSize: '10px' }}>
                표시된 작전: {attacks.length}개 / 전체: {allAttacks.length}개 (하루당 최대 20개)
              </Typography>
            </CardContent>
          </Card>

          {/* 범례 */}
          <Card 
            component="section"
            aria-label="지도 범례"
            sx={{
              bgcolor: '#f0edfd',
              color: '#333',
              border: '1px solid #d0c9f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              flexShrink: 0,
              minHeight: 0
            }}
          >
            <CardContent>
              <Box component="ul" role="list" sx={{ display: 'flex', flexDirection: 'column', gap: 1, listStyle: 'none', p: 0, m: 0 }}>
                <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box 
                    aria-hidden="true"
                    sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FFFF00', border: '2px solid #FF0000' }} 
                  />
                  <Typography variant="caption" sx={{ color: '#666' }}>공격 출발지</Typography>
                </Box>
                <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box 
                    aria-hidden="true"
                    sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#00FFFF', border: '2px solid #0000FF' }} 
                  />
                  <Typography variant="caption" sx={{ color: '#666' }}>공격 목표지</Typography>
                </Box>
                <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box 
                    aria-hidden="true"
                    sx={{ width: 20, height: 2, bgcolor: '#FF0000', borderRadius: 1, boxShadow: '0 0 4px #FF0000' }} 
                  />
                  <Typography variant="caption" sx={{ color: '#666' }}>🔴 사이버 작전</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </CardContent>

      {/* FusionDB 팝업 다이얼로그 */}
      <Dialog
        open={fusionDBOpen}
        onClose={() => closePopup('osintDetail')}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: '80vh',
            m: 0
          }
        }}
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 2, 
          bgcolor: '#f0edfd',
          borderBottom: '2px solid #39306b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" sx={{ color: '#39306b', fontWeight: 'bold' }}>
            융합 데이터베이스 구축
          </Typography>
          <IconButton
            aria-label="닫기"
            onClick={() => closePopup('osintDetail')}
            sx={{
              color: '#39306b',
              '&:hover': {
                bgcolor: 'rgba(57, 48, 107, 0.1)'
              }
            }}
          >
            <CloseOutlined />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 'calc(100% - 64px)' }}>
          <FusionDBConsole open={fusionDBOpen} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TwoDPage;