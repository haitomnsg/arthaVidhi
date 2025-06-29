
"use client";

import React, { useTransition, useState, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import {
  CalendarIcon,
  PlusCircle,
  Download,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { Company } from '@prisma/client';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { createBill } from "@/app/actions/bills";
import { getCompanyDetails } from "@/app/actions/company";
import { generateAndDownloadPdf, type PDFData } from "@/components/bill-pdf-download";

const billItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required."),
  rate: z.coerce.number().min(0, "Rate must be a positive number"),
});

const billFormSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientAddress: z.string().min(1, "Client address is required"),
  clientPhone: z.string().min(1, "Client phone is required"),
  panNumber: z.string().optional(),
  billDate: z.date(),
  dueDate: z.date(),
  items: z.array(billItemSchema).min(1, "At least one item is required"),
  discount: z.coerce.number().min(0, "Discount cannot be negative").optional(),
});

type BillFormValues = z.infer<typeof billFormSchema>;

export default function CreateBillPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [companyDetails, setCompanyDetails] = useState<Partial<Company>>({});
  
  useEffect(() => {
    getCompanyDetails().then(setCompanyDetails);
  }, []);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      clientName: "",
      clientAddress: "",
      clientPhone: "",
      panNumber: "",
      billDate: new Date(),
      dueDate: new Date(),
      items: [{ description: "", quantity: 1, unit: "Pcs", rate: 0 }],
      discount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const discountValue = form.watch("discount");

  const { subtotal, discount, subtotalAfterDiscount, vat, total } = useMemo(() => {
    const calculatedSubtotal = (watchedItems || []).reduce((acc, item) => {
      const quantity = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return acc + quantity * rate;
    }, 0);

    const calculatedDiscount = Number(discountValue) || 0;
    const calculatedSubtotalAfterDiscount = calculatedSubtotal - calculatedDiscount;
    const calculatedVat = calculatedSubtotalAfterDiscount * 0.13;
    const calculatedTotal = calculatedSubtotalAfterDiscount + calculatedVat;

    return {
      subtotal: calculatedSubtotal,
      discount: calculatedDiscount,
      subtotalAfterDiscount: calculatedSubtotalAfterDiscount,
      vat: calculatedVat,
      total: calculatedTotal
    };
  }, [watchedItems, discountValue]);


  const onSubmit = (values: BillFormValues) => {
    startTransition(() => {
        createBill(values).then((data) => {
            if (data.error) {
                toast({
                    title: "Error",
                    description: data.error,
                    variant: "destructive",
                });
            }
            if (data.success && data.bill) {
                toast({
                    title: "Bill Created",
                    description: "Your PDF will download automatically.",
                });
                const pdfData: PDFData = {
                    bill: values,
                    company: companyDetails,
                    subtotal,
                    discount,
                    vat,
                    total,
                    invoiceNumber: data.bill.invoiceNumber,
                };
                generateAndDownloadPdf(pdfData);
            }
        });
    });
  };

  const billData = form.watch();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Create a New Bill</CardTitle>
              <CardDescription>
                Fill in the details below to generate a new bill.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} id="bill-form" className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Client Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <FormField name="clientName" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Acme Inc."/></FormControl><FormMessage /></FormItem>)} />
                       <FormField name="clientPhone" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Client Phone</FormLabel><FormControl><Input {...field} placeholder="9876543210"/></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField name="clientAddress" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Client Address</FormLabel><FormControl><Textarea {...field} placeholder="123 Main St, Anytown..."/></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="panNumber" control={form.control} render={({ field }) => ( <FormItem><FormLabel>PAN Number (Optional)</FormLabel><FormControl><Input {...field} placeholder="Client's PAN"/></FormControl><FormMessage /></FormItem>)} />
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField name="billDate" control={form.control} render={({ field }) => (
                          <FormItem className="flex flex-col"><FormLabel>Bill Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}/>
                        <FormField name="dueDate" control={form.control} render={({ field }) => (
                          <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}/>
                     </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                     <h3 className="text-lg font-medium">Bill Items</h3>
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-4 items-end p-4 border rounded-lg relative">
                           <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                              <FormField name={`items.${index}.description`} control={form.control} render={({ field }) => (<FormItem className="md:col-span-5"><FormLabel>Description</FormLabel><FormControl><Input {...field} placeholder="Item or service"/></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`items.${index}.quantity`} control={form.control} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} placeholder="1"/></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`items.${index}.unit`} control={form.control} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Unit</FormLabel><FormControl><Input {...field} placeholder="Pcs"/></FormControl><FormMessage /></FormItem>)} />
                              <FormField name={`items.${index}.rate`} control={form.control} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Rate (Rs.)</FormLabel><FormControl><Input type="number" {...field} placeholder="100.00"/></FormControl><FormMessage /></FormItem>)} />
                           </div>
                           <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="h-4 w-4" /></Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={() => append({ description: "", quantity: 1, unit: "Pcs", rate: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Summary</h3>
                    <FormField name="discount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Discount (Rs.)</FormLabel><FormControl><Input type="number" {...field} placeholder="0.00"/></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </form>
              </Form>
            </CardContent>
             <CardFooter>
               <Button type="submit" form="bill-form" disabled={isPending || !form.formState.isValid} size="lg">
                 {isPending ? "Saving..." : <><Download className="mr-2 h-4 w-4" /> Create Bill & Download</>}
               </Button>
             </CardFooter>
          </Card>
        </div>
        <div className="min-w-0">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Bill Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <BillPreview company={companyDetails} bill={billData} subtotal={subtotal} discount={discount} vat={vat} total={total} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

interface BillPreviewProps {
    company: Partial<Company>;
    bill: Partial<BillFormValues>;
    subtotal: number;
    discount: number;
    vat: number;
    total: number;
}

function BillPreview({ company, bill, subtotal, discount, vat, total }: BillPreviewProps) {
  const formattedDate = bill.billDate ? format(bill.billDate, "PPP") : 'N/A';
  const formattedDueDate = bill.dueDate ? format(bill.dueDate, "PPP") : formattedDate;
  return (
    <div className="bg-card text-card-foreground p-8 rounded-lg border">
       <header className="flex justify-between items-start mb-8">
        <div>
          <Logo />
          <p className="font-bold text-lg mt-4">{company?.name || "Your Company"}</p>
          <p className="text-muted-foreground text-sm">{company?.address}</p>
          <p className="text-muted-foreground text-sm">
            {company?.phone && `Phone: ${company.phone}`}
            {company?.email && company?.phone && " | "}
            {company?.email && `Email: ${company.email}`}
          </p>
          <p className="text-muted-foreground text-sm">
            {company?.panNumber && `PAN: ${company.panNumber}`}
            {company?.vatNumber && company?.panNumber && " | "}
            {company?.vatNumber && `VAT: ${company.vatNumber}`}
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase text-primary">Invoice</h2>
          <p className="text-muted-foreground">#INV-PREVIEW</p>
        </div>
       </header>
       <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h4 className="font-semibold mb-2">Bill To:</h4>
          <p className="font-bold">{bill.clientName || "Client Name"}</p>
          <p className="text-sm text-muted-foreground">{bill.clientAddress || "Client Address"}</p>
          <p className="text-sm text-muted-foreground">{bill.clientPhone || "Client Phone"}</p>
          {bill.panNumber && <p className="text-sm text-muted-foreground">PAN: {bill.panNumber}</p>}
        </div>
        <div className="text-right">
          <p><span className="font-semibold">Bill Date:</span> {formattedDate}</p>
          <p><span className="font-semibold">Due Date:</span> {formattedDueDate}</p>
        </div>
       </div>

       <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left font-semibold">Item</th>
              <th className="p-3 text-center font-semibold">Qty</th>
              <th className="p-3 text-center font-semibold">Unit</th>
              <th className="p-3 text-right font-semibold">Rate</th>
              <th className="p-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(bill.items && bill.items.length > 0 && bill.items[0].description) ? bill.items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="p-3">{item.description}</td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-center">{item.unit}</td>
                <td className="p-3 text-right">Rs. {(Number(item.rate) || 0).toFixed(2)}</td>
                <td className="p-3 text-right">Rs. {((Number(item.quantity) || 0) * (Number(item.rate) || 0)).toFixed(2)}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Add items to see them here.</td></tr>
            )}
          </tbody>
        </table>
       </div>

       <div className="flex justify-end mt-8">
        <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Rs. {subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>- Rs. {discount.toFixed(2)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal after Discount</span><span>Rs. {(subtotal - discount).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">VAT (13%)</span><span>Rs. {vat.toFixed(2)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold text-lg"><span className="text-primary">Total</span><span className="text-primary">Rs. {total.toFixed(2)}</span></div>
        </div>
       </div>

       <footer className="mt-16 text-center text-xs text-muted-foreground">
        <p>Thank you for your business!</p>
        <p>ArthaVidhi - Billing Software by Haitomns Groups</p>
       </footer>
    </div>
  )
}
