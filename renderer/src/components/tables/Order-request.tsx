"use client";

// Global imports
import * as React from "react";
import { useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Menu,
} from "lucide-react";

// Local imports
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button as NextButton } from "@nextui-org/button";
import { OrderData } from "@/utils/Types";

// coloum sturture
export const columns: ColumnDef<OrderData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value: any) =>
          table.toggleAllPageRowsSelected(!!value)
        }
        aria-label="Select all"
        className="border-customPrimary-500 data-[state=checked]:bg-customPrimary-500 data-[state=checked]:text-white"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: any) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="border-customPrimary-500 data-[state=checked]:bg-customPrimary-500 data-[state=checked]:text-white"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <div className="lowercase">{row.getValue("id")}</div>,
  },
  {
    accessorKey: "dateTime",
    header: "Date & Time",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("dateTime")}</div>
    ),
  },
  {
    accessorKey: "orderType",
    header: "Order Type",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("orderType")}</div>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer Name",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("customerName")}</div>
    ),
  },
  {
    accessorKey: "items",
    header: "Items",
    cell: ({ row }) => <div className="lowercase">{row.getValue("items")}</div>,
  },
  {
    accessorKey: "orderStatus",
    header: "Order Status",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("orderStatus")}</div>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <div className="lowercase ">${row.getValue("amount")}</div>
    ),
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment Status",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("paymentStatus")}</div>
    ),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <div className="lowercase">{row.getValue("notes") || "N/A"}</div>
    ),
  },
  {
    accessorKey: "createdBy",
    header: "Created By",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("createdBy")}</div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-5 w-5 p-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 "
            >
              <Menu className="h-4 w-4 text-customPrimary-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-white px-3 py-3 rounded-lg text-customPrimary-500 max-w-44"
          >
            <DropdownMenuItem className="capitalize hover:text-customPrimary-500 hover:bg-customPrimary-50 focus:bg-customPrimary-50 focus:text-customPrimary-500 ">
              View
            </DropdownMenuItem>
            <DropdownMenuItem className="capitalize hover:text-customPrimary-500 hover:bg-customPrimary-50 focus:bg-customPrimary-50 focus:text-customPrimary-500 ">
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="capitalize hover:text-customPrimary-500 hover:bg-customPrimary-50 focus:bg-customPrimary-50 focus:text-customPrimary-500 ">
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem className="capitalize hover:text-customPrimary-500 hover:bg-customPrimary-50 focus:bg-customPrimary-50 focus:text-customPrimary-500 ">
              Clone
            </DropdownMenuItem>
            <DropdownMenuItem className="capitalize hover:text-customPrimary-500 hover:bg-customPrimary-50 focus:bg-customPrimary-50 focus:text-customPrimary-500 ">
              Print invoice
            </DropdownMenuItem>
            <DropdownMenuItem className="capitalize hover:text-customPrimary-500 hover:bg-customPrimary-50 focus:bg-customPrimary-50 focus:text-customPrimary-500 ">
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function ExpensesTable({ data }: { data: OrderData[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 9,
      },
    },
  });

  return (
    <div className="w-full">
      <div className="flex space-x-4 my-5 justify-between">
        {/* filter and search  */}
        <div className="flex space-x-3">
          {/* filter  */}

          <Input
            placeholder="Find order..."
            value={(table.getState().globalFilter as string) ?? ""}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="h-9 max-w-64 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-customPrimary-500"
          />
        </div>

        {/* other buttons  */}
        <div className="flex space-x-5">
          <NextButton
            radius="sm"
            size="sm"
            className="bg-customPrimary-400 text-white min-h-9 text-md"
          >
            Import/Export
          </NextButton>
          {/* of on coloum  */}
          <DropdownMenu onOpenChange={(open) => setIsOpen(open)}>
            <DropdownMenuTrigger asChild>
              <Button
                size={"sm"}
                className="ml-auto bg-customPrimary-500  rounded-lg hover:bg-customPrimary-50 hover:text-black border hover:border-customPrimary-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                // onClick={() => setIsOpen(!isOpen)}
              >
                Options
                {isOpen ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white text-customPrimary-500 "
            >
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      role="menuitemcheckbox"
                      key={column.id}
                      className="capitalize hover:text-customPrimary-500 hover:bg-customPrimary-50 focus:bg-customPrimary-50 focus:text-customPrimary-500 "
                      checked={column.getIsVisible()}
                      onCheckedChange={(value: any) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* table  */}
      <div className="h-[67vh] 2xl:h-[62vh] w-full overflow-auto rounded-md border scrollbar-hide relative">
        <Table className="bg-white min-w-max scrollbar-hide  w-full relative">
          <TableHeader className="sticky top-0 bg-customPrimary-50 z-20 shadow ">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-customPrimary-50"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-customPrimary-500 px-6 py-3 2xl:py-5  whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          {/* Table Body */}
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-white "
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-6 py-3 2xl:py-4 whitespace-nowrap "
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center hover:bg-white"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* pagination  */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground ">
          {table.getFilteredSelectedRowModel().rows.length}
          <span className="px-1">of</span>
          {table.getFilteredRowModel().rows.length} rows selected.
        </div>
        <div className="space-x-2">
          <Button
            className="bg-customPrimary-500 hover:bg-customPrimary-100"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            className="bg-customPrimary-500 hover:bg-customPrimary-100"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
