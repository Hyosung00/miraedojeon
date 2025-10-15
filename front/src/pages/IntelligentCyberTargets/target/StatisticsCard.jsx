
const StatisticsCard = ({ dbTitle, dbValue, dbSubtext, className }) => {
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
};

export default StatisticsCard;
