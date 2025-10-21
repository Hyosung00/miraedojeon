import React, { useState } from "react";
import TargetLog from "./EventLog/Target_Log";
import ExternalLog from "./EventLog/External_Log";
import InternalLog from "./EventLog/Internal_Log";
import ActiveLog from "./EventLog/Active_Log";

// DashboardMenu의 view-label 매핑
const viewLabelMap = {
	externalInternal: "OSINT 정보 수집",
	fusionDatabase: "융합 데이터베이스",
	visualizationPlatform: "가시화 플랫폼 구성",
	multiLayerVisualization: "사이버 3계층 멀티레이어 가시화",
	anomalyDetection: "시계열 분석 비정상 활동 탐지",
	externalNetworkVisualization: "네트워크 외부망 가시화",
	internalNetworkVisualization: "주요 시설 내부망 가시화",
	targetIdentification: "네트워크 구조분석 및 표적 식별",
	priorityVisualization: "핵심 표적 분석 및 우선순위 가시화",
	target: "후보/핵심 표적 상세 가시화",
	threatExposure: "위협 노출도 및 공격 가능도 측정",
	responseEffectVisualization: "능동대응책 효과/경로 가시화"
};

function EventLog({ logs, activeView, selectedNode }) {
	const title = viewLabelMap[activeView] || "Event Log";
	const safeLogs = Array.isArray(logs) ? logs : [];

	return (
		<div>
			<h3 className="eventlog-title">{title}</h3>
			{(!logs || (Array.isArray(logs) && logs.length === 0)) ? (
				<div className="eventlog-empty">로그가 존재하지 않음.</div>
			) : (
				activeView === "target" ? <TargetLog logs={safeLogs} selectedNode={selectedNode} />
				: activeView === "externalInternal" ? <ExternalLog logs={safeLogs} />
				: activeView === "internalNetworkVisualization" ? <InternalLog logs={safeLogs} />
				: activeView === "anomalyDetection" ? <ActiveLog logs={safeLogs} />
				: safeLogs.map((log, index) => (
					<div key={index} className={`packet-log ${log.type || ''}`}>
						{log.message && (
							<div>{log.message}</div>
						)}
						{/* 기타 로그 출력 (target 외) 필요시 여기에 추가 */}
					</div>
				))
			)}
		</div>
	);
}

export default EventLog;
