import React from "react";

function InternalLog({ logs }) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  return (
    <>
      {safeLogs.map((log, index) => (
        <div key={index} className={`packet-log ${log.type || ''}`}>
          {log.message && <div>{log.message}</div>}
          {/* Internal 로그에 맞는 정보 출력 (필요시 확장) */}
        </div>
      ))}
    </>
  );
}

export default InternalLog;
