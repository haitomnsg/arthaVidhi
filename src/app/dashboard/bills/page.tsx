
"use client";

import React, { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Download, Eye, PlusCircle, Search, Loader2 } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getAllBills, getBillForPdf } from "@/app/actions/bills";
import { generateBillPdf } from "@/components/bill-pdf-download";

type Bill = {
  id: number;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  billDate: Date;
  status: string;
  amount: number;
};

export default function AllBillsPage() {
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getAllBills().then((res) => {
      if (res.success && res.data) {
        setBills(res.data);
      } else {
        toast({
          title: "Error",
          description: res.error,
          variant: "destructive",
        });
      }
      setIsLoading(false);
    });
  }, [toast]);

  const filteredBills = useMemo(() => {
    if (!searchTerm) return bills;
    return bills.filter(
      (bill) =>
        bill.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, bills]);

  const handleDownload = async (billId: number) => {
    setDownloadingId(billId);
    try {
      const res = await getBillForPdf(billId);
      if (res.success && res.data) {
        generateBillPdf(res.data);
      } else {
        toast({
          title: "Download Failed",
          description: res.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

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
          {isLoading ? (
            <TableSkeleton />
          ) : (
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
                {filteredBills.length > 0 ? (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">
                        {bill.invoiceNumber}
                      </TableCell>
                      <TableCell>{bill.clientName}</TableCell>
                      <TableCell>{bill.clientPhone}</TableCell>
                      <TableCell>{format(new Date(bill.billDate), "PP")}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            bill.status === "Paid"
                              ? "default"
                              : bill.status === "Pending"
                              ? "secondary"
                              : "destructive"
                          }
                          className={
                            bill.status === "Paid"
                              ? "bg-green-500/20 text-green-700 border-green-500/20"
                              : bill.status === "Pending"
                              ? "bg-amber-500/20 text-amber-700 border-amber-500/20"
                              : "bg-red-500/20 text-red-700 border-red-500/20"
                          }
                        >
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        Rs. {bill.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(bill.id)}
                                disabled={downloadingId === bill.id}
                              >
                                {downloadingId === bill.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (
                                  <Download className="h-4 w-4 text-primary" />
                                )}
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
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            No bills found.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-5 w-20" /></TableHead>
            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
            <TableHead><Skeleton className="h-5 w-16" /></TableHead>
            <TableHead className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableHead>
            <TableHead className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
