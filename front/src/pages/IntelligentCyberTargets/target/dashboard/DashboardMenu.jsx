import React from "react";
import "./Dashboard.css";

function DashboardMenu({ setActiveView }) {
  const menuData = [
    {
      title: "OSINT 및 수집 데이터 융합",
      subMenus: [
        { label: "OSINT 정보 수집", view: "externalInternal" },
        { label: "융합 데이터베이스 구축", view: "fusionDatabase" },
      ],
    },
    {
      title: "사이버 객체정보 가시화",
      subMenus: [
        { label: "가시화 플랫폼 정보", view: "visualizationPlatform" },
        { label: "사이버 3계층 멀티레이어 가시화", view: "multiLayerVisualization" },
      ],
    },
    {
      title: "내외부 네트워크 가시화기",
      subMenus: [
        { label: "시계열 기반 이상탐지", view: "anomalyDetection" },
        { label: "내부망 기본맵 가시화", view: "internalNetworkVisualization" },
        { label: "외부망 기본맵 가시화", view: "externalNetworkVisualization" },
      ],
    },
    {
      title: "지능형 사이버 표적 식별기",
      subMenus: [
        { label: "네트워크 구조분석 및 표적 식별", view: "targetIdentification" },
        { label: "핵심 표적 점수 분석", view: "priorityVisualization" },
        { label: "후보/핵심 표적 상세 가시화", view: "target" },
      ],
    },
    {
      title: "사이버 능동대응 방책분석기",
      subMenus: [
        { label: "위협 노출도 및 공격 가능도 측정", view: "threatExposure" },
        { label: "능동 대응책 효과/경로 가시화", view: "responseEffectVisualization" },
      ],
    },
  ];

  return (
    <aside className="dashboard-menu">
      <div className="menu-dropdown">
        {menuData.map((menu) => (
          <div key={menu.title} className="menu-item">
            <div className="menu-btn main-menu title-btn">{menu.title}</div>
            <div className="submenu-dropdown">
              {menu.subMenus.map((sub) => (
                <button
                  key={sub.label}
                  className="menu-btn submenu submenu-btn"
                  onClick={() => setActiveView(sub.view)}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default DashboardMenu;