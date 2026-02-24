// GlobeMini.jsx - TimeSeriesVisualization의 지구본만 추출한 미니 버전
import React, { useEffect, useRef, useState, memo } from 'react';
import * as Cesium from 'cesium';
import { Box } from '@mui/material';
import interactionTracker from '../../../../utils/interactionTracker';

// Cesium Ion Access Token 설정
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzODNiZmZiNC04YTUxLTQ1YzgtOWU1Mi1kNDUyY2I2ZDRkNTQiLCJpZCI6MzQyNDEzLCJpYXQiOjE3NTgxNzMyNDh9.zZRyMPovg5ALhNtG2_E-0ED0qHqd_uQQnAG84eQUyG4';

// API 설정
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  ENDPOINTS: {
    NORTH_KOREA_ATTACKS: '/api/north-korea-attacks'
  },
  DEFAULT_LIMIT: 20
};

// 공격 데이터 가져오기
const fetchAttackData = async () => {
  try {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NORTH_KOREA_ATTACKS}?limit=${API_CONFIG.DEFAULT_LIMIT}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.success) return [];
    
    return data.attacks.map((attack) => ({
      id: attack.id,
      source: {
        lat: attack.source.lat,
        lon: attack.source.lon,
        name: attack.source.name
      },
      target: {
        lat: attack.target.lat,
        lon: attack.target.lon,
        name: attack.target.name
      }
    }));
  } catch (error) {
    console.error('Attack data fetch error:', error);
    return [];
  }
};

