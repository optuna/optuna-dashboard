export interface DataGridColumn<T> {
  field: keyof T;
  label: string;
  sortable?: boolean;
  less?: (a: T, b: T, ascending: boolean) => number;
  filterable?: boolean;
  toCellValue?: (rowIndex: number) => string | React.ReactNode;
  padding?: "normal" | "checkbox" | "none";
}
