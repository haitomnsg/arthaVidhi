"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Download,
  Eye,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

const allBills = [
    { invoice: "INV001", client: "Liam Johnson", date: "2023-10-25", amount: "Rs. 250.00", status: "Paid" },
    { invoice: "INV002", client: "Olivia Smith", date: "2023-10-26", amount: "Rs. 150.00", status: "Pending" },
    { invoice: "INV003", client: "Noah Williams", date: "2023-10-27", amount: "Rs. 350.00", status: "Paid" },
    { invoice: "INV004", client: "Emma Brown", date: "2023-10-28", amount: "Rs. 450.00", status: "Overdue" },
    { invoice: "INV005", client: "Ava Jones", date: "2023-10-29", amount: "Rs. 550.00", status: "Paid" },
    { invoice: "INV006", client: "William Garcia", date: "2023-10-30", amount: "Rs. 200.00", status: "Pending" },
    { invoice: "INV007", client: "Sophia Miller", date: "2023-10-31", amount: "Rs. 300.00", status: "Paid" },
];

export default function AllBillsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBills = useMemo(() => {
    if (!searchTerm) return allBills;
    return allBills.filter(
      (bill) =>
        bill.invoice.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.client.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Bills</CardTitle>
            <CardDescription>Manage your bills and invoices.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/bills/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Bill
            </Link>
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice # or client name..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.map((bill) => (
              <TableRow key={bill.invoice}>
                <TableCell className="font-medium">{bill.invoice}</TableCell>
                <TableCell>{bill.client}</TableCell>
                <TableCell>{bill.date}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      bill.status === "Paid" ? "default" : bill.status === "Pending" ? "secondary" : "destructive"
                    }
                     className={bill.status === "Paid" ? 'bg-green-500/20 text-green-700 border-green-500/20' : bill.status === "Pending" ? 'bg-amber-500/20 text-amber-700 border-amber-500/20' : 'bg-red-500/20 text-red-700 border-red-500/20'}
                  >
                    {bill.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{bill.amount}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                      <DropdownMenuItem><Download className="mr-2 h-4 w-4" />Download PDF</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
