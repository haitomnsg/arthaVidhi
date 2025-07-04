
"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CircleDollarSign, Download, Eye, FileText, PlusCircle, Loader2 } from "lucide-react";

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
import { getDashboardData, getBillDetails } from "@/app/actions/bills";
import { generateBillPdf } from "@/components/bill-pdf-download";

type Stats = {
  totalRevenue: number;
  totalBills: number;
  paidBills: number;
  dueBills: number;
};

type RecentBill = {
  id: number;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  amount: number;
  status: string;
  billDate: Date;
};

export default function DashboardPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBills, setRecentBills] = useState<RecentBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getDashboardData().then((res) => {
      if (res.success) {
        setStats(res.stats);
        setRecentBills(res.recentBills);
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

  const handleDownload = async (billId: number) => {
    setDownloadingId(billId);
    try {
      const res = await getBillDetails(billId);
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

  if (isLoading || !stats) {
    return <DashboardSkeleton />;
  }

  const statsCards = [
    {
      title: "Total Revenue",
      amount: `Rs. ${stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <CircleDollarSign className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: "Total Bills",
      amount: stats.totalBills.toString(),
      icon: <FileText className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: "Bills Paid",
      amount: stats.paidBills.toString(),
      icon: <FileText className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: "Bills Due",
      amount: stats.dueBills.toString(),
      icon: <FileText className="h-5 w-5 text-muted-foreground text-destructive" />,
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Here's a quick overview of your business.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/bills/create">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Bill
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.amount}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
            <CardDescription>
              Your 5 most recent bills.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Invoice #</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Client Phone</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBills.length > 0 ? (
                  recentBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.invoiceNumber}</TableCell>
                      <TableCell>{bill.clientName}</TableCell>
                      <TableCell>{bill.clientPhone}</TableCell>
                      <TableCell>{format(new Date(bill.billDate), "PP")}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            bill.status === "Paid"
                              ? "default"
                              : bill.status === "Pending"
                              ? "secondary"
                              : "destructive"
                          }
                          className={bill.status === "Paid" ? 'bg-green-500/20 text-green-700 border-green-500/20' : bill.status === "Pending" ? 'bg-amber-500/20 text-amber-700 border-amber-500/20' : 'bg-red-500/20 text-red-700 border-red-500/20'}
                        >
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">Rs. {bill.amount.toFixed(2)}</TableCell>
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
                                <Link href={`/dashboard/bills/${bill.id}`}>
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
                      No recent bills found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-11 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-32 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(7)].map((_, i) => (
                    <TableHead key={i}><Skeleton className="h-5 w-full max-w-24" /></TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
