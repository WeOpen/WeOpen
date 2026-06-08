import type { ReactNode } from "react";
import { cn } from "./utils";
import { EmptyState } from "./empty-state";
import { HorizontalScrollArea } from "./horizontal-scroll-area";

type DataTableRowKey = string | number;

export type DataTableColumn<T> = {
  id: string;
  label: ReactNode;
  isRowHeader?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
};

export type DataTableProps<T> = {
  "aria-label": string;
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowId: (row: T) => DataTableRowKey;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  className?: string;
  minWidth?: number;
};

export function DataTable<T>({
  "aria-label": ariaLabel,
  className,
  columns,
  emptyDescription,
  emptyTitle = "暂无数据",
  getRowId,
  minWidth = 720,
  rows
}: DataTableProps<T>) {
  if (!rows.length) {
    return (
      <div className={cn("weopen-data-table", className)}>
        <EmptyState description={emptyDescription} title={emptyTitle} />
      </div>
    );
  }

  return (
    <div className={cn("weopen-data-table", className)}>
      <HorizontalScrollArea
        className="table__horizontal-scroll-area"
        viewportClassName="table__scroll-container"
      >
        <table aria-label={ariaLabel} className="table__content" style={{ minWidth }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={cn("table__column", column.className)} key={column.id} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowId(row)}>
                {columns.map((column) => {
                  const Cell = column.isRowHeader ? "th" : "td";
                  return (
                    <Cell
                      className={cn("table__cell", column.className)}
                      key={column.id}
                      scope={column.isRowHeader ? "row" : undefined}
                    >
                      {column.render(row)}
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </HorizontalScrollArea>
    </div>
  );
}
