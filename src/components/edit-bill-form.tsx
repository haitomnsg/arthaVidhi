
"use client";

import React, { useTransition, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon, PlusCircle, Save, X } from "lucide-react";
import { format } from "date-fns";

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
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { updateBill, UpdateBillFormValues } from "@/app/actions/bills";
import { DialogFooter } from "./ui/dialog";

type BillDataType = {
  bill: any;
  company: any;
  totals: any;
};

const billItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required."),
  rate: z.coerce.number().min(0, "Rate must be a positive number"),
});

const updateBillFormSchema = z.object({
  billId: z.number(),
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


export function EditBillForm({ billData, onSuccess }: { billData: BillDataType, onSuccess: () => void }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const { bill } = billData;

  const form = useForm<UpdateBillFormValues>({
    resolver: zodResolver(updateBillFormSchema),
    defaultValues: {
      billId: bill.id,
      clientName: bill.clientName,
      clientAddress: bill.clientAddress,
      clientPhone: bill.clientPhone,
      panNumber: bill.clientPanNumber || "",
      billDate: new Date(bill.billDate),
      dueDate: new Date(bill.dueDate),
      items: bill.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
      })),
      discountType: 'amount',
      discountAmount: bill.discount || 0,
      discountPercentage: 0, // Simplified, can be enhanced later
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const discountType = form.watch("discountType");

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


  const onSubmit = (values: UpdateBillFormValues) => {
    startTransition(async () => {
      const result = await updateBill(values);
      if (result.success) {
        toast({ title: "Success", description: result.success });
        onSuccess();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} id="edit-bill-form" className="space-y-6">
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
          <FormField control={form.control} name="discountType" render={({ field }) => (
            <FormItem className="space-y-3">
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                  <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="amount" /></FormControl><FormLabel className="font-normal">In Amount (Rs.)</FormLabel></FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="percentage" /></FormControl><FormLabel className="font-normal">In Percentage (%)</FormLabel></FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
              <FormField name="discountAmount" control={form.control} render={({ field }) => (
                  <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl><Input type="number" {...field} placeholder="e.g. 100" disabled={discountType === 'percentage'} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
              <FormField name="discountPercentage" control={form.control} render={({ field }) => (
                  <FormItem>
                      <FormLabel>Percentage</FormLabel>
                      <FormControl><Input type="number" {...field} placeholder="e.g. 10" disabled={discountType === 'amount'} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
          </div>
        </div>
      </form>
       <DialogFooter className="pt-4">
         <Button type="submit" form="edit-bill-form" disabled={isPending} size="lg">
           {isPending ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
         </Button>
       </DialogFooter>
    </Form>
  );
}