const GlobeMini = () => {
  const cesiumContainer = useRef(null);
  const viewer = useRef(null);
  const [error, setError] = useState(null);
  const selectedAttackRef = useRef(null);
  const arcEntitiesRef = useRef(new Map());

  // 공격 선택 핸들러
  const handleAttackClick = (attackId) => {
    interactionTracker.measureResponseSync(
      'GlobeMini',
      'Attack Arc Click',
      () => {
        if (selectedAttackRef.current === attackId) {
          // 같은 공격을 다시 클릭하면 선택 해제
          resetAllArcs();
          return;
        }

        selectedAttackRef.current = attackId;
        
        // 모든 arc를 흐리게 하고 선택된 것만 강조
        arcEntitiesRef.current.forEach((arcEntity, id) => {
          const isSelected = id === attackId;
          
          arcEntity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
            glowPower: isSelected ? 0.5 : 0.05,
            color: isSelected 
              ? Cesium.Color.CYAN.withAlpha(1.0)
              : Cesium.Color.RED.withAlpha(0.2)
          });
          arcEntity.polyline.width = isSelected ? 5 : 1.5;
        });

        if (viewer.current) {
          viewer.current.scene.requestRender();
        }
      },
      { attackId, isDeselect: selectedAttackRef.current === attackId }
    );
  };

  // 모든 arc 초기화
  const resetAllArcs = () => {
    selectedAttackRef.current = null;
    arcEntitiesRef.current.forEach((arcEntity) => {
      arcEntity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.1,
        color: Cesium.Color.RED.withAlpha(0.6)
      });
      arcEntity.polyline.width = 2;
    });

    if (viewer.current) {
      viewer.current.scene.requestRender();
    }
  };

  useEffect(() => {
    if (!cesiumContainer.current) return;
    if (viewer.current) return;

    const initializeCesium = async () => {
      try {
        viewer.current = new Cesium.Viewer(cesiumContainer.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          scene3DOnly: true,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity
        });

        const scene = viewer.current.scene;
        const globe = scene.globe;

        scene.skyAtmosphere.show = true;
        globe.enableLighting = false;
        globe.showWaterEffect = false;

        // 카메라 컨트롤 - 회전만 허용
        scene.screenSpaceCameraController.enableRotate = true;
        scene.screenSpaceCameraController.enableTranslate = false;
        scene.screenSpaceCameraController.enableZoom = false;
        scene.screenSpaceCameraController.enableTilt = false;
        scene.screenSpaceCameraController.enableLook = false;
        scene.screenSpaceCameraController.inertiaSpin = 0;
        scene.screenSpaceCameraController.inertiaTranslate = 0;
        scene.screenSpaceCameraController.inertiaZoom = 0;

        viewer.current.cesiumWidget.creditContainer.style.display = "none";

        // 초기 카메라 위치
        const fixedHeight = 20000000;
        viewer.current.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(127.5, 36.0, fixedHeight),
          orientation: {
            heading: 0,
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0
          }
        });

        scene.screenSpaceCameraController.minimumZoomDistance = fixedHeight;
        scene.screenSpaceCameraController.maximumZoomDistance = fixedHeight;

        // 공격 데이터 가져와서 arc 그리기
        const attacks = await fetchAttackData();
        createAttackArcs(attacks);

        // 클릭 이벤트 핸들러 생성 (먼저 선언)
        const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
        
        // 카메라 회전 시작/종료 추적
        let rotationStartTime = null;
        scene.screenSpaceCameraController.rotateEventTypes = [
          Cesium.CameraEventType.LEFT_DRAG,
          Cesium.CameraEventType.RIGHT_DRAG
        ];
        
        // 드래그 시작
        handler.setInputAction(() => {
          rotationStartTime = performance.now();
          interactionTracker.log('GlobeMini', 'Camera Rotation Started', {});
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        
        // 드래그 종료
        handler.setInputAction(() => {
          if (rotationStartTime) {
            const duration = performance.now() - rotationStartTime;
            interactionTracker.log('GlobeMini', 'Camera Rotation Completed', { durationMs: duration.toFixed(2) });
            rotationStartTime = null;
          }
        }, Cesium.ScreenSpaceEventType.LEFT_UP);
        handler.setInputAction((movement) => {
          interactionTracker.measureResponseSync(
            'GlobeMini',
            'Canvas Click',
            () => {
              const pickedObject = viewer.current.scene.pick(movement.position);
              
              if (Cesium.defined(pickedObject) && pickedObject.id) {
                const entityId = pickedObject.id.id;
                
                // 소스 또는 타겟 마커를 클릭한 경우
                if (entityId && (entityId.startsWith('source-') || entityId.startsWith('target-'))) {
                  // 'source-attack-7' -> ['source', 'attack', '7'] -> 'attack-7'
                  const parts = entityId.split('-');
                  const attackId = parts.slice(1).join('-'); // 첫 번째 부분(source/target) 제외하고 나머지 합치기
                  handleAttackClick(attackId);
                }
              } else {
                // 빈 공간 클릭 시 선택 해제
                interactionTracker.log('GlobeMini', 'Empty Space Click - Reset Selection', {});
                resetAllArcs();
              }
              
              scene.requestRender();
            },
            { hasPickedObject: !!viewer.current.scene.pick(movement.position) }
          );
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // 리사이즈 핸들러
        const handleResize = () => {
          if (viewer.current && !viewer.current.isDestroyed()) {
            viewer.current.resize();
            scene.requestRender();
          }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(cesiumContainer.current);

        scene.requestRender();
        viewer.current._cleanup = { resizeObserver, handler };

      } catch (err) {
        console.error('Cesium 초기화 오류:', err);
        setError(`Cesium 초기화 실패: ${err.message}`);
      }
    };

    // Arc 선 생성 함수
    const createAttackArcs = (attacks) => {
      if (!viewer.current || !attacks || attacks.length === 0) return;

      const markerHeight = 5000;

      attacks.forEach((attack, index) => {
        const sourceLon = parseFloat(attack.source.lon);
        const sourceLat = parseFloat(attack.source.lat);
        const targetLon = parseFloat(attack.target.lon);
        const targetLat = parseFloat(attack.target.lat);

        if (isNaN(sourceLon) || isNaN(sourceLat) || isNaN(targetLon) || isNaN(targetLat)) return;

        const sourcePos = Cesium.Cartesian3.fromDegrees(sourceLon, sourceLat, markerHeight);
        const targetPos = Cesium.Cartesian3.fromDegrees(targetLon, targetLat, markerHeight);

        // 소스 마커 (노란색)
        viewer.current.entities.add({
          id: `source-${attack.id}`,
          position: sourcePos,
          point: {
            pixelSize: 4,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.RED,
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });

        // 타겟 마커 (파란색)
        viewer.current.entities.add({
          id: `target-${attack.id}`,
          position: targetPos,
          point: {
            pixelSize: 4,
            color: Cesium.Color.CYAN,
            outlineColor: Cesium.Color.BLUE,
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });

        // 아치형 광선 생성
        const positions = [];
        for (let i = 0; i <= 30; i++) {
          const t = i / 30;
          const lerpedPos = Cesium.Cartesian3.lerp(sourcePos, targetPos, t, new Cesium.Cartesian3());
          const archHeight = Math.sin(t * Math.PI) * 500000; // 아치 높이
          const cartographic = Cesium.Cartographic.fromCartesian(lerpedPos);
          cartographic.height = markerHeight + archHeight;
          positions.push(Cesium.Cartographic.toCartesian(cartographic));
        }

        positions[0] = sourcePos;
        positions[positions.length - 1] = targetPos;

        // Arc 선
        const arcEntity = viewer.current.entities.add({
          id: `arc-${attack.id}`,
          polyline: {
            positions: positions,
            width: 2,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.1,
              color: Cesium.Color.RED.withAlpha(0.6)
            }),
            clampToGround: false
          }
        });

        // arc 엔티티 저장
        arcEntitiesRef.current.set(attack.id, arcEntity);
      });

      viewer.current.scene.requestRender();
    };

    initializeCesium();

    return () => {
      if (viewer.current) {
        if (viewer.current._cleanup?.handler) {
          viewer.current._cleanup.handler.destroy();
        }
        if (viewer.current._cleanup?.resizeObserver) {
          viewer.current._cleanup.resizeObserver.disconnect();
        }
        if (!viewer.current.isDestroyed()) {
          viewer.current.destroy();
        }
        viewer.current = null;
      }
      arcEntitiesRef.current.clear();
    };
  }, []);

  if (error) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1a1a2e' }}>
        <span style={{ color: '#ff6b6b' }}>{error}</span>
      </Box>
    );
  }

  return (
    <Box
      ref={cesiumContainer}
      sx={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
        '& .cesium-viewer': {
          width: '100% !important',
          height: '100% !important',
          position: 'absolute !important'
        },
        '& .cesium-widget': {
          width: '100% !important',
          height: '100% !important'
        },
        '& .cesium-widget canvas': {
          width: '100% !important',
          height: '100% !important',
          position: 'absolute !important'
        }
      }}
    />
  );
};

export default memo(GlobeMini);
