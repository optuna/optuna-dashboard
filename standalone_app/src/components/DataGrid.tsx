import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Collapse,
  IconButton,
  useTheme,
} from "@mui/material"
import { styled } from "@mui/system"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp"
import { Clear } from "@mui/icons-material"

type Order = "asc" | "desc"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Value = any

const defaultRowsPerPageOption = [10, 50, 100, { label: "All", value: -1 }]

interface DataGridColumn<T> {
  field: keyof T
  label: string
  sortable?: boolean
  less?: (a: T, b: T) => number
  filterable?: boolean
  toCellValue?: (rowIndex: number) => string | React.ReactNode
  padding?: "normal" | "checkbox" | "none"
}

interface RowFilter {
  columnIdx: number
  value: Value
}

function DataGrid<T>(props: {
  columns: DataGridColumn<T>[]
  rows: T[]
  keyField: keyof T
  dense?: boolean
  collapseBody?: (rowIndex: number) => React.ReactNode
  initialRowsPerPage?: number
  rowsPerPageOption?: Array<number | { value: number; label: string }>
  defaultFilter?: (row: T) => boolean
}): React.ReactElement {
  const { columns, rows, keyField, dense, collapseBody, defaultFilter } = props
  let { initialRowsPerPage, rowsPerPageOption } = props
  const [order, setOrder] = React.useState<Order>("asc")
  const [orderBy, setOrderBy] = React.useState<number>(0) // index of columns
  const [page, setPage] = React.useState(0)
  const [filters, setFilters] = React.useState<RowFilter[]>([])

  const getRowIndex = (row: T): number => {
    return rows.findIndex((row2) => row[keyField] === row2[keyField])
  }

  // Pagination
  rowsPerPageOption = rowsPerPageOption || defaultRowsPerPageOption
  initialRowsPerPage = initialRowsPerPage // use first element as default
    ? initialRowsPerPage
    : isNumber(rowsPerPageOption[0])
    ? rowsPerPageOption[0]
    : rowsPerPageOption[0].value
  const [rowsPerPage, setRowsPerPage] = React.useState(initialRowsPerPage)

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  // Filtering
  const fieldAlreadyFiltered = (columnIdx: number): boolean =>
    filters.some((f) => f.columnIdx === columnIdx)

  const handleClickFilterCell = (columnIdx: number, value: Value) => {
    if (fieldAlreadyFiltered(columnIdx)) {
      return
    }
    const newFilters = [...filters, { columnIdx: columnIdx, value: value }]
    setFilters(newFilters)
  }

  const clearFilter = (columnIdx: number): void => {
    setFilters(filters.filter((f) => f.columnIdx !== columnIdx))
  }

  const filteredRows = rows.filter((row, rowIdx) => {
    if (defaultFilter !== undefined && defaultFilter(row)) {
      return false
    }
    return filters.length === 0
      ? true
      : filters.some((f) => {
          if (columns.length <= f.columnIdx) {
            console.log(
              `columnIdx=${f.columnIdx} must be smaller than columns.length=${columns.length}`
            )
            return true
          }
          const toCellValue = columns[f.columnIdx].toCellValue
          if (toCellValue !== undefined) {
            return toCellValue(rowIdx) === f.value
          }
          const field = columns[f.columnIdx].field
          return row[field] === f.value
        })
  })

  // Sorting
  const createSortHandler = (columnId: number) => () => {
    const isAsc = orderBy === columnId && order === "asc"
    setOrder(isAsc ? "desc" : "asc")
    setOrderBy(columnId)
  }
  const sortedRows = stableSort<T>(filteredRows, order, orderBy, columns)
  const currentPageRows =
    rowsPerPage > 0
      ? sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      : sortedRows
  const emptyRows =
    rowsPerPage - Math.min(rowsPerPage, sortedRows.length - page * rowsPerPage)

  const RootDiv = styled("div")({
    width: "100%",
  })
  const HiddenSpan = styled("span")({
    border: 0,
    clip: "rect(0 0 0 0)",
    height: 1,
    margin: -1,
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    top: 20,
    width: 1,
  })
  const TableHeaderCellSpan = styled("span")({
    display: "inline-flex",
  })
  return (
    <RootDiv>
      <TableContainer>
        <Table
          aria-labelledby="tableTitle"
          size={dense ? "small" : "medium"}
          aria-label="data grid"
        >
          <TableHead>
            <TableRow>
              {collapseBody ? <TableCell /> : null}
              {columns.map((column, columnIdx) => (
                <TableCell
                  key={columnIdx}
                  padding={column.padding || "normal"}
                  sortDirection={orderBy === column.field ? order : false}
                >
                  <TableHeaderCellSpan>
                    {column.sortable ? (
                      <TableSortLabel
                        active={orderBy === columnIdx}
                        direction={orderBy === columnIdx ? order : "asc"}
                        onClick={createSortHandler(columnIdx)}
                      >
                        {column.label}
                        {orderBy === column.field ? (
                          <HiddenSpan>
                            {order === "desc"
                              ? "sorted descending"
                              : "sorted ascending"}
                          </HiddenSpan>
                        ) : null}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                    {column.filterable ? (
                      <IconButton
                        size={dense ? "small" : "medium"}
                        style={
                          fieldAlreadyFiltered(columnIdx)
                            ? {}
                            : { visibility: "hidden" }
                        }
                        color="inherit"
                        onClick={() => {
                          clearFilter(columnIdx)
                        }}
                      >
                        <Clear />
                      </IconButton>
                    ) : null}
                  </TableHeaderCellSpan>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {currentPageRows.map((row) => (
              <DataGridRow<T>
                columns={columns}
                rowIndex={getRowIndex(row)}
                row={row}
                keyField={keyField}
                collapseBody={collapseBody}
                key={`${row[keyField]}`}
                handleClickFilterCell={handleClickFilterCell}
              />
            ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: (dense ? 33 : 53) * emptyRows }}>
                <TableCell colSpan={6} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOption}
        component="div"
        count={filteredRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </RootDiv>
  )
}

function DataGridRow<T>(props: {
  columns: DataGridColumn<T>[]
  rowIndex: number
  row: T
  keyField: keyof T
  collapseBody?: (rowIndex: number) => React.ReactNode
  handleClickFilterCell: (columnIdx: number, value: Value) => void
}) {
  const {
    columns,
    rowIndex,
    row,
    keyField,
    collapseBody,
    handleClickFilterCell,
  } = props
  const [open, setOpen] = React.useState(false)
  const theme = useTheme()

  const FilterableDiv = styled("div")({
    color: theme.palette.primary.main,
    textDecoration: "underline",
    cursor: "pointer",
  })
  return (
    <React.Fragment>
      <TableRow hover tabIndex={-1}>
        {collapseBody ? (
          <TableCell>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
        ) : null}
        {columns.map((column, columnIndex) => {
          const cellItem = column.toCellValue
            ? column.toCellValue(rowIndex)
            : // TODO(c-bata): Avoid this implicit type conversion.
              (row[column.field] as number | string | null | undefined)

          return column.filterable ? (
            <TableCell
              key={`${row[keyField]}:${column.field.toString()}:${columnIndex}`}
              padding={column.padding || "normal"}
              onClick={() => {
                const value =
                  column.toCellValue !== undefined
                    ? column.toCellValue(rowIndex)
                    : row[column.field]
                handleClickFilterCell(columnIndex, value)
              }}
            >
              <FilterableDiv>{cellItem}</FilterableDiv>
            </TableCell>
          ) : (
            <TableCell
              key={`${row[keyField]}:${column.field.toString()}:${columnIndex}`}
              padding={column.padding || "normal"}
            >
              {cellItem}
            </TableCell>
          )
        })}
      </TableRow>
      {collapseBody ? (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              {collapseBody(rowIndex)}
            </Collapse>
          </TableCell>
        </TableRow>
      ) : null}
    </React.Fragment>
  )
}

function getComparator<T>(
  order: Order,
  columns: DataGridColumn<T>[],
  orderBy: number
): (a: T, b: T) => number {
  return order === "desc"
    ? (a, b) => descendingComparator<T>(a, b, columns, orderBy)
    : (a, b) => -descendingComparator<T>(a, b, columns, orderBy)
}

function descendingComparator<T>(
  a: T,
  b: T,
  columns: DataGridColumn<T>[],
  orderBy: number
): number {
  const field = columns[orderBy].field
  if (b[field] < a[field]) {
    return -1
  }
  if (b[field] > a[field]) {
    return 1
  }
  return 0
}

function stableSort<T>(
  array: T[],
  order: Order,
  orderBy: number,
  columns: DataGridColumn<T>[]
) {
  // TODO(c-bata): Refactor here by implementing as the same comparator interface.
  const less = columns[orderBy].less
  const comparator = getComparator(order, columns, orderBy)
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number])
  stabilizedThis.sort((a, b) => {
    if (less) {
      const result = order == "asc" ? -less(a[0], b[0]) : less(a[0], b[0])
      if (result !== 0) return result
    } else {
      const result = comparator(a[0], b[0])
      if (result !== 0) return result
    }
    return a[1] - b[1]
  })
  return stabilizedThis.map((el) => el[0])
}

const isNumber = (
  rowsPerPage: number | { value: number; label: string }
): rowsPerPage is number => {
  return typeof rowsPerPage === "number"
}

export { DataGrid, DataGridColumn }
