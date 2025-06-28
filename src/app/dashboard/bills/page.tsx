"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  PlusCircle,
  Search,
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const allBills = [
    { invoice: "INV001", client: { name: "Liam Johnson", phone: "987-654-3214" }, date: "2023-10-25", amount: "Rs. 250.00", status: "Paid" },
    { invoice: "INV002", client: { name: "Olivia Smith", phone: "987-654-3213" }, date: "2023-10-26", amount: "Rs. 150.00", status: "Pending" },
    { invoice: "INV003", client: { name: "Noah Williams", phone: "987-654-3212" }, date: "2023-10-27", amount: "Rs. 350.00", status: "Paid" },
    { invoice: "INV004", client: { name: "Emma Brown", phone: "987-654-3211" }, date: "2023-10-28", amount: "Rs. 450.00", status: "Overdue" },
    { invoice: "INV005", client: { name: "Ava Jones", phone: "987-654-3210" }, date: "2023-10-29", amount: "Rs. 550.00", status: "Paid" },
    { invoice: "INV006", client: { name: "William Garcia", phone: "987-654-3215" }, date: "2023-10-30", amount: "Rs. 200.00", status: "Pending" },
    { invoice: "INV007", client: { name: "Sophia Miller", phone: "987-654-3216" }, date: "2023-10-31", amount: "Rs. 300.00", status: "Paid" },
];

export default function AllBillsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBills = useMemo(() => {
    if (!searchTerm) return allBills;
    return allBills.filter(
      (bill) =>
        bill.invoice.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Find Bill</CardTitle>
              <CardDescription>Search and manage your bills.</CardDescription>
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
                <TableHead>Client Name</TableHead>
                <TableHead>Client Phone</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill.invoice}>
                  <TableCell className="font-medium">{bill.invoice}</TableCell>
                  <TableCell>{bill.client.name}</TableCell>
                  <TableCell>{bill.client.phone}</TableCell>
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
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href="#">
                              <Download className="h-4 w-4 text-primary" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download Bill</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href="#">
                              <Eye className="h-4 w-4 text-primary" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Bill</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
