import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { box-shadow: 0 0 10px rgba(255,0,0,0.5); }
    50% { box-shadow: 0 0 20px rgba(255,0,0,0.8); }
    100% { box-shadow: 0 0 10px rgba(255,0,0,0.5); }
  }
`;
document.head.appendChild(style);

// Cesium Ion Access Token 설정
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzODNiZmZiNC04YTUxLTQ1YzgtOWU1Mi1kNDUyY2I2ZDRkNTQiLCJpZCI6MzQyNDEzLCJpYXQiOjE3NTgxNzMyNDh9.zZRyMPovg5ALhNtG2_E-0ED0qHqd_uQQnAG84eQUyG4';

// IP 주소 생성 함수
const generateIP = (country) => {
  const ipRanges = {
    '중국': ['123.125.', '61.135.', '220.181.', '114.80.'],
    '러시아': ['93.184.', '212.22.', '195.34.', '81.23.'],
    '북한': ['175.45.', '210.52.', '202.131.', '202.174.'],
    '이란': ['2.176.', '78.39.', '91.99.', '185.143.'],
    '미국': ['8.8.', '208.67.', '173.252.', '199.232.'],
    '일본': ['103.4.', '210.173.', '133.242.', '202.32.'],
    '독일': ['217.160.', '62.75.', '188.40.', '85.13.'],
    '영국': ['212.58.', '151.101.', '185.31.', '195.59.'],
    '대한민국': ['168.126.', '203.248.', '218.234.', '121.78.']
  };

  const prefix = ipRanges[country.name][Math.floor(Math.random() * ipRanges[country.name].length)];
  const suffix1 = Math.floor(Math.random() * 256);
  const suffix2 = Math.floor(Math.random() * 256);
  return prefix + suffix1 + '.' + suffix2;
};

// AS 정보 생성 함수
const generateAS = (country) => {
  const asNumbers = {
    '중국': ['AS4134 CHINANET', 'AS4837 CHINA169', 'AS9808 CMNET', 'AS24400 ALIBABA'],
    '러시아': ['AS8359 MTS', 'AS12389 ROSTELECOM', 'AS31133 MF-MGSM', 'AS42610 NCNET'],
    '북한': ['AS131279 STAR-KP', 'AS9769 DPRK-AS', 'AS17762 KPTC-AS'],
    '이란': ['AS44244 IRANCELL', 'AS6736 BARIN', 'AS197207 MCCI', 'AS58224 TCI'],
    '미국': ['AS15169 GOOGLE', 'AS8075 MICROSOFT', 'AS16509 AMAZON', 'AS32934 FACEBOOK'],
    '일본': ['AS2516 KDDI', 'AS4713 NTT', 'AS2497 IIJ', 'AS7506 GMO'],
    '독일': ['AS3320 DEUTSCHE', 'AS8881 1&1', 'AS20940 AKAMAI', 'AS24940 HETZNER'],
    '영국': ['AS2856 BT', 'AS5089 VIRGIN', 'AS12576 EE', 'AS13037 ZEN'],
    '대한민국': ['AS9318 SKB', 'AS4766 KT', 'AS9644 LGU', 'AS17858 LG-DACOM']
  };

  const asList = asNumbers[country.name];
  return asList[Math.floor(Math.random() * asList.length)];
};

// 건물 위치 데이터 (간소화)
const buildingLocations = {
  '대한민국': [
    { name: '청와대', lat: 37.5867, lon: 126.9750 },
    { name: '국정원', lat: 37.5116, lon: 127.0983 },
    { name: '삼성본사', lat: 37.5084, lon: 127.0629 },
    { name: 'LG트윈타워', lat: 37.5127, lon: 126.9252 },
    { name: 'KT본사', lat: 37.5259, lon: 126.9297 },
    { name: '롯데타워', lat: 37.5125, lon: 127.1025 },
    { name: '국방부', lat: 37.5306, lon: 126.9745 },
    { name: '서울시청', lat: 37.5663, lon: 126.9779 }
  ],
  '중국': [
    { name: '베이징 중난하이', lat: 39.9075, lon: 116.3982 },
    { name: '상하이 금융센터', lat: 31.2304, lon: 121.4737 },
    { name: '텐센트 본사', lat: 22.5431, lon: 114.0579 },
    { name: '바이두 본사', lat: 39.9242, lon: 116.3079 }
  ],
  '러시아': [
    { name: '크렘린 궁전', lat: 55.7520, lon: 37.6175 },
    { name: '모스크바 시청', lat: 55.7558, lon: 37.6176 },
    { name: '야덱스 본사', lat: 55.7340, lon: 37.5890 },
    { name: 'FSB 본부', lat: 55.7558, lon: 37.6278 }
  ],
  '북한': [
    { name: '조선로동당 본부', lat: 39.0194, lon: 125.7381 },
    { name: '평양 정부청사', lat: 39.0392, lon: 125.7625 }
  ],
  '이란': [
    { name: '테헤란 정부청사', lat: 35.6892, lon: 51.3890 },
    { name: '이란 국방부', lat: 35.7219, lon: 51.3347 }
  ]
};

// 구체적인 공격 사례들
const generateAttackData = () => {
  const attackCases = [
    // 중국 → 한국
    { source: '중국', sourceBuilding: '베이징 중난하이', target: '청와대', type: 'APT', severity: 5 },
    { source: '중국', sourceBuilding: '상하이 금융센터', target: '삼성본사', type: 'DDoS', severity: 4 },
    { source: '중국', sourceBuilding: '텐센트 본사', target: 'KT본사', type: 'Ransomware', severity: 3 },
    { source: '중국', sourceBuilding: '바이두 본사', target: 'LG트윈타워', type: 'Phishing', severity: 2 },

    // 러시아 → 한국
    { source: '러시아', sourceBuilding: '크렘린 궁전', target: '국정원', type: 'APT', severity: 5 },
    { source: '러시아', sourceBuilding: 'FSB 본부', target: '국방부', type: 'Cyber Espionage', severity: 4 },
    { source: '러시아', sourceBuilding: '모스크바 시청', target: '서울시청', type: 'DDoS', severity: 3 },
    { source: '러시아', sourceBuilding: '야덱스 본사', target: '롯데타워', type: 'Botnet', severity: 2 },

    // 북한 → 한국
    { source: '북한', sourceBuilding: '조선로동당 본부', target: '청와대', type: 'APT', severity: 5 },
    { source: '북한', sourceBuilding: '평양 정부청사', target: '국정원', type: 'Cyber Attack', severity: 4 },

    // 이란 → 한국
    { source: '이란', sourceBuilding: '테헤란 정부청사', target: '국방부', type: 'APT', severity: 4 },
    { source: '이란', sourceBuilding: '이란 국방부', target: '삼성본사', type: 'Industrial Espionage', severity: 3 }
  ];

  const attacks = attackCases.map((attackCase, index) => {
    const sourceBuilding = buildingLocations[attackCase.source].find(b => b.name === attackCase.sourceBuilding);
    const targetBuilding = buildingLocations['대한민국'].find(b => b.name === attackCase.target);

    return {
      id: `attack-${index}`,
      source: {
        name: attackCase.source,
        building: sourceBuilding,
        ip: generateIP({ name: attackCase.source }),
        as: generateAS({ name: attackCase.source })
      },
      target: {
        name: '대한민국',
        building: targetBuilding,
        ip: generateIP({ name: '대한민국' }),
        as: generateAS({ name: '대한민국' })
      },
      type: attackCase.type,
      severity: attackCase.severity,
      timestamp: new Date(Date.now() - Math.random() * 3600000),
      status: 'active'
    };
  });

  return attacks.filter(attack => attack.source.building && attack.target.building);
};

const EarthGlobe = () => {
  const cesiumContainer = useRef(null);
  const viewer = useRef(null);
  
  const logListRef = useRef(null);
const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [attacks, setAttacks] = useState([]);
  const [attackStats, setAttackStats] = useState({
    total: 0,
    active: 0,
    blocked: 0,
    countries: 0
  });

  // 공격 데이터 초기화 및 업데이트
  useEffect(() => {
    const initializeAttacks = () => {
      const attackData = generateAttackData();
      setAttacks(attackData);

      const stats = {
        total: attackData.length,
        active: attackData.length,
        blocked: 0,
        countries: new Set([...attackData.map(a => a.source.name), ...attackData.map(a => a.target.name)]).size
      };
      setAttackStats(stats);
    };

    // 한국 시간 기준으로 다음 자정까지의 시간 계산
    const getTimeUntilMidnightKST = () => {
      const now = new Date();
      const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
      const tomorrow = new Date(koreaTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const utcTomorrow = new Date(tomorrow.toLocaleString("en-US", {timeZone: "UTC"}));
      const utcNow = new Date(now.toLocaleString("en-US", {timeZone: "UTC"}));

      return utcTomorrow.getTime() - utcNow.getTime();
    };

    initializeAttacks();

    // 다음 한국 자정까지 대기 후 24시간마다 업데이트
    const timeUntilMidnight = getTimeUntilMidnightKST();

    const midnightTimeout = setTimeout(() => {
      initializeAttacks();

      // 이후 24시간마다 반복
      const dailyInterval = setInterval(initializeAttacks, 24 * 60 * 60 * 1000);

      return () => clearInterval(dailyInterval);
    }, timeUntilMidnight);

    return () => clearTimeout(midnightTimeout);
  }, []);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    const initializeCesium = async () => {
      try {
        console.log('Cesium 초기화 시작...');
        console.log('Access Token:', Cesium.Ion.defaultAccessToken ? '설정됨' : '없음');

        // Cesium Viewer 생성 - 2D/3D 모드만 지원
        viewer.current = new Cesium.Viewer(cesiumContainer.current, {
          // UI 요소들 정리 (깔끔한 지구본)
          animation: false,
          baseLayerPicker: true,  // 레이어 선택 가능하도록
          fullscreenButton: true,
          geocoder: true,
          homeButton: true,
          infoBox: true,
          sceneModePicker: false, // 일단 기본 picker 비활성화
          scene3DOnly: false,     // 2D/3D 모드 모두 지원
          selectionIndicator: true,
          timeline: false,
          navigationHelpButton: true,
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

        // 오른쪽 위 2D/3D 선택 버튼 생성
        let isToggling = false;
        const createModeSelector = () => {
          const modeSelector = document.createElement('div');
          modeSelector.id = 'mode-selector';
          modeSelector.style.cssText = `
            position: absolute;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(42, 42, 42, 0.9);
            border-radius: 8px;
            padding: 8px;
            display: flex;
            gap: 4px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', Arial, Helvetica, sans-serif;
          `;

          // 2D 버튼
          const button2D = document.createElement('button');
          button2D.textContent = '2D';
          button2D.title = '2D 평면 모드';
          button2D.style.cssText = `
            background: rgba(48, 51, 54, 0.8);
            border: 1px solid #666;
            color: #eee;
            padding: 10px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.3s ease;
            min-width: 45px;
          `;

          // 3D 버튼
          const button3D = document.createElement('button');
          button3D.textContent = '3D';
          button3D.title = '3D 지구본 모드';
          button3D.style.cssText = button2D.style.cssText;

          // 호버 효과
          const applyHoverEffects = (button) => {
            button.addEventListener('mouseenter', () => {
              if (!button.classList.contains('active')) {
                button.style.background = 'rgba(70, 70, 70, 0.9)';
                button.style.borderColor = '#888';
              }
            });
            button.addEventListener('mouseleave', () => {
              if (!button.classList.contains('active')) {
                button.style.background = 'rgba(48, 51, 54, 0.8)';
                button.style.borderColor = '#666';
              }
            });
          };

          applyHoverEffects(button2D);
          applyHoverEffects(button3D);

          // 활성 버튼 스타일 업데이트
          const updateActiveButton = (activeMode) => {
            // 모든 버튼 초기화
            [button2D, button3D].forEach(btn => {
              btn.classList.remove('active');
              btn.style.background = 'rgba(48, 51, 54, 0.8)';
              btn.style.borderColor = '#666';
              btn.style.color = '#eee';
            });

            // 활성 버튼 스타일
            const activeBtn = activeMode === '2D' ? button2D : button3D;
            activeBtn.classList.add('active');
            activeBtn.style.background = 'rgba(42, 160, 223, 0.9)';
            activeBtn.style.borderColor = '#48b5e5';
            activeBtn.style.color = '#fff';
          };

          // 2D 버튼 클릭
          button2D.onclick = () => {
            if (isToggling) return;
            isToggling = true;

            try {
              // 모든 하이라이트 및 선택 상태 초기화
              setSelectedAttackId(null);
              setSelectedBuildingAttacks([]);
              clearAllHighlights();

              viewer.current.scene.morphTo2D(1.0);
              console.log('2D 모드로 전환 중...');

              // 전환 완료 후 한국 중심으로 이동
              setTimeout(() => {
                const koreaView2D = {
                  destination: Cesium.Cartesian3.fromDegrees(127.5, 36.5, 3000000), // 한국 중심, 2D용 높이
                };
                viewer.current.camera.setView(koreaView2D);
                console.log('2D 모드: 한국 중심으로 이동 완료');
              }, 1200); // 모드 전환이 완료된 후 실행
            } catch (error) {
              console.error('2D 모드 전환 오류:', error);
            }

            setTimeout(() => {
              isToggling = false;
            }, 2000);
          };

          // 3D 버튼 클릭
          button3D.onclick = () => {
            if (isToggling) return;
            isToggling = true;

            try {
              // 모든 하이라이트 및 선택 상태 초기화
              setSelectedAttackId(null);
              setSelectedBuildingAttacks([]);
              clearAllHighlights();

              viewer.current.scene.morphTo3D(1.0);
              console.log('3D 모드로 전환 중...');

              // 전환 완료 후 한국 중심으로 이동
              setTimeout(() => {
                const koreaView3D = {
                  destination: Cesium.Cartesian3.fromDegrees(127.5, 36.5, 8000000), // 한국 중심, 3D용 높이
                  orientation: {
                    heading: 0,
                    pitch: -Cesium.Math.PI_OVER_TWO, // 직각 아래 시점
                    roll: 0
                  }
                };
                viewer.current.camera.setView(koreaView3D);
                console.log('3D 모드: 한국 중심으로 이동 완료');
              }, 1200); // 모드 전환이 완료된 후 실행
            } catch (error) {
              console.error('3D 모드 전환 오류:', error);
            }

            setTimeout(() => {
              isToggling = false;
            }, 2000);
          };

          // 버튼 추가
          modeSelector.appendChild(button2D);
          modeSelector.appendChild(button3D);

          // Cesium 컨테이너에 추가
          viewer.current.container.appendChild(modeSelector);

          // 초기 상태 설정 (3D)
          updateActiveButton('3D');

          // 모드 변경 감지
          viewer.current.scene.morphComplete.addEventListener(() => {
            const currentMode = viewer.current.scene.mode;
            updateActiveButton(currentMode === Cesium.SceneMode.SCENE2D ? '2D' : '3D');
          });

          return modeSelector;
        };

        // 모드 선택기 생성
        setTimeout(createModeSelector, 100);

        // Columbus View 완전 차단
        const originalMorphToColumbusView = viewer.current.scene.morphToColumbusView;
        viewer.current.scene.morphToColumbusView = () => {
          console.log('Columbus View 차단됨 - 3D 모드로 전환');
          viewer.current.scene.morphTo3D(1.0);
        };

        // 전체화면 버튼 커스터마이징 - 모니터 전체화면으로 설정
        const fullscreenButton = viewer.current.fullscreenButton;
        fullscreenButton.viewModel.command.beforeExecute.addEventListener((e) => {
          e.cancel = true; // 기본 전체화면 동작 취소

          // 브라우저 전체화면 API 사용
          const element = document.documentElement;
          if (!document.fullscreenElement) {
            if (element.requestFullscreen) {
              element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
              element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) {
              element.msRequestFullscreen();
            }
          } else {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
              document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
              document.msExitFullscreen();
            }
          }
        });

        console.log('Cesium Viewer 생성 완료');

        // 추가 고해상도 이미지 레이어들 추가
        const imageryLayers = viewer.current.imageryLayers;

        // 고해상도 위성 이미지는 기본 Ion 이미지로 대체
        // Bing Maps는 키가 필요하므로 제거

        // 3D 건물 타일셋 추가 (OpenStreetMap 건물)
        try {
          const buildingTileset = await Cesium.Cesium3DTileset.fromIonAssetId(96188);
          viewer.current.scene.primitives.add(buildingTileset);
          console.log('3D 건물 데이터 로드 완료');
        } catch (error) {
          console.log('3D 건물 데이터 로드 실패:', error);
        }

        // 고해상도 이미지 레이어 추가 (Bing Maps Aerial)
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
      globe.maximumScreenSpaceError = 1.0;  // 더 높은 상세도
      globe.tileCacheSize = 1000;  // 더 많은 타일 캐시

      // 카메라 움직임 제한 설정 (2D/3D 호환)
      const setupCameraControls = () => {
        const currentMode = scene.mode;

        if (currentMode === Cesium.SceneMode.SCENE2D) {
          // 평면 2D 모드 - 안전한 설정
          try {
            scene.screenSpaceCameraController.enableRotate = false;
            scene.screenSpaceCameraController.enableTranslate = true;
            scene.screenSpaceCameraController.enableZoom = true;
            scene.screenSpaceCameraController.enableTilt = false;
            scene.screenSpaceCameraController.enableLook = false;
            scene.screenSpaceCameraController.enableInputs = true;

            // 2D 모드에서 제약 제거
            scene.screenSpaceCameraController.constrainedAxis = undefined;

            // 2D 모드 확대 범위 (최대한 확대 가능하도록)
            scene.screenSpaceCameraController.minimumZoomDistance = 1;       // 최소 1m (매우 가까이)
            scene.screenSpaceCameraController.maximumZoomDistance = 50000000; // 최대 50,000km

            // 2D 모드에서 안전한 패닝 설정
            scene.screenSpaceCameraController.translateEventTypes = [
              Cesium.CameraEventType.LEFT_DRAG,
              Cesium.CameraEventType.RIGHT_DRAG
            ];

            // 2D 모드에서 줌 속도 조정 (너무 빠른 줌 방지)
            scene.screenSpaceCameraController.zoomEventTypes = [
              Cesium.CameraEventType.WHEEL,
              Cesium.CameraEventType.PINCH
            ];

            // 2D 카메라 이벤트 오류 방지 및 줌 개선
            scene.screenSpaceCameraController.bounceAnimationTime = 0;

            // 2D 모드에서 안정적인 마우스 조작
            scene.screenSpaceCameraController.enableCollisionDetection = false;

            // 패닝 감도 조정 (더 부드럽게)
            scene.screenSpaceCameraController.translateEventTypes = [
              Cesium.CameraEventType.LEFT_DRAG
            ];

            // 줌 설정
            scene.screenSpaceCameraController.zoomEventTypes = [
              Cesium.CameraEventType.WHEEL,
              Cesium.CameraEventType.PINCH
            ];

            // 더 안정적인 줌 속도 (너무 빠른 줌 방지)
            scene.screenSpaceCameraController.wheelZoomFactor = 0.05;

            // 2D에서 회전 완전 비활성화
            scene.screenSpaceCameraController.enableRotate = false;
            scene.screenSpaceCameraController.enableTilt = false;
            scene.screenSpaceCameraController.enableLook = false;

            // 관성 설정 (부드러운 움직임)
            scene.screenSpaceCameraController.inertiaSpin = 0.9;
            scene.screenSpaceCameraController.inertiaTranslate = 0.9;
            scene.screenSpaceCameraController.inertiaZoom = 0.8;

            console.log('2D 모드 카메라 컨트롤 설정 완료');
          } catch (error) {
            console.error('2D 모드 카메라 설정 오류:', error);
          }
        } else {
          // 3D 모드 설정 (개선된 카메라 컨트롤)
          scene.screenSpaceCameraController.enableRotate = true;
          scene.screenSpaceCameraController.enableTranslate = true; // 3D에서도 팬 가능하도록
          scene.screenSpaceCameraController.enableZoom = true;
          scene.screenSpaceCameraController.enableTilt = true; // 틸트 가능
          scene.screenSpaceCameraController.enableLook = false;
          scene.screenSpaceCameraController.enableInputs = true;

          // 3D 모드 줌 범위 (더 가까이 갈 수 있도록)
          scene.screenSpaceCameraController.minimumZoomDistance = 10;
          scene.screenSpaceCameraController.maximumZoomDistance = 50000000;

          // 카메라가 항상 지구 중심을 바라보도록 설정
          scene.screenSpaceCameraController.constrainedAxis = Cesium.Cartesian3.UNIT_Z;

          // 3D 모드에서 부드러운 회전 및 줌
          scene.screenSpaceCameraController.rotateEventTypes = [
            Cesium.CameraEventType.LEFT_DRAG,
            Cesium.CameraEventType.RIGHT_DRAG
          ];

          scene.screenSpaceCameraController.zoomEventTypes = [
            Cesium.CameraEventType.WHEEL,
            Cesium.CameraEventType.PINCH,
            Cesium.CameraEventType.MIDDLE_DRAG
          ];

          scene.screenSpaceCameraController.translateEventTypes = [
            Cesium.CameraEventType.RIGHT_DRAG
          ];

          scene.screenSpaceCameraController.tiltEventTypes = [
            Cesium.CameraEventType.MIDDLE_DRAG
          ];

          // 부드러운 움직임을 위한 관성 설정
          scene.screenSpaceCameraController.inertiaSpin = 0.9;
          scene.screenSpaceCameraController.inertiaTranslate = 0.9;
          scene.screenSpaceCameraController.inertiaZoom = 0.8;

          // 더 부드러운 줌 속도
          scene.screenSpaceCameraController.wheelZoomFactor = 0.1;
        }
      };

      setupCameraControls();

      // 마우스 상호작용 및 정보 표시 활성화
      viewer.current.cesiumWidget.creditContainer.style.display = "none";  // 크레딧 숨기기

      

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

      // 초기 카메라 위치 - 한국 중심으로 설정
      const koreaView = {
        destination: Cesium.Cartesian3.fromDegrees(127.5, 36.5, 8000000), // 한국 중심 (서울 근처)
        orientation: {
          heading: 0,
          pitch: -Cesium.Math.PI_OVER_TWO, // 직각 아래 시점으로 한국 중심
          roll: 0
        }
      };

      viewer.current.camera.setView(koreaView);

      // 홈 버튼을 눌렀을 때도 한국 중심으로
      viewer.current.homeButton.viewModel.command.beforeExecute.addEventListener((e) => {
        e.cancel = true;
        viewer.current.camera.setView(koreaView);
      });

      // 고품질 렌더링 설정
      if (Cesium.FeatureDetection.supportsImageRenderingPixelated()) {
        viewer.current.resolutionScale = window.devicePixelRatio;
      }

      // 장면 설정
      scene.postProcessStages.fxaa.enabled = true;

      // 애니메이션 시계 설정 (광선 애니메이션 지속)
      viewer.current.clock.shouldAnimate = true;
      viewer.current.clock.multiplier = 1.0;
      viewer.current.clock.currentTime = Cesium.JulianDate.now();

      // 카메라 움직임 중에도 애니메이션 계속 실행
      scene.screenSpaceCameraController.enableInputs = true;
      viewer.current.scene.requestRenderMode = false; // 연속 렌더링 모드

      // 강제 연속 렌더링을 위한 루프 (더 강력하게)
      scene.requestRenderMode = false;
      scene.maximumRenderTimeChange = Infinity;

      // 추가적인 연속 렌더링 보장
      const forceRender = () => {
        if (viewer.current && !viewer.current.isDestroyed()) {
          scene.requestRender();
          requestAnimationFrame(forceRender);
        }
      };
      forceRender();

      // 시계를 항상 실행 상태로 유지
      setInterval(() => {
        if (viewer.current && !viewer.current.isDestroyed()) {
          viewer.current.clock.tick();
        }
      }, 16); // 60fps

      // 씬 모드 변경 이벤트 리스너 추가 (2D/3D 호환성, 오류 방지)
      viewer.current.scene.morphComplete.addEventListener(() => {
        try {
          const currentMode = viewer.current.scene.mode;
          const modeText = currentMode === Cesium.SceneMode.SCENE2D ? '2D' : '3D';
          console.log('Scene mode changed to:', modeText);

          // 카메라 컨트롤 재설정 (안전하게)
          try {
            setupCameraControls();
          } catch (error) {
            console.error('카메라 컨트롤 설정 오류:', error);
          }

          // 2D 모드에서 추가 안전 장치
          if (currentMode === Cesium.SceneMode.SCENE2D) {
            setTimeout(() => {
              if (viewer.current && !viewer.current.isDestroyed()) {
                try {
                  // 2D 모드에서 카메라 위치 안전하게 조정
                  const camera = viewer.current.camera;
                  if (camera.position) {
                    const height = camera.positionCartographic.height;
                    if (height < 1000 || height > 20000000) {
                      // 안전한 높이로 조정 - 한국 중심으로
                      camera.setView({
                        destination: Cesium.Cartesian3.fromDegrees(127.5, 36.5, 5000000)
                      });
                      console.log('2D 카메라 위치 안전 조정');
                    }
                  }
                } catch (cameraError) {
                  console.error('2D 카메라 조정 오류:', cameraError);
                }
              }
            }, 500);
          }

          // 모드 변경 시 강제 렌더링 및 엔티티 재구성 (안전하게 처리)
          setTimeout(() => {
            if (viewer.current && !viewer.current.isDestroyed()) {
              try {
                viewer.current.scene.requestRender();

                // 하이라이트 상태 초기화 (모드 변경 시)
                setHighlightedBuildings([]);
                setMarkerHighlights([]);

                // 엔티티들을 다시 로드하여 2D/3D 호환성 보장
                const currentAttacks = [...attacks];
                if (currentAttacks.length > 0) {
                  // 기존 엔티티 제거 후 재생성
                  viewer.current.entities.removeAll();

                  // 약간의 지연 후 엔티티 재생성 (React state 업데이트 트리거)
                  setTimeout(() => {
                    setAttacks([...currentAttacks]);
                  }, 50);
                }
              } catch (renderError) {
                console.error('렌더링 오류:', renderError);
              }
            }
          }, 200);

        } catch (error) {
          console.error('모드 변경 처리 오류:', error);
        }
      });

        setIsLoaded(true);

      } catch (error) {
        console.error('Cesium 초기화 오류:', error);
        setError(`Cesium 초기화 실패: ${error.message}`);
      }
    };

    initializeCesium();

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (viewer.current) {
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
  const clearAllHighlights = () => {
    if (!viewer.current) return;

    const currentMode = viewer.current.scene.mode;
    const isScene2D = currentMode === Cesium.SceneMode.SCENE2D;

    // 모든 엔티티를 순회하면서 원래 색상으로 복원
    const entities = viewer.current.entities.values;
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (entity.point) {
        // ID를 기반으로 원래 색상 결정
        if (entity.id.includes('source')) {
          entity.point.color = Cesium.Color.YELLOW;
          entity.point.outlineColor = Cesium.Color.RED;
        } else if (entity.id.includes('target')) {
          entity.point.color = Cesium.Color.CYAN;
          entity.point.outlineColor = Cesium.Color.BLUE;
        }
        entity.point.pixelSize = isScene2D ? 15 : 12;
      }
    }

    // 상태 초기화
    setHighlightedBuildings([]);
    setMarkerHighlights([]);
  };

  // 지도에서 건물 하이라이트 함수
  const highlightBuildingOnMap = (attackId) => {
    if (!viewer.current || !attacks) return;

    const attack = attacks.find(a => a.id.toString() === attackId.toString());
    if (!attack) return;

    // 현재 씬 모드 확인
    const currentMode = viewer.current.scene.mode;
    const isScene2D = currentMode === Cesium.SceneMode.SCENE2D;

    // 기존 하이라이트 제거
    highlightedBuildings.forEach(entityId => {
      const entity = viewer.current.entities.getById(entityId);
      if (entity && entity.point) {
        // 원래 색상으로 복원
        if (entityId.includes('source')) {
          entity.point.color = Cesium.Color.YELLOW;
          entity.point.outlineColor = Cesium.Color.RED;
        } else {
          entity.point.color = Cesium.Color.CYAN;
          entity.point.outlineColor = Cesium.Color.BLUE;
        }
        entity.point.pixelSize = isScene2D ? 15 : 12;
      }
    });

    // 새로운 하이라이트 적용
    const targetPrefix = isScene2D ? `target-2d-${attack.id}` : `target-building-3d-${attack.id}`;
    const sourcePrefix = isScene2D ? `source-2d-${attack.id}` : `source-building-3d-${attack.id}`;

    const targetEntity = viewer.current.entities.getById(targetPrefix);
    const sourceEntity = viewer.current.entities.getById(sourcePrefix);

    const newHighlighted = [];

    if (targetEntity && targetEntity.point) {
      targetEntity.point.color = Cesium.Color.LIME; // 밝은 녹색으로 하이라이트
      targetEntity.point.outlineColor = Cesium.Color.WHITE;
      targetEntity.point.pixelSize = isScene2D ? 25 : 20; // 크기 증가
      newHighlighted.push(targetPrefix);
    }

    if (sourceEntity && sourceEntity.point) {
      sourceEntity.point.color = Cesium.Color.ORANGE; // 밝은 주황색으로 하이라이트
      sourceEntity.point.outlineColor = Cesium.Color.WHITE;
      sourceEntity.point.pixelSize = isScene2D ? 25 : 20; // 크기 증가
      newHighlighted.push(sourcePrefix);
    }

    setHighlightedBuildings(newHighlighted);

    // 대상 건물로 카메라 이동 (타깃 우선, 없으면 소스, 최종 한국 중심)
    const flyToEntity = (ent) => {
      const position = ent.position.getValue(viewer.current.clock.currentTime);
      if (!position) return false;
      const cartographic = Cesium.Cartographic.fromCartesian(position);
      const longitude = Cesium.Math.toDegrees(cartographic.longitude);
      const latitude = Cesium.Math.toDegrees(cartographic.latitude);
      const targetView = isScene2D ?
        { destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 500000) } :
        { destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1000000),
          orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_FOUR, roll: 0 } };
      viewer.current.camera.flyTo({ ...targetView, duration: 2.0 });
      return true;
    };

    if (!(targetEntity && flyToEntity(targetEntity))) {
      if (!(sourceEntity && flyToEntity(sourceEntity))) {
        const fallback = Cesium.Cartesian3.fromDegrees(127.5, 36.5, isScene2D ? 500000 : 1000000);
        viewer.current.camera.flyTo({ destination: fallback, duration: 2.0 });
      }
    }
  };

  // 마커 하이라이트 함수 (IP 기반)
  const highlightMarkerAndLogs = (clickedAttack, entityId) => {
    if (!viewer.current || !attacks) return;

    // 현재 씬 모드 확인
    const currentMode = viewer.current.scene.mode;
    const isScene2D = currentMode === Cesium.SceneMode.SCENE2D;

    // 모든 하이라이트 강제 제거
    clearAllHighlights();

    // 클릭된 마커가 source인지 target인지 확인
    const isSource = entityId.includes('source');
    const clickedIP = isSource ? clickedAttack.source.ip : clickedAttack.target.ip;

    console.log('클릭된 IP:', clickedIP);

    // 해당 IP와 관련된 모든 공격 찾기
    const relatedAttacks = attacks.filter(attack => {
      return attack.source.ip === clickedIP || attack.target.ip === clickedIP;
    });

    console.log('IP로 찾은 관련 공격들:', relatedAttacks.map(a => ({id: a.id, sourceIP: a.source.ip, targetIP: a.target.ip})));

    if (relatedAttacks.length > 0) {
      // 모든 관련된 마커 하이라이트
      const newMarkerHighlights = [];

      relatedAttacks.forEach(attack => {
        const sourceEntityId = isScene2D ? `source-2d-${attack.id}` : `source-building-3d-${attack.id}`;
        const targetEntityId = isScene2D ? `target-2d-${attack.id}` : `target-building-3d-${attack.id}`;

        const sourceEntity = viewer.current.entities.getById(sourceEntityId);
        const targetEntity = viewer.current.entities.getById(targetEntityId);

        // Source 마커 하이라이트 (해당 IP와 일치하는 경우)
        if (sourceEntity && attack.source.ip === clickedIP) {
          sourceEntity.point.color = Cesium.Color.ORANGE;
          sourceEntity.point.outlineColor = Cesium.Color.WHITE; // 흰색 외관선
          sourceEntity.point.pixelSize = isScene2D ? 25 : 20;
          newMarkerHighlights.push(sourceEntityId);
        }

        // Target 마커 하이라이트 (해당 IP와 일치하는 경우)
        if (targetEntity && attack.target.ip === clickedIP) {
          targetEntity.point.color = Cesium.Color.LIME;
          targetEntity.point.outlineColor = Cesium.Color.WHITE; // 흰색 외관선
          targetEntity.point.pixelSize = isScene2D ? 25 : 20;
          newMarkerHighlights.push(targetEntityId);
        }
      });

      setMarkerHighlights(newMarkerHighlights);

      // 관련된 로그들 하이라이트
      const relatedAttackIds = relatedAttacks.map(attack => attack.id);
      setSelectedBuildingAttacks(relatedAttackIds);
      setSelectedAttackId(null);

      // 첫 번째 관련 로그로 스크롤
      if (relatedAttacks.length > 0 && logListRef && logListRef.current) {
        const first = relatedAttacks[0];
        const el = document.getElementById(`log-${first.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.animation = 'pulse 1.2s ease-out 1';
          setTimeout(() => { el.style.animation = ''; }, 1300);
        }
      }

      console.log('✅ IP 기반 하이라이트 완료 - 마커:', newMarkerHighlights.length, '개, 로그:', relatedAttackIds.length, '개');
    }
  };

  // 2D 모드용 엔티티 생성 함수 (완전히 재작성)
  const create2DEntities = (attacks) => {
    if (!viewer.current || !attacks || attacks.length === 0) return;

    console.log('=== 2D 엔티티 생성 시작 ===');
    console.log('공격 데이터:', attacks.length, '개');

    try {
      // 테스트용 고정 데이터로 먼저 검증
      const testAttacks = [
        {
          id: 'test-1',
          source: {
            building: { name: '베이징', lat: 39.9042, lon: 116.4074 },
            name: '중국'
          },
          target: {
            building: { name: '서울', lat: 37.5665, lon: 126.9780 },
            name: '대한민국'
          }
        },
        {
          id: 'test-2',
          source: {
            building: { name: '모스크바', lat: 55.7558, lon: 37.6176 },
            name: '러시아'
          },
          target: {
            building: { name: '부산', lat: 35.1796, lon: 129.0756 },
            name: '대한민국'
          }
        }
      ];

      // 실제 데이터와 테스트 데이터 중 하나 선택 (디버깅용)
      const dataToUse = attacks.length > 0 ? attacks : testAttacks;

      dataToUse.forEach((attack, index) => {
        console.log(`--- 공격 ${index + 1} 처리 ---`);

        // 좌표 추출 및 검증
        const sourceLon = Number(attack.source.building.lon);
        const sourceLat = Number(attack.source.building.lat);
        const targetLon = Number(attack.target.building.lon);
        const targetLat = Number(attack.target.building.lat);

        console.log('원본 좌표:', {
          source: `${attack.source.building.name}: lon=${attack.source.building.lon}, lat=${attack.source.building.lat}`,
          target: `${attack.target.building.name}: lon=${attack.target.building.lon}, lat=${attack.target.building.lat}`
        });

        console.log('변환된 좌표:', {
          source: `${sourceLon}, ${sourceLat}`,
          target: `${targetLon}, ${targetLat}`
        });

        // 좌표 유효성 검증
        if (isNaN(sourceLon) || isNaN(sourceLat) || isNaN(targetLon) || isNaN(targetLat)) {
          console.error('❌ NaN 좌표 발견:', { sourceLon, sourceLat, targetLon, targetLat });
          return;
        }

        if (sourceLon < -180 || sourceLon > 180 || sourceLat < -90 || sourceLat > 90 ||
            targetLon < -180 || targetLon > 180 || targetLat < -90 || targetLat > 90) {
          console.error('❌ 범위 벗어난 좌표:', { sourceLon, sourceLat, targetLon, targetLat });
          return;
        }

        console.log('✅ 좌표 유효성 검증 통과');

        // 2D 모드에서는 높이를 0으로 설정 (지면에 정확히)
        const markerHeight = 0; // 2D에서는 지면에 정확히
        const sourceMarkerPos = Cesium.Cartesian3.fromDegrees(sourceLon, sourceLat, markerHeight);
        const targetMarkerPos = Cesium.Cartesian3.fromDegrees(targetLon, targetLat, markerHeight);

        console.log('통일된 좌표 생성 완료:', {
          source: `(${sourceLon}, ${sourceLat}, ${markerHeight}m)`,
          target: `(${targetLon}, ${targetLat}, ${markerHeight}m)`
        });

        // 마커 생성 (정확한 위치에)
        try {
          // 소스 마커 (노란색) - 공격 출발지
          const sourceEntity = viewer.current.entities.add({
            id: `source-2d-${attack.id}`,
            position: sourceMarkerPos,
            point: {
              pixelSize: 15,
              color: Cesium.Color.YELLOW,
              outlineColor: Cesium.Color.RED,
              outlineWidth: 3,
              heightReference: Cesium.HeightReference.NONE,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              show: true
            }
          });

          // buildingData를 별도로 설정 (더 확실한 방법)
          sourceEntity.buildingData = {
            name: attack.source.building.name,
            country: attack.source.name,
            type: 'source'
          };

          // 타겟 마커 (청록색) - 공격 받는 곳
          const targetEntity = viewer.current.entities.add({
            id: `target-2d-${attack.id}`,
            position: targetMarkerPos,
            point: {
              pixelSize: 15,
              color: Cesium.Color.CYAN,
              outlineColor: Cesium.Color.BLUE,
              outlineWidth: 3,
              heightReference: Cesium.HeightReference.NONE,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              show: true
            }
          });

          // buildingData를 별도로 설정 (더 확실한 방법)
          targetEntity.buildingData = {
            name: attack.target.building.name,
            country: attack.target.name,
            type: 'target'
          };

          console.log('✅ 마커 생성 완료');

        } catch (e) {
          console.error('❌ 마커 생성 실패:', e);
          return;
        }

        // 광선 생성 (2D 모드용 - 단순화)
        try {
          const beamEntity = viewer.current.entities.add({
            id: `beam-2d-${attack.id}`,
            polyline: {
              positions: [sourceMarkerPos, targetMarkerPos],
              width: 6,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.3,
                color: new Cesium.CallbackProperty((time) => {
                  const seconds = Cesium.JulianDate.secondsDifference(time, viewer.current.clock.startTime) % 2;
                  const alpha = 0.6 + 0.4 * Math.sin(seconds * Math.PI);
                  return Cesium.Color.RED.withAlpha(alpha);
                }, false)
              }),
              clampToGround: false, // 2D에서는 false로 설정
              followSurface: false, // 2D에서는 단순한 직선
              granularity: Cesium.Math.RADIANS_PER_DEGREE
            },
            description: `🔴 사이버 공격: ${attack.source.name} → ${attack.target.name}`,
            attackData: attack
          });

          console.log('✅ 광선 생성 완료 - 2D 모드용');

        } catch (e) {
          console.error('❌ 광선 생성 실패:', e);
        }

        console.log(`✅ 공격 ${index + 1} 처리 완료`);
      });

      console.log('=== 2D 엔티티 생성 완료 ===');

    } catch (error) {
      console.error('❌ 2D 엔티티 생성 중 치명적 오류:', error);
    }
  };

  // 3D 모드용 엔티티 생성 함수 (단순화)
  const create3DEntities = (attacks) => {
    if (!viewer.current || !attacks || attacks.length === 0) return;

    try {
      const beamColor = '#FF0000';
      const startTime = viewer.current.clock.currentTime;

      attacks.forEach((attack) => {
        // 좌표 유효성 검증
        const sourceLon = parseFloat(attack.source.building.lon);
        const sourceLat = parseFloat(attack.source.building.lat);
        const targetLon = parseFloat(attack.target.building.lon);
        const targetLat = parseFloat(attack.target.building.lat);

        if (isNaN(sourceLon) || isNaN(sourceLat) || isNaN(targetLon) || isNaN(targetLat)) {
          console.warn('3D 모드: 잘못된 좌표 데이터');
          return;
        }

        // 3D에서는 건물 높이를 더 높게 설정 (1000m)
        const markerHeight3D = 1000;
        const sourceMarkerPos = Cesium.Cartesian3.fromDegrees(sourceLon, sourceLat, markerHeight3D);
        const targetMarkerPos = Cesium.Cartesian3.fromDegrees(targetLon, targetLat, markerHeight3D);

        console.log('3D 마커 생성:', {
          attack: attack.id,
          source: `${attack.source.building.name} (${sourceLon}, ${sourceLat})`,
          target: `${attack.target.building.name} (${targetLon}, ${targetLat})`,
          sourceIP: attack.source.ip,
          targetIP: attack.target.ip
        });

        // 3D 소스 마커 (공격 출발지)
        viewer.current.entities.add({
          id: `source-building-3d-${attack.id}`,
          position: sourceMarkerPos,
          point: {
            pixelSize: 12,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.RED,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.NONE,
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            show: true
          },
          buildingData: {
            name: attack.source.building.name,
            country: attack.source.name,
            type: 'source'
          }
        });

        // 3D 타겟 마커 (공격 받는 곳)
        viewer.current.entities.add({
          id: `target-building-3d-${attack.id}`,
          position: targetMarkerPos,
          point: {
            pixelSize: 12,
            color: Cesium.Color.CYAN,
            outlineColor: Cesium.Color.BLUE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.NONE,
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            show: true
          },
          buildingData: {
            name: attack.target.building.name,
            country: attack.target.name,
            type: 'target'
          }
        });

        // 3D 아치형 광선 - 마커 위치에서 시작/끝
        // 아치형 경로 생성 (마커 높이에서 시작해서 아치를 그린 후 마커 높이로 끝남)
        const positions = [];
        for (let i = 0; i <= 30; i++) {
          const segmentProgress = i / 30;
          const lerpedPos = Cesium.Cartesian3.lerp(sourceMarkerPos, targetMarkerPos, segmentProgress, new Cesium.Cartesian3());

          // 아치 높이를 마커 높이 기준으로 추가
          const archHeight = Math.sin(segmentProgress * Math.PI) * 50000; // 50km 아치
          const cartographic = Cesium.Cartographic.fromCartesian(lerpedPos);
          cartographic.height = markerHeight3D + archHeight; // 마커 높이 + 아치 높이
          positions.push(Cesium.Cartographic.toCartesian(cartographic));
        }

        // 첫 번째와 마지막 점을 정확히 마커 위치로 설정
        positions[0] = sourceMarkerPos;
        positions[positions.length - 1] = targetMarkerPos;

        viewer.current.entities.add({
          id: `beam-3d-${attack.id}`,
          polyline: {
            positions: positions,
            width: 6,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.4,
              color: new Cesium.CallbackProperty((time) => {
                const t = Cesium.JulianDate.secondsDifference(time, startTime) % 3.0;
                const progress = t / 3.0;
                const alpha = 0.7 + 0.3 * Math.sin(progress * Math.PI * 2);
                return Cesium.Color.fromCssColorString(beamColor).withAlpha(alpha);
              }, false)
            }),
            clampToGround: false
          },
          description: `🔴 사이버 공격: ${attack.source.name} → ${attack.target.name}`,
          attackData: attack
        });

        console.log(`✅ 3D 공격 처리 완료: ${attack.source.building.name} → ${attack.target.building.name}`);
      });
    } catch (error) {
      console.error('3D 엔티티 생성 오류:', error);
    }
  };

  // 공격 시각화 효과 (모드별 분리)
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

      // 현재 씬 모드 확인
      const currentMode = viewer.current.scene.mode;
      const isScene2D = currentMode === Cesium.SceneMode.SCENE2D;

      // 모드별로 엔티티 생성
      if (isScene2D) {
        create2DEntities(attacks);
      } else {
        create3DEntities(attacks);
      }
    } catch (error) {
      console.error('엔티티 생성 중 오류 발생:', error);
    }

    // 클릭 이벤트 핸들러 (모드별 분리)
    if (viewer.current.screenSpaceEventHandler) {
      viewer.current.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    viewer.current.screenSpaceEventHandler.setInputAction((click) => {
      try {
        const pickedObject = viewer.current.scene.pick(click.position);
        const currentMode = viewer.current.scene.mode;
        const isScene2D = currentMode === Cesium.SceneMode.SCENE2D;

        console.log('=== 클릭 이벤트 디버깅 ===');
        console.log('현재 모드:', isScene2D ? '2D' : '3D');
        console.log('클릭된 객체:', pickedObject);

        if (pickedObject && pickedObject.id) {
          // 다양한 방식으로 ID 찾기
          let entityId = null;
          if (pickedObject.id.id) {
            entityId = pickedObject.id.id;
          } else if (pickedObject.id._id) {
            entityId = pickedObject.id._id;
          } else if (typeof pickedObject.id === 'string') {
            entityId = pickedObject.id;
          }

          console.log('엔티티 ID:', entityId);


          // 건물 클릭 처리 (모드별 ID 체크 - 수정됨)
          const isSourceBuilding = (isScene2D && entityId && entityId.startsWith('source-2d-')) ||
                                  (!isScene2D && entityId && entityId.startsWith('source-building-3d-'));
          const isTargetBuilding = (isScene2D && entityId && entityId.startsWith('target-2d-')) ||
                                  (!isScene2D && entityId && entityId.startsWith('target-building-3d-'));

          console.log('건물 클릭 체크:', {
            isSourceBuilding,
            isTargetBuilding,
            entityId,
            expectedSourcePrefix: isScene2D ? 'source-2d-' : 'source-building-3d-',
            expectedTargetPrefix: isScene2D ? 'target-2d-' : 'target-building-3d-'
          });

          if (isSourceBuilding || isTargetBuilding) {
            console.log('✅ 건물 클릭됨 - entityId:', entityId);

            // ID에서 직접 attack ID 추출하여 관련 공격 찾기 (더 확실한 방법)
            let attackId = null;
            if (entityId.startsWith('source-2d-')) {
              attackId = entityId.replace('source-2d-', '');
            } else if (entityId.startsWith('target-2d-')) {
              attackId = entityId.replace('target-2d-', '');
            } else if (entityId.startsWith('source-building-3d-')) {
              attackId = entityId.replace('source-building-3d-', '');
            } else if (entityId.startsWith('target-building-3d-')) {
              attackId = entityId.replace('target-building-3d-', '');
            }

            console.log('추출된 attackId:', attackId);

            if (attackId) {
              // attackId를 다양한 형태로 시도해보기
              let clickedAttack = attacks.find(attack => attack.id.toString() === attackId);

              if (!clickedAttack) {
                // 숫자로 변환해서 다시 시도
                clickedAttack = attacks.find(attack => attack.id === parseInt(attackId));
              }

              if (!clickedAttack) {
                // 전체 문자열 매칭 시도
                clickedAttack = attacks.find(attack => attack.id === attackId);
              }

              console.log('찾기 시도 - 공격 ID:', attackId, '타입:', typeof attackId);
              console.log('모든 공격 ID들:', attacks.map(a => ({ id: a.id, type: typeof a.id })));

              if (clickedAttack) {
                console.log('✅ 찾은 공격:', clickedAttack);

                // IP 기반으로 마커와 로그 하이라이트 (내부에서 기존 하이라이트 제거)
                highlightMarkerAndLogs(clickedAttack, entityId);
                return;
              } else {
                console.log('❌ 해당 attackId로 공격을 찾을 수 없음:', attackId);
                console.log('시도한 방법들: 문자열 매칭, parseInt, 직접 매칭');
              }
            }
          }

          console.log('❌ 매칭되는 엔티티 없음');
        }

        // 빈 공간 클릭 시 선택 해제
        console.log('빈 공간 클릭 - 선택 해제');
        setSelectedAttackId(null);
        setSelectedBuildingAttacks([]);

        // 모든 하이라이트 제거
        clearAllHighlights();
      } catch (error) {
        console.error('클릭 이벤트 처리 오류:', error);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
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
    <Box sx={{ width: '100%', height: '100%', display: 'flex', gap: 2 }}>
      {/* 지구본 영역 */}
      <Box sx={{ flex: 1, position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
        <div
          ref={cesiumContainer}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        />
        {!isLoaded && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.1)',
              borderRadius: 2
            }}
          >
            <Typography>실제 지구본 로딩 중...</Typography>
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
              🌍 실제 위성 데이터
            </Typography>
          </Box>
        )}
      </Box>

      {/* 공격 현황 패널 */}
      <Box sx={{ width: 300, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* 실시간 통계 */}
        <Card sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: '#ff4444' }}>
              🚨 대한민국 사이버 공격 현황
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#ff4444', fontWeight: 'bold' }}>
                    {attackStats.total}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ccc' }}>
                    총 공격 수
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#ffaa44', fontWeight: 'bold' }}>
                    {attackStats.active}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ccc' }}>
                    활성 공격
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 최근 공격 목록 */}
        <Card sx={{ bgcolor: '#1a1a1a', color: 'white', flex: 1 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: '#ff4444' }}>
              📊 실시간 공격 로그
            </Typography>
            <Box ref={logListRef} sx={{ maxHeight: 400, overflow: 'auto' }}>
              {attacks && attacks.slice(0, 10).map((attack, index) => (
                <Box
                  id={`log-${attack.id}`}
                  key={attack.id}
                  data-attack-id={attack.id}
                  sx={{
                    p: 1,
                    mb: 1,
                    bgcolor: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? 'rgba(255,68,68,0.3)' : 'rgba(255,68,68,0.1)',
                    borderRadius: 1,
                    borderLeft: '3px solid #FF0000',
                    border: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? '2px solid #FF0000' : 'none',
                    boxShadow: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? '0 0 10px rgba(255,0,0,0.5)' : 'none',
                    animation: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? 'pulse 1.5s infinite' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => {
                    const newSelectedId = selectedAttackId === attack.id ? null : attack.id;
                    setSelectedAttackId(newSelectedId);
                    setSelectedBuildingAttacks([]);

                    // 로그 클릭 시 지도에서 해당 건물 하이라이트 및 이동
                    if (newSelectedId) {
                      // 모든 기존 하이라이트 제거 후 새로 적용
                      clearAllHighlights();

                      // 새로운 하이라이트 적용
                      highlightBuildingOnMap(attack.id);
                    } else {
                      // 선택 해제 시 하이라이트 제거
                      highlightedBuildings.forEach(entityId => {
                        const entity = viewer.current?.entities.getById(entityId);
                        if (entity && entity.point) {
                          // 원래 색상으로 복원
                          if (entityId.includes('source')) {
                            entity.point.color = Cesium.Color.YELLOW;
                            entity.point.outlineColor = Cesium.Color.RED;
                          } else {
                            entity.point.color = Cesium.Color.CYAN;
                            entity.point.outlineColor = Cesium.Color.BLUE;
                          }
                          const currentMode = viewer.current.scene.mode;
                          const isScene2D = currentMode === Cesium.SceneMode.SCENE2D;
                          entity.point.pixelSize = isScene2D ? 15 : 12;
                        }
                      });
                      setHighlightedBuildings([]);

                      // 마커 하이라이트도 제거
                      markerHighlights.forEach(entityId => {
                        const entity = viewer.current?.entities.getById(entityId);
                        if (entity && entity.point) {
                          // 원래 색상으로 복원
                          if (entityId.includes('source')) {
                            entity.point.color = Cesium.Color.YELLOW;
                            entity.point.outlineColor = Cesium.Color.RED;
                          } else {
                            entity.point.color = Cesium.Color.CYAN;
                            entity.point.outlineColor = Cesium.Color.BLUE;
                          }
                          const currentMode = viewer.current.scene.mode;
                          const isScene2D = currentMode === Cesium.SceneMode.SCENE2D;
                          entity.point.pixelSize = isScene2D ? 15 : 12;
                        }
                      });
                      setMarkerHighlights([]);
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    🔴 {attack.type} - 진행중
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#ccc' }}>
                    {attack.source.name} → {attack.target.name}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#aaa', fontSize: '10px' }}>
                    공격자 IP: {attack.source.ip} | AS: {attack.source.as}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#aaa', fontSize: '10px' }}>
                    피해자 IP: {attack.target.ip} | AS: {attack.target.as}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#aaa' }}>
                    심각도: {'⭐'.repeat(attack.severity)} | {attack.timestamp.toLocaleTimeString('ko-KR', {timeZone: 'Asia/Seoul'})}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* 범례 */}
        <Card sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1, color: '#ff4444' }}>
              🔍 범례
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FFFFFF', border: '1px solid #CCCCCC' }} />
                <Typography variant="caption">건물 마커</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 2, bgcolor: '#FFFFFF', borderRadius: 1 }} />
                <Typography variant="caption">건물 연결선</Typography>
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 'bold', mt: 1, color: '#ff4444' }}>
                🌌 공격 광선 (마우스 오버로 정보 확인):
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 2, bgcolor: '#FF0000', borderRadius: 1, boxShadow: '0 0 4px #FF0000' }} />
                <Typography variant="caption">🔴 사이버 공격</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default EarthGlobe;