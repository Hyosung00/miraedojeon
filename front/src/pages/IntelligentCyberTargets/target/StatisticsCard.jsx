import React from "react";

const StatisticsCard = React.memo(({ dbTitle, dbValue, dbSubtext, className }) => {
  const title = dbTitle || "Default Title";
  const value = dbValue || "Default Value";
  const subtext = dbSubtext || "Default Subtext";

  return (
    <div className={className}>
      <div className="statistics-card-value">{value}</div>
      <div className="statistics-card-title">{title}</div>
      <div className="statistics-card-subtext">{subtext}</div>
    </div>
  );
});

StatisticsCard.displayName = 'StatisticsCard';

export default StatisticsCard;
