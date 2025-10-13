import React from "react";

const Header = () => (
  <header
    style={{
      display: "flex",
      alignItems: "center",
      padding: "24px 32px 8px 32px",
      background: "#fff",
      borderBottom: "1px solid #ececf6",
      minHeight: 60,
    }}
  >
    <span style={{ fontWeight: 700, fontSize: 24, color: "#39306b"}}>
      표적
    </span>
    <div style={{ marginLeft: 32, fontSize: 20, color: "#22223b" }}>
      네트워크 그래프 기반 표적 분석 대시보드
    </div>
    {/* 우측에 세팅 및 검색 아이콘 추가 가능 */}
  </header>
);

export default Header;
