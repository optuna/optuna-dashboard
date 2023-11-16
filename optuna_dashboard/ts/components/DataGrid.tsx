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
  Menu,
  MenuItem,
} from "@mui/material"
import { styled } from "@mui/system"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp"
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank"
import CheckBoxIcon from "@mui/icons-material/CheckBox"
import FilterListIcon from "@mui/icons-material/FilterList"
import ListItemIcon from "@mui/material/ListItemIcon"

type Order = "asc" | "desc"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Value = any

const defaultRowsPerPageOption = [10, 50, 100, { label: "All", value: -1 }]

interface DataGridColumn<T> {
  field: keyof T
  label: string
  sortable?: boolean
  less?: (a: T, b: T, ascending: boolean) => number
  filterChoices?: string[]
  toCellValue?: (rowIndex: number) => string | React.ReactNode
  padding?: "normal" | "checkbox" | "none"
}

interface RowFilter {
  columnIdx: number
  values: Value[]
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
  const filteredRows = rows.filter((row, rowIdx) => {
    if (defaultFilter !== undefined && defaultFilter(row)) {
      return false
    }
    return filters.length === 0
      ? true
      : filters.every((f) => {
          if (columns.length <= f.columnIdx) {
            console.log(
              `columnIdx=${f.columnIdx} must be smaller than columns.length=${columns.length}`
            )
            return true
          }
          const toCellValue = columns[f.columnIdx].toCellValue
          const value =
            toCellValue !== undefined
              ? toCellValue(rowIdx)
              : row[columns[f.columnIdx].field]
          return f.values.some((v) => v === value)
        })
  })

  // Sorting
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
              {columns.map((column, columnIdx) => {
                return (
                  <DataGridHeaderColumn<T>
                    key={columnIdx}
                    column={column}
                    order={orderBy === columnIdx ? order : null}
                    filter={
                      filters.find((f) => f.columnIdx === columnIdx) || null
                    }
                    onOrderByChange={(direction: Order) => {
                      setOrder(direction)
                      setOrderBy(columnIdx)
                    }}
                    onFilterChange={(values: Value[]) => {
                      const newFilters = filters.filter(
                        (f) => f.columnIdx !== columnIdx
                      )
                      newFilters.push({
                        columnIdx: columnIdx,
                        values: values,
                      })
                      setFilters(newFilters)
                    }}
                  />
                )
              })}
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

const TableHeaderCellSpan = styled("span")({
  display: "inline-flex",
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

function DataGridHeaderColumn<T>(props: {
  column: DataGridColumn<T>
  order: Order | null
  onOrderByChange: (order: Order) => void
  filter: RowFilter | null
  onFilterChange: (values: Value[]) => void
  dense?: boolean
}) {
  const { column, order, onOrderByChange, filter, onFilterChange, dense } =
    props
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)

  const filterChoices = column.filterChoices

  return (
    <TableCell
      padding={column.padding || "normal"}
      sortDirection={order !== null ? order : false}
    >
      <TableHeaderCellSpan>
        {column.sortable ? (
          <TableSortLabel
            active={order !== null}
            direction={order || "asc"}
            onClick={() => {
              onOrderByChange(order === "asc" ? "desc" : "asc")
            }}
          >
            {column.label}
            {order !== null ? (
              <HiddenSpan>
                {order === "desc" ? "sorted descending" : "sorted ascending"}
              </HiddenSpan>
            ) : null}
          </TableSortLabel>
        ) : (
          column.label
        )}
        {filterChoices !== undefined ? (
          <>
            <IconButton
              size={dense ? "small" : "medium"}
              onClick={(e) => {
                setFilterMenuAnchorEl(e.currentTarget)
              }}
            >
              <FilterListIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={filterMenuAnchorEl}
              open={filterMenuAnchorEl !== null}
              onClose={() => {
                setFilterMenuAnchorEl(null)
              }}
            >
              {filterChoices.map((choice, i) => (
                <MenuItem
                  key={choice}
                  onClick={() => {
                    const values =
                      filter === null
                        ? filterChoices.filter((v) => v !== choice)
                        : filter.values.some((v) => v === choice)
                        ? filter.values.filter((v) => v !== choice)
                        : [...filter.values, choice]
                    onFilterChange(values)
                  }}
                >
                  <ListItemIcon>
                    {!filter || !filter.values.every((v) => v !== choice) ? (
                      <CheckBoxIcon color="primary" />
                    ) : (
                      <CheckBoxOutlineBlankIcon color="primary" />
                    )}
                  </ListItemIcon>
                  {choice}
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : null}
      </TableHeaderCellSpan>
    </TableCell>
  )
}

function DataGridRow<T>(props: {
  columns: DataGridColumn<T>[]
  rowIndex: number
  row: T
  keyField: keyof T
  collapseBody?: (rowIndex: number) => React.ReactNode
}) {
  const { columns, rowIndex, row, keyField, collapseBody } = props
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
            : // TODO(c-bata): Avoid this implicit type conversion.
              (row[column.field] as number | string | null | undefined)

          return (
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
      const ascending = order == "asc"
      const result = ascending
        ? -less(a[0], b[0], ascending)
        : less(a[0], b[0], ascending)
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
