import type { ReactNode } from 'react';

export interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  hideOnMobile?: boolean;
}

interface Props<T> {
  columns: Column[];
  rows: T[];
  row: (item: T, index: number) => ReactNode;
  empty?: string;
  hover?: boolean;
  className?: string;
  rowKey?: (item: T, index: number) => string;
}

function align(column: Column): string {
  if (column.align === 'right') {
    return 'text-right';
  }
  if (column.align === 'center') {
    return 'text-center';
  }
  return 'text-left';
}

export function Table<T>({
  columns,
  rows,
  row,
  empty = 'Нет данных',
  hover = true,
  className = '',
  rowKey,
}: Props<T>) {
  return (
    <div className={`w-full overflow-x-auto border border-line bg-surface ${className}`}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`ng-label text-muted px-4 py-3 whitespace-nowrap ${align(column)} ${
                  column.hideOnMobile ? 'hidden md:table-cell' : ''
                }`}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((item, index) => (
              <tr
                key={rowKey ? rowKey(item, index) : index}
                className={`border-b border-line last:border-0 transition-colors ${
                  hover ? 'hover:bg-surface-2' : ''
                }`}
              >
                {row(item, index)}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted text-sm">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
