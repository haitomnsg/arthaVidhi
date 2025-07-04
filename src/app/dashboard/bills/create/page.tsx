
"use client";

import React, { useTransition, useState, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import {
  CalendarIcon,
  PlusCircle,
  Save,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { createBill, getNextInvoiceNumber } from "@/app/actions/bills";
import { getCompanyDetails } from "@/app/actions/company";
import { generateBillPdf } from "@/components/bill-pdf-download";

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
  discountType: z.enum(['percentage', 'amount']).default('amount'),
  discountPercentage: z.coerce.number().min(0, "Cannot be negative").max(100, "Cannot exceed 100").optional(),
  discountAmount: z.coerce.number().min(0, "Cannot be negative").optional(),
});

type BillFormValues = z.infer<typeof billFormSchema>;

const defaultFormValues: BillFormValues = {
  clientName: "",
  clientAddress: "",
  clientPhone: "",
  panNumber: "",
  billDate: new Date(),
  dueDate: new Date(),
  items: [{ description: "", quantity: 1, unit: "Pcs", rate: 0 }],
  discountType: 'amount',
  discountAmount: 0,
  discountPercentage: 0,
};

export default function CreateBillPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [companyDetails, setCompanyDetails] = useState<Partial<Company>>({});
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>("#INV-PREVIEW");

  useEffect(() => {
    getCompanyDetails().then(setCompanyDetails);
    getNextInvoiceNumber().then(setNextInvoiceNumber);
  }, []);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const billData = form.watch();

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'discountType') {
        if (value.discountType === 'percentage') {
          form.setValue('discountAmount', 0);
        } else {
          form.setValue('discountPercentage', 0);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const { subtotal, discount, subtotalAfterDiscount, vat, total, appliedDiscountLabel } = useMemo(() => {
    const { items, discountType, discountAmount, discountPercentage } = billData;

    const calculatedSubtotal = (items || []).reduce((acc, item) => {
      const quantity = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return acc + quantity * rate;
    }, 0);

    let calculatedDiscount = 0;
    let label = 'Discount';

    if (discountType === 'percentage') {
        const percentage = Number(discountPercentage) || 0;
        if (percentage > 0) {
            calculatedDiscount = calculatedSubtotal * (percentage / 100);
            label = `Discount (${percentage}%)`;
        }
    } else {
        calculatedDiscount = Number(discountAmount) || 0;
    }

    const calculatedSubtotalAfterDiscount = calculatedSubtotal - calculatedDiscount;
    const calculatedVat = calculatedSubtotalAfterDiscount * 0.13;
    const calculatedTotal = calculatedSubtotalAfterDiscount + calculatedVat;

    return {
      subtotal: calculatedSubtotal,
      discount: calculatedDiscount,
      subtotalAfterDiscount: calculatedSubtotalAfterDiscount,
      vat: calculatedVat,
      total: calculatedTotal,
      appliedDiscountLabel: label,
    };
  }, [billData]);

  const onSubmit = (values: BillFormValues) => {
    startTransition(async () => {
      const serverResponse = await createBill(values);
      
      if (serverResponse.error) {
        toast({
          title: "Error",
          description: serverResponse.error,
          variant: "destructive",
        });
        return;
      }
      
      if (serverResponse.success && serverResponse.data) {
        toast({
          title: "Bill Saved",
          description: serverResponse.success,
        });

        try {
            generateBillPdf(serverResponse.data);
        } catch (pdfError) {
            console.error("Failed to generate PDF on client:", pdfError);
            toast({
                title: "PDF Generation Failed",
                description: "The bill was saved, but the PDF could not be generated. You can download it later.",
                variant: "destructive",
            });
        }

        form.reset(defaultFormValues);
        getNextInvoiceNumber().then(setNextInvoiceNumber);
      }
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block">
        <div className="min-w-0 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle>Create a New Bill</CardTitle>
              <CardDescription>
                Fill in the details below to save a new bill.
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
                    <h3 className="text-lg font-medium">Discount</h3>
                    <FormField
                      control={form.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex items-center space-x-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="amount" />
                                </FormControl>
                                <FormLabel className="font-normal">In Amount (Rs.)</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="percentage" />
                                </FormControl>
                                <FormLabel className="font-normal">In Percentage (%)</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            name="discountAmount"
                            control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            placeholder="e.g. 100"
                                            disabled={billData.discountType === 'percentage'}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="discountPercentage"
                            control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Percentage</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            placeholder="e.g. 10"
                                            disabled={billData.discountType === 'amount'}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
             <CardFooter>
               <Button type="submit" form="bill-form" disabled={isPending || !form.formState.isValid} size="lg">
                 {isPending ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save & Download Bill</>}
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
              <BillPreview 
                company={companyDetails} 
                bill={billData} 
                subtotal={subtotal} 
                discount={discount}
                subtotalAfterDiscount={subtotalAfterDiscount}
                vat={vat} 
                total={total} 
                appliedDiscountLabel={appliedDiscountLabel}
                invoiceNumber={nextInvoiceNumber} 
              />
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
    subtotalAfterDiscount: number;
    vat: number;
    total: number;
    appliedDiscountLabel: string;
    invoiceNumber: string;
}

function BillPreview({ company, bill, subtotal, discount, subtotalAfterDiscount, vat, total, appliedDiscountLabel, invoiceNumber }: BillPreviewProps) {
  const formattedDate = bill.billDate ? format(bill.billDate, "PPP") : 'N/A';
  const formattedDueDate = bill.dueDate ? format(bill.dueDate, "PPP") : formattedDate;
  return (
    <div className="bg-card text-card-foreground p-8 rounded-lg border print:border-none print:shadow-none">
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
          <p className="text-muted-foreground"># {invoiceNumber}</p>
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
            {(bill.items && bill.items.length > 0 && (bill.items[0].description || (bill.items[0].rate || 0) > 0)) ? bill.items.map((item, index) => (
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
            <div className="flex justify-between"><span className="text-muted-foreground">{appliedDiscountLabel}</span><span>- Rs. {discount.toFixed(2)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal after Discount</span><span>Rs. {subtotalAfterDiscount.toFixed(2)}</span></div>
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
