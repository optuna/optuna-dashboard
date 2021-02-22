import React from "react"
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles"
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
} from "@material-ui/core"
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown"
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp"
import { Clear } from "@material-ui/icons"

type Order = "asc" | "desc"

const defaultRowsPerPageOption = [10, 50, 100, { label: "All", value: -1 }]

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: "100%",
    },
    visuallyHidden: {
      border: 0,
      clip: "rect(0 0 0 0)",
      height: 1,
      margin: -1,
      overflow: "hidden",
      padding: 0,
      position: "absolute",
      top: 20,
      width: 1,
    },
    filterable: {
      color: theme.palette.primary.main,
      textDecoration: "underline",
      cursor: "pointer",
    },
  })
)

interface DataGridColumn<T> {
  field: keyof T
  label: string
  sortable?: boolean
  less?: (i: number, j: number) => number
  filterable?: boolean
  toCellValue?: (rowIndex: number) => string | React.ReactNode
  padding?: "default" | "checkbox" | "none"
}

interface RowFilter<T> {
  field: keyof T
  value: any
}

function DataGrid<T>(props: {
  columns: DataGridColumn<T>[]
  rows: T[]
  keyField: keyof T
  dense?: boolean
  collapseBody?: (rowIndex: number) => React.ReactNode
  initialRowsPerPage?: number
  rowsPerPageOption?: Array<number | { value: number; label: string }>
}) {
  const classes = useStyles()
  const { columns, rows, keyField, dense, collapseBody } = props
  let { initialRowsPerPage, rowsPerPageOption } = props
  const [order, setOrder] = React.useState<Order>("asc")
  const [orderBy, setOrderBy] = React.useState<number>(0) // index of columns
  const [page, setPage] = React.useState(0)
  const [filters, setFilters] = React.useState<RowFilter<T>[]>([])

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
  const fieldAlreadyFiltered = (field: keyof T): boolean =>
    filters.some((f) => f.field === field)

  const handleClickFilterCell = (field: keyof T, value: any) => {
    if (fieldAlreadyFiltered(field)) {
      return
    }
    const newFilters = [...filters, { field: field, value: value }]
    setFilters(newFilters)
  }

  const clearFilter = (field: keyof T): void => {
    setFilters(filters.filter((f) => f.field !== field))
  }

  const filteredRows = rows.filter((row) =>
    filters.length === 0
      ? true
      : filters.some((f) => {
          return row[f.field] === f.value
        })
  )

  // Sorting
  const createSortHandler = (columnId: number) => (
    event: React.MouseEvent<unknown>
  ) => {
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

  return (
    <div className={classes.root}>
      <TableContainer>
        <Table
          aria-labelledby="tableTitle"
          size={dense ? "small" : "medium"}
          aria-label="data grid"
        >
          <TableHead>
            <TableRow>
              {collapseBody ? <TableCell /> : null}
              {columns.map((column, index) => (
                <TableCell
                  key={index}
                  padding={column.padding || "default"}
                  sortDirection={orderBy === column.field ? order : false}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === index}
                      direction={orderBy === index ? order : "asc"}
                      onClick={createSortHandler(index)}
                    >
                      {column.label}
                      {orderBy === column.field ? (
                        <span className={classes.visuallyHidden}>
                          {order === "desc"
                            ? "sorted descending"
                            : "sorted ascending"}
                        </span>
                      ) : null}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                  {column.filterable ? (
                    <IconButton
                      size={dense ? "small" : "medium"}
                      style={
                        fieldAlreadyFiltered(column.field)
                          ? {}
                          : { visibility: "hidden" }
                      }
                      color="inherit"
                      onClick={(e) => {
                        clearFilter(column.field)
                      }}
                    >
                      <Clear />
                    </IconButton>
                  ) : null}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {currentPageRows.map((row, index) => (
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
        onChangePage={handleChangePage}
        onChangeRowsPerPage={handleChangeRowsPerPage}
      />
    </div>
  )
}

function DataGridRow<T>(props: {
  columns: DataGridColumn<T>[]
  rowIndex: number
  row: T
  keyField: keyof T
  collapseBody?: (rowIndex: number) => React.ReactNode
  handleClickFilterCell: (field: keyof T, value: any) => void
}) {
  const classes = useStyles()
  const {
    columns,
    rowIndex,
    row,
    keyField,
    collapseBody,
    handleClickFilterCell,
  } = props
  const [open, setOpen] = React.useState(false)

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
            : row[column.field]

          return column.filterable ? (
            <TableCell
              key={`${row[keyField]}:${column.field}:${columnIndex}`}
              padding={column.padding || "default"}
              onClick={(e) => {
                handleClickFilterCell(column.field, row[column.field])
              }}
            >
              <div className={classes.filterable}>{cellItem}</div>
            </TableCell>
          ) : (
            <TableCell
              key={`${row[keyField]}:${column.field}:${columnIndex}`}
              padding={column.padding || "default"}
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
      const result = order == "asc" ? -less(a[1], b[1]) : less(a[1], b[1])
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
