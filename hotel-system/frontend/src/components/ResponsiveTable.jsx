export default function ResponsiveTable({
  columns,
  data,
  keyField = "_id",
  emptyMessage = "No data found."
}) {
  if (!data || data.length === 0) {
    return <div className="empty">{emptyMessage}</div>;
  }

  return (
    <div className="table-responsive">
      <table className="data-table table-card">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr key={row[keyField] ?? index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-label={column.label}
                >
                  {column.render
                    ? column.render(row)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}