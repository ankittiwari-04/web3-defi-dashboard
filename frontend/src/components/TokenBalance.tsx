export function TokenBalance({
  label,
  value,
  unit,
  isLoading,
}: {
  label: string;
  value: string;
  unit?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="card">
      <div className="card-inner">
        <p className="stat-label">{label}</p>
        {isLoading ? (
          <div className="pulse" />
        ) : (
          <p className="stat-value">
            <span>{value}</span>
            {unit ? <span className="unit">{unit}</span> : null}
          </p>
        )}
      </div>
    </div>
  );
}

