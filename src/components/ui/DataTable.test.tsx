import { render, screen } from '@testing-library/react';
import { DataTable, type DataTableColumn } from './DataTable';

type Row = {
  id: string;
  name: string;
};

const columns: DataTableColumn<Row>[] = [{ key: 'name', header: 'Name', render: (row) => row.name }];

describe('DataTable', () => {
  it('renders rows by column contract', () => {
    render(<DataTable columns={columns} getRowKey={(row) => row.id} rows={[{ id: '1', name: 'Demo' }]} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<DataTable columns={columns} getRowKey={(row) => row.id} rows={[]} />);

    expect(screen.getByText('No data found.')).toBeInTheDocument();
  });
});
