// GeoIPMini.jsx - BGP 데이터 수집 및 분석(GeoIP) 페이지의 미니 버전
// 실제 페이지와 동일하게 Cesium 2D 평면 세계 지도 + 트래픽 아크 라인
import React, { useEffect, useRef, useState, memo } from 'react';
import * as Cesium from 'cesium';
import { Box, Typography } from '@mui/material';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzODNiZmZiNC04YTUxLTQ1YzgtOWU1Mi1kNDUyY2I2ZDRkNTQiLCJpZCI6MzQyNDEzLCJpYXQiOjE3NTgxNzMyNDh9.zZRyMPovg5ALhNtG2_E-0ED0qHqd_uQQnAG84eQUyG4';

const fetchAttackData = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/north-korea-attacks?limit=20');
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.success) return [];
    return data.attacks || [];
  } catch {
    return [];
  }
};

const GeoIPMini = () => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const init = async () => {
      try {
        viewerRef.current = new Cesium.Viewer(containerRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          requestRenderMode: false,
          maximumRenderTimeChange: Infinity,
        });

        viewerRef.current.cesiumWidget.creditContainer.style.display = 'none';

        // 실제 GeoIP 페이지와 동일하게 2D 모드로 전환
        viewerRef.current.scene.morphTo2D(0);

        const scene = viewerRef.current.scene;

        // 모든 카메라 인터랙션 비활성화 (미니 뷰어)
        const ctrl = scene.screenSpaceCameraController;
        ctrl.enableRotate    = false;
        ctrl.enableTranslate = false;
        ctrl.enableZoom      = false;
        ctrl.enableTilt      = false;
        ctrl.enableLook      = false;

        // 실제 페이지와 동일한 카메라 초기 위치 (북한 중심)
        setTimeout(() => {
          if (viewerRef.current && !viewerRef.current.isDestroyed()) {
            viewerRef.current.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(125.7625, 39.0392, 8_000_000),
              orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
            });
          }
        }, 300);

        // 공격 데이터 fetch 및 마커/아크 렌더링
        const attacks = await fetchAttackData();

        attacks.forEach((attack) => {
          const srcLon = parseFloat(attack.source?.lon);
          const srcLat = parseFloat(attack.source?.lat);
          const dstLon = parseFloat(attack.target?.lon);
          const dstLat = parseFloat(attack.target?.lat);
          if ([srcLon, srcLat, dstLon, dstLat].some(isNaN)) return;

          // 출발지 마커 (노란색 - 실제 페이지와 동일)
          viewerRef.current.entities.add({
            position: Cesium.Cartesian3.fromDegrees(srcLon, srcLat, 1000),
            point: {
              pixelSize: 5,
              color: Cesium.Color.YELLOW,
              outlineColor: Cesium.Color.RED,
              outlineWidth: 1,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });

          // 목적지 마커 (청색 - 실제 페이지와 동일)
          viewerRef.current.entities.add({
            position: Cesium.Cartesian3.fromDegrees(dstLon, dstLat, 1000),
            point: {
              pixelSize: 5,
              color: Cesium.Color.CYAN,
              outlineColor: Cesium.Color.BLUE,
              outlineWidth: 1,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });

          // 아크 라인 (붉은색 - 실제 페이지와 동일)
          const srcPos = Cesium.Cartesian3.fromDegrees(srcLon, srcLat, 1000);
          const dstPos = Cesium.Cartesian3.fromDegrees(dstLon, dstLat, 1000);
          const positions = [];
          for (let i = 0; i <= 30; i++) {
            const t = i / 30;
            const lerped = Cesium.Cartesian3.lerp(srcPos, dstPos, t, new Cesium.Cartesian3());
            const carto = Cesium.Cartographic.fromCartesian(lerped);
            carto.height = 1000 + Math.sin(t * Math.PI) * 400_000;
            positions.push(Cesium.Cartographic.toCartesian(carto));
          }
          viewerRef.current.entities.add({
            polyline: {
              positions,
              width: 1.5,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.1,
                color: Cesium.Color.RED.withAlpha(0.7),
              }),
              clampToGround: false,
            },
          });
        });

        // ResizeObserver
        const resizeObserver = new ResizeObserver(() => {
          if (viewerRef.current && !viewerRef.current.isDestroyed()) {
            viewerRef.current.resize();
            scene.requestRender();
          }
        });
        resizeObserver.observe(containerRef.current);
        viewerRef.current._resizeObs = resizeObserver;

        scene.requestRender();
      } catch (err) {
        setError(`지도 초기화 실패: ${err.message}`);
      }
    };

    init();

    return () => {
      if (viewerRef.current) {
        viewerRef.current._resizeObs?.disconnect();
        if (!viewerRef.current.isDestroyed()) viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1a1a2e' }}>
        <Typography variant="caption" color="#ff6b6b">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%', height: '100%',
        position: 'absolute', top: 0, left: 0,
        overflow: 'hidden',
        '& .cesium-viewer, & .cesium-widget, & .cesium-widget canvas': {
          width: '100% !important',
          height: '100% !important',
          position: 'absolute !important',
        },
      }}
    />
  );
};

export default memo(GeoIPMini);
