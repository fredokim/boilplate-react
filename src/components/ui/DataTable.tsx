export type DataTableColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row) => React.ReactNode;
};

type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  emptyText?: string;
  getRowKey: (row: Row) => string;
};

export function DataTable<Row>({ columns, emptyText = 'No data found.', getRowKey, rows }: DataTableProps<Row>) {
  if (rows.length === 0) {
    return <div className="rounded-md border border-dashed border-line p-6 text-center text-sm font-semibold text-muted">{emptyText}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            {columns.map((column) => (
              <th className="py-3 pr-4 font-bold" key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-slate-100" key={getRowKey(row)}>
              {columns.map((column) => (
                <td className="py-3 pr-4 text-ink" key={column.key}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
