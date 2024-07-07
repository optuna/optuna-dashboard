import {
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  FilterList as FilterListIcon,
  FirstPage as FirstPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  LastPage as LastPageIcon,
} from "@mui/icons-material"
import {
  Box,
  IconButton,
  ListItem as ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  useTheme,
} from "@mui/material"
import { TablePaginationActionsProps } from "@mui/material/TablePagination/TablePaginationActions"
import { styled } from "@mui/system"
import React from "react"

import {
  ColumnDef,
  ColumnFiltersState,
  Header,
  PaginationState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

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

function FilterMenu<T>({
  header,
  filterChoices,
}: {
  header: Header<T, unknown>
  filterChoices: string[]
}): React.ReactElement {
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  return (
    <>
      <IconButton
        size="small"
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
        {filterChoices.map((choice) => (
          <MenuItem
            key={choice}
            onClick={() => {
              const skippedValues = header.column.getFilterValue() as string[]
              const isSkipped = skippedValues.includes(choice)
              const newSkippedValues = isSkipped
                ? skippedValues.filter((v) => v !== choice)
                : skippedValues.concat(choice)
              header.column.setFilterValue(newSkippedValues)
            }}
          >
            <ListItemIcon>
              {header.column.getFilterValue() !== undefined ? (
                (header.column.getFilterValue() as string[]).includes(
                  choice
                ) ? (
                  <CheckBoxOutlineBlankIcon color="primary" />
                ) : (
                  <CheckBoxIcon color="primary" />
                )
              ) : null}
            </ListItemIcon>
            {choice ?? "(missing value)"}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

function DataGrid<T>({
  data,
  columns,
  initialRowsPerPage,
}: {
  data: T[]
  columns: ColumnDef<T>[]
  initialRowsPerPage?: number
}): React.ReactElement {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const rowsPerPageOptions = [10, 50, 100, { label: "All", value: data.length }]
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize:
      initialRowsPerPage && rowsPerPageOptions.includes(initialRowsPerPage)
        ? initialRowsPerPage
        : 50,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      sorting,
      pagination,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    autoResetPageIndex: false,
  })

  return (
    <Box component="div" sx={{ width: "100%" }}>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  if (
                    header.column.getCanFilter() &&
                    !header.column.getIsFiltered()
                  ) {
                    header.column.setFilterValue([])
                  }
                  const order = header.column.getIsSorted()
                  const filterChoices = header.column.getCanFilter()
                    ? Array.from(
                        header.column.getFacetedUniqueValues().keys()
                      ).sort()
                    : null
                  return (
                    <TableCell key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : (
                        <TableHeaderCellSpan>
                          {header.column.getCanSort() ? (
                            <TableSortLabel
                              active={order !== false}
                              direction={order || "asc"}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {order !== null ? (
                                <HiddenSpan>
                                  {order === "desc"
                                    ? "sorted descending"
                                    : "sorted ascending"}
                                </HiddenSpan>
                              ) : null}
                            </TableSortLabel>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )
                          )}
                          {filterChoices !== null ? (
                            <FilterMenu
                              header={header}
                              filterChoices={filterChoices}
                            />
                          ) : null}
                        </TableHeaderCellSpan>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              return (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box component="div" display="flex" alignItems="center">
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={table.getFilteredRowModel().rows.length}
          rowsPerPage={table.getState().pagination.pageSize}
          page={table.getState().pagination.pageIndex}
          slotProps={{
            select: {
              inputProps: { "aria-label": "rows per page" },
              native: true,
            },
          }}
          onPageChange={(_, page) => {
            table.setPageIndex(page)
          }}
          onRowsPerPageChange={(e) => {
            const size = e.target.value ? Number(e.target.value) : 10
            table.setPageSize(size)
          }}
          ActionsComponent={TablePaginationActions}
        />
        {table.getPageCount() > 2 ? (
          <PaginationForm1
            onPageNumberSubmit={(page) => table.setPageIndex(page)}
            maxPageNumber={table.getPageCount()}
          />
        ) : null}
      </Box>
    </Box>
  )
}

const TablePaginationActions = ({
  count,
  page,
  rowsPerPage,
  onPageChange,
}: TablePaginationActionsProps) => {
  const theme = useTheme()
  const handleFirstPageButtonClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    onPageChange(event, 0)
  }

  const handleBackButtonClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    onPageChange(event, page - 1)
  }

  const handleNextButtonClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    onPageChange(event, page + 1)
  }

  const handleLastPageButtonClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1))
  }

  return (
    <Box component="div" sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === "rtl" ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === "rtl" ? (
          <KeyboardArrowRight />
        ) : (
          <KeyboardArrowLeft />
        )}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === "rtl" ? (
          <KeyboardArrowLeft />
        ) : (
          <KeyboardArrowRight />
        )}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === "rtl" ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  )
}

const PaginationForm1: React.FC<{
  onPageNumberSubmit: (value: number) => void
  maxPageNumber: number
}> = ({ onPageNumberSubmit, maxPageNumber }) => {
  // This component is separated from DataGrid to prevent `DataGrid` from re-rendering the page,
  // every time any letters are input.
  const [specifiedPageText, setSpecifiedPageText] = React.useState("")

  const handleSubmitPageNumber = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const newPageNumber = parseInt(specifiedPageText, 10)
    // Page is 0-indexed in `TablePagination`.
    onPageNumberSubmit(newPageNumber - 1)
    setSpecifiedPageText("") // reset the input field
  }

  return (
    <form onSubmit={handleSubmitPageNumber}>
      <TextField
        size="small"
        label={`Go to Page: n / ${maxPageNumber}`}
        value={specifiedPageText}
        type="number"
        style={{ width: 200 }}
        inputProps={{ min: 1, max: maxPageNumber }}
        onChange={(e) => {
          setSpecifiedPageText(e.target.value)
        }}
      />
    </form>
  )
}

export { DataGrid }
