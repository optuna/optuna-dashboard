import React, { FC } from "react"
import {
  IconButton,
  Button,
  useTheme,
  TableSortLabel,
  Menu,
  MenuItem,
} from "@mui/material"
import LinkIcon from "@mui/icons-material/Link"
import DownloadIcon from "@mui/icons-material/Download"
import LinkIcon from "@mui/icons-material/Link"
import { Button, IconButton, useTheme } from "@mui/material"
import React, { FC } from "react"

import { Link } from "react-router-dom"
import { StudyDetail, Trial } from "ts/types/optuna"
import { DataGrid, DataGridColumn } from "./DataGrid"

import Box from "@mui/material/Box"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import TablePagination from "@mui/material/TablePagination"
import Paper from "@mui/material/Paper"
import { TablePaginationActionsProps } from "@mui/material/TablePagination/TablePaginationActions"
import FirstPageIcon from "@mui/icons-material/FirstPage"
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft"
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight"
import LastPageIcon from "@mui/icons-material/LastPage"
import { styled } from "@mui/system"
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank"
import CheckBoxIcon from "@mui/icons-material/CheckBox"
import FilterListIcon from "@mui/icons-material/FilterList"
import ListItemIcon from "@mui/material/ListItemIcon"

import {
  ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getFacetedUniqueValues,
  SortingState,
  ColumnFiltersState,
  useReactTable,
  Row,
  IdType,
  FilterFn,
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

const multiValueFilter: FilterFn<any> = <D extends object>(
  row: Row<D>,
  columnId: IdType<D>,
  filterValue: string[]
) => {
  const rowValue = row.getValue(columnId) as string
  return !filterValue.includes(rowValue)
}

const TablePaginationActions = (props: TablePaginationActionsProps) => {
  const theme = useTheme()
  const { count, page, rowsPerPage, onPageChange } = props

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
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
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

function BasicTable(props: {
  data: Trial[]
  columns: ColumnDef<Trial>[]
}): React.ReactElement {
  const { data, columns } = props
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    //
    // debugTable: true,
  })

  const { pageSize, pageIndex } = table.getState().pagination

  return (
    <Box sx={{ width: "100%" }}>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const order = header.column.getIsSorted()
                  const filterChoices = header.column.getCanFilter()
                    ? Array.from(
                        header.column.getFacetedUniqueValues().keys()
                      ).sort()
                    : []
                  if (
                    header.column.getCanFilter() &&
                    !header.column.getIsFiltered()
                  ) {
                    header.column.setFilterValue([])
                  }
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
                          {header.column.getCanFilter() ? (
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
                                      const skippedValues =
                                        header.column.getFilterValue() as string[]
                                      const isSkipped =
                                        skippedValues.includes(choice)
                                      const newSkippedValues = isSkipped
                                        ? skippedValues.filter(
                                            (v) => v !== choice
                                          )
                                        : skippedValues.concat(choice)
                                      header.column.setFilterValue(
                                        newSkippedValues
                                      )
                                    }}
                                  >
                                    <ListItemIcon>
                                      {(
                                        header.column.getFilterValue() as string[]
                                      ).includes(choice) ? (
                                        <CheckBoxOutlineBlankIcon color="primary" />
                                      ) : (
                                        <CheckBoxIcon color="primary" />
                                      )}
                                    </ListItemIcon>
                                    {choice ?? "(missing value)"}
                                  </MenuItem>
                                ))}
                              </Menu>
                            </>
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
      <TablePagination
        rowsPerPageOptions={[10, 50, 100, { label: "All", value: data.length }]}
        component="div"
        count={table.getFilteredRowModel().rows.length}
        rowsPerPage={pageSize}
        page={pageIndex}
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
    </Box>
  )
}

