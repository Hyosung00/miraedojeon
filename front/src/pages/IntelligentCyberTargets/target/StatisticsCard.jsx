
const StatisticsCard = ({ dbTitle, dbValue, dbSubtext, className }) => {
  const title = dbTitle || "Default Title";
  const value = dbValue || "Default Value";
  const subtext = dbSubtext || "Default Subtext";

  return (
    <div className={className}>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#39306b" }}>{value}</div>
      <div style={{ fontSize: 16, margin: "8px 0" }}>{title}</div>
      <div style={{ fontSize: 12, color: "#767686" }}>{subtext}</div>
    </div>
  );
};

export default StatisticsCard;
