
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, Loader2, Save, Trash2, ArrowLeft } from 'lucide-react';

import { getBillDetails, updateBillStatus, deleteBill } from '@/app/actions/bills';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { BillPreview } from '@/components/bill-preview';
import { generateBillPdf } from '@/components/bill-pdf-download';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';

type BillDataType = {
  bill: any;
  company: any;
  totals: any;
};

export default function ViewBillPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const billId = Number(params.billId);

  const [billData, setBillData] = useState<BillDataType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');

  useEffect(() => {
    if (isNaN(billId)) {
      toast({ title: "Error", description: "Invalid Bill ID.", variant: "destructive" });
      router.push('/dashboard/bills');
      return;
    }
    
    setIsLoading(true);
    getBillDetails(billId).then(res => {
      if (res.success && res.data) {
        setBillData(res.data);
        setCurrentStatus(res.data.bill.status);
      } else {
        toast({ title: "Error", description: res.error || "Failed to fetch bill details.", variant: "destructive" });
        router.push('/dashboard/bills');
      }
      setIsLoading(false);
    });
  }, [billId, router, toast]);

  const handleDownload = () => {
    if (!billData) return;
    setIsDownloading(true);
    try {
      generateBillPdf(billData);
    } catch (error) {
      toast({ title: "Download Failed", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUpdateStatus = () => {
    startTransition(() => {
      updateBillStatus(billId, currentStatus).then(res => {
        if (res.success) {
          toast({ title: "Success", description: res.success });
          // Re-fetch data to reflect updated status
          getBillDetails(billId).then(refreshedRes => {
            if (refreshedRes.success) {
              setBillData(refreshedRes.data);
            }
          });
        } else {
          toast({ title: "Error", description: res.error, variant: "destructive" });
        }
      });
    });
  };

  const handleDelete = () => {
    startTransition(() => {
      deleteBill(billId).then(res => {
        if (res.success) {
          toast({ title: "Success", description: res.success });
          router.push('/dashboard/bills');
        } else {
          toast({ title: "Error", description: res.error, variant: "destructive" });
        }
      });
    });
  };

  if (isLoading || !billData) {
    return <ViewBillSkeleton />;
  }

  const { bill, company, totals } = billData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invoice Details</CardTitle>
                <CardDescription>Viewing invoice #{bill.invoiceNumber}</CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard/bills">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Bills
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <BillPreview
              company={company}
              bill={bill}
              subtotal={totals.subtotal}
              discount={totals.discount}
              subtotalAfterDiscount={totals.subtotalAfterDiscount}
              vat={totals.vat}
              total={totals.total}
              appliedDiscountLabel={totals.appliedDiscountLabel}
              invoiceNumber={bill.invoiceNumber}
            />
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Manage this invoice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Bill Status</label>
              <div className="flex items-center gap-2">
                <Select value={currentStatus} onValueChange={setCurrentStatus} disabled={isPending}>
                  <SelectTrigger className="flex-grow">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleUpdateStatus} disabled={isPending || currentStatus === bill.status}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download PDF
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Bill
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this bill
                    and all of its associated data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                    {isPending ? 'Deleting...' : 'Continue'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ViewBillSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
             <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <Skeleton className="h-10 w-40" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-8 border rounded-lg">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <Skeleton className="h-8 w-32 mb-4" />
                        <Skeleton className="h-5 w-40 mb-2" />
                        <Skeleton className="h-4 w-64 mb-1" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                     <div className="text-right">
                        <Skeleton className="h-9 w-32 mb-2" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <Skeleton className="h-5 w-16 mb-2" />
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-48 mb-1" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                </div>
                <Skeleton className="h-40 w-full" />
                <div className="flex justify-end mt-8">
                    <div className="w-full max-w-xs space-y-3">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-6 w-full" />
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <Card className="sticky top-20">
            <CardHeader>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