export const TrialTable: FC<{
  studyDetail: StudyDetail | null
  initialRowsPerPage?: number
}> = ({ studyDetail, initialRowsPerPage }) => {
  const theme = useTheme()
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []
  const objectiveNames: string[] = studyDetail?.objective_names || []

  const columns: DataGridColumn<Trial>[] = [
    { field: "number", label: "Number", sortable: true, padding: "none" },
    {
      field: "state",
      label: "State",
      sortable: true,
      filterChoices: ["Complete", "Pruned", "Fail", "Running", "Waiting"],
      padding: "none",
      toCellValue: (i) => trials[i].state.toString(),
    },
  ]

  const columnHelper = createColumnHelper<Trial>()
  const tcolumns: ColumnDef<Trial, any>[] = [
    columnHelper.accessor("number", {
      header: "Number",
      footer: (info) => info.column.id,
      enableColumnFilter: false,
    }),
    columnHelper.accessor("state", {
      header: "State",
      footer: (info) => info.column.id,
      enableSorting: false,
      filterFn: multiValueFilter,
    }),
  ]
  const valueComparator = (
    firstVal?: number,
    secondVal?: number,
    ascending = true
  ): number => {
    if (firstVal === secondVal) {
      return 0
    }
    if (firstVal === undefined) {
      return ascending ? -1 : 1
    } else if (secondVal === undefined) {
      return ascending ? 1 : -1
    }
    return firstVal < secondVal ? 1 : -1
  }
  if (studyDetail === null || studyDetail.directions.length === 1) {
    columns.push({
      field: "values",
      label: "Value",
      sortable: true,
      less: (firstEl, secondEl, ascending): number => {
        return valueComparator(
          firstEl.values?.[0],
          secondEl.values?.[0],
          ascending
        )
      },
      toCellValue: (i) => {
        if (trials[i].values === undefined) {
          return null
        }
        return trials[i].values?.[0]
      },
    })
    tcolumns.push(
      columnHelper.accessor("values", {
        header: "Value",
        footer: (info) => info.column.id,
        enableColumnFilter: false,
      })
    )
  } else {
    const objectiveColumns: DataGridColumn<Trial>[] =
      studyDetail.directions.map((s, objectiveId) => ({
        field: "values",
        label:
          objectiveNames.length === studyDetail?.directions.length
            ? objectiveNames[objectiveId]
            : `Objective ${objectiveId}`,
        sortable: true,
        less: (firstEl, secondEl, ascending): number => {
          return valueComparator(
            firstEl.values?.[objectiveId],
            secondEl.values?.[objectiveId],
            ascending
          )
        },
        toCellValue: (i) => {
          if (trials[i].values === undefined) {
            return null
          }
          return trials[i].values?.[objectiveId]
        },
      }))
    columns.push(...objectiveColumns)
    tcolumns.push(
      ...studyDetail.directions.map((s, objectiveId) =>
        columnHelper.accessor("values", {
          id: `values_${objectiveId}`,
          header: `Objective ${objectiveId}`,
          footer: (info) => info.column.id,
          enableColumnFilter: false,
        })
      )
    )
  }
  const isDynamicSpace =
    studyDetail?.union_search_space.length !==
    studyDetail?.intersection_search_space.length
  studyDetail?.union_search_space.forEach((s) => {
    const sortable = s.distribution.type !== "CategoricalDistribution"
    const filterChoices: (string | null)[] | undefined =
      s.distribution.type === "CategoricalDistribution"
        ? s.distribution.choices.map((c) => c?.toString() ?? "null")
        : undefined
    const hasMissingValue = trials.some(
      (t) => !t.params.some((p) => p.name === s.name)
    )
    if (filterChoices !== undefined && isDynamicSpace && hasMissingValue) {
      filterChoices.push(null)
    }
    columns.push({
      field: "params",
      label: `Param ${s.name}`,
      toCellValue: (i) =>
        trials[i].params.find((p) => p.name === s.name)?.param_external_value ||
        null,
      sortable: sortable,
      filterChoices: filterChoices,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      less: (firstEl, secondEl, _): number => {
        const firstVal = firstEl.params.find(
          (p) => p.name === s.name
        )?.param_internal_value
        const secondVal = secondEl.params.find(
          (p) => p.name === s.name
        )?.param_internal_value
        return valueComparator(firstVal, secondVal)
      },
    })
    tcolumns.push(
      columnHelper.accessor("params", {
        id: `params_${s.name}`,
        header: `Param ${s.name}`,
        cell: (info) =>
          info.getValue().find((p) => p.name === s.name)
            ?.param_external_value || null,
        footer: (info) => info.column.id,
        enableColumnFilter: false,
      })
    )
  })

  studyDetail?.union_user_attrs.forEach((attr_spec) => {
    columns.push({
      field: "user_attrs",
      label: `UserAttribute ${attr_spec.key}`,
      toCellValue: (i) =>
        trials[i].user_attrs.find((attr) => attr.key === attr_spec.key)
          ?.value || null,
      sortable: attr_spec.sortable,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      less: (firstEl, secondEl, _): number => {
        const firstValString = firstEl.user_attrs.find(
          (attr) => attr.key === attr_spec.key
        )?.value
        const secondValString = secondEl.user_attrs.find(
          (attr) => attr.key === attr_spec.key
        )?.value
        return valueComparator(
          Number(firstValString) ?? firstValString,
          Number(secondValString) ?? secondValString
        )
      },
    })
    tcolumns.push(
      columnHelper.accessor("user_attrs", {
        id: `user_attrs_${attr_spec.key}`,
        header: `UserAttribute ${attr_spec.key}`,
        cell: (info) =>
          info.getValue().find((a) => a.key === attr_spec.key)?.value || null,
        footer: (info) => info.column.id,
        enableColumnFilter: false,
      })
    )
  })
  columns.push({
    field: "trial_id",
    label: "Detail",
    toCellValue: (i) => (
      <IconButton
        component={Link}
        to={
          URL_PREFIX +
          `/studies/${trials[i].study_id}/trials?numbers=${trials[i].number}`
        }
        color="inherit"
        title="Go to the trial's detail page"
        size="small"
      >
        <LinkIcon />
      </IconButton>
    ),
  })
  tcolumns.push(
    columnHelper.accessor((row) => row, {
      header: "Detail",
      cell: (info) => (
        <IconButton
          component={Link}
          to={
            URL_PREFIX +
            `/studies/${info.getValue().study_id}/trials?numbers=${
              info.getValue().number
            }`
          }
          color="inherit"
          title="Go to the trial's detail page"
          size="small"
        >
          <LinkIcon />
        </IconButton>
      ),
      footer: (info) => info.column.id,
      enableSorting: false,
      enableColumnFilter: false,
    })
  )

  return (
    <>
      <DataGrid<Trial>
        columns={columns}
        rows={trials}
        keyField={"trial_id"}
        dense={true}
        initialRowsPerPage={initialRowsPerPage}
      />
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        download
        href={`/csv/${studyDetail?.id}`}
        sx={{ marginRight: theme.spacing(2), minWidth: "120px" }}
      >
        Download CSV File
      </Button>
      <BasicTable data={trials} columns={tcolumns} />
    </>
  )
}
