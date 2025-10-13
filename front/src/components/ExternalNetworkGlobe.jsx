import React, { useRef, useState, useEffect } from "react";
import { Box } from "@mui/material";

function ExternalNetworkGlobe() {
  const [animationState, setAnimationState] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationState(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const attacks = [
    { id: 1, from: "북한", to: "서울", danger: true, x1: 30, y1: 20, x2: 50, y2: 60 },
    { id: 2, from: "중국", to: "부산", danger: true, x1: 70, y1: 30, x2: 55, y2: 65 },
    { id: 3, from: "러시아", to: "도쿄", danger: true, x1: 85, y1: 15, x2: 75, y2: 45 },
    { id: 4, from: "서울", to: "뉴욕", danger: false, x1: 50, y1: 60, x2: 20, y2: 40 },
    { id: 5, from: "도쿄", to: "런던", danger: false, x1: 75, y1: 45, x2: 45, y2: 35 },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        height: 400,
        position: "relative",
        background: `
          radial-gradient(ellipse at center, #001122 0%, #000000 100%),
          radial-gradient(circle at 20% 20%, rgba(0, 255, 255, 0.1) 0%, transparent 30%),
          radial-gradient(circle at 80% 80%, rgba(255, 0, 128, 0.1) 0%, transparent 30%)
        `,
        borderRadius: 2,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {/* 배경 별들 */}
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundImage: `
            radial-gradient(2px 2px at 20px 30px, #ffffff, transparent),
            radial-gradient(2px 2px at 40px 70px, #00ffff, transparent),
            radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(0, 255, 255, 0.6), transparent),
            radial-gradient(2px 2px at 160px 30px, #ff0080, transparent)
          `,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 100px",
          animation: "twinkle 3s infinite"
        }}
      />

      {/* 지구 */}
      <Box
        sx={{
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: `
            radial-gradient(circle at 30% 30%, #4a90e2 0%, #2c5aa0 50%, #1a365d 100%),
            linear-gradient(45deg, transparent 30%, rgba(0, 255, 0, 0.1) 40%, transparent 50%),
            linear-gradient(-45deg, transparent 60%, rgba(0, 200, 100, 0.2) 70%, transparent 80%)
          `,
          position: "relative",
          boxShadow: "0 0 50px rgba(74, 144, 226, 0.3), inset -20px -20px 50px rgba(0, 0, 0, 0.5)",
          animation: "rotate 20s linear infinite",
          border: "2px solid rgba(74, 144, 226, 0.3)"
        }}
      >
        {/* 대륙 표시 */}
        <Box
          sx={{
            position: "absolute",
            top: "30%",
            left: "25%",
            width: "30%",
            height: "40%",
            background: "rgba(0, 150, 0, 0.4)",
            borderRadius: "50% 20% 40% 30%",
            transform: "rotate(15deg)"
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: "20%",
            right: "20%",
            width: "25%",
            height: "35%",
            background: "rgba(0, 150, 0, 0.3)",
            borderRadius: "30% 50% 20% 40%",
            transform: "rotate(-10deg)"
          }}
        />
      </Box>

      {/* 공격 경로 표시 */}
      {attacks.map((attack, index) => (
        <Box
          key={attack.id}
          sx={{
            position: "absolute",
            left: `${attack.x1}%`,
            top: `${attack.y1}%`,
            width: `${Math.abs(attack.x2 - attack.x1)}%`,
            height: `${Math.abs(attack.y2 - attack.y1)}%`,
            pointerEvents: "none"
          }}
        >
          {/* 공격 라인 */}
          <Box
            sx={{
              position: "absolute",
              width: "100%",
              height: "2px",
              background: attack.danger
                ? "linear-gradient(90deg, #ff4444, #ff8888, #ff4444)"
                : "linear-gradient(90deg, #44ff44, #88ff88, #44ff44)",
              transformOrigin: "0 0",
              transform: `rotate(${Math.atan2(attack.y2 - attack.y1, attack.x2 - attack.x1) * 180 / Math.PI}deg)`,
              animation: `pulse 2s infinite ${index * 0.5}s`,
              filter: "drop-shadow(0 0 5px currentColor)"
            }}
          />

          {/* 시작점 */}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              top: -2,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: attack.danger ? "#ff4444" : "#44ff44",
              boxShadow: `0 0 10px ${attack.danger ? "#ff4444" : "#44ff44"}`,
              animation: "pulse 1.5s infinite"
            }}
          />

          {/* 끝점 */}
          <Box
            sx={{
              position: "absolute",
              right: 0,
              top: -2,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: attack.danger ? "#ff4444" : "#44ff44",
              boxShadow: `0 0 10px ${attack.danger ? "#ff4444" : "#44ff44"}`,
              animation: "pulse 1.5s infinite 0.5s"
            }}
          />
        </Box>
      ))}

      {/* 범례 */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "rgba(0, 0, 0, 0.7)",
          padding: 1,
          borderRadius: 1,
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 0.5, fontSize: "0.75rem", color: "#ff6666" }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4444", mr: 1 }} />
          악성 트래픽
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", fontSize: "0.75rem", color: "#66ff66" }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "#44ff44", mr: 1 }} />
          정상 트래픽
        </Box>
      </Box>

      <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </Box>
  );
}

export default ExternalNetworkGlobe;