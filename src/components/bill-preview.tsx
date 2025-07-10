
'use client';

import { format } from 'date-fns';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import type { BillFormValues } from '@/app/dashboard/bills/create/page';

// Define types locally since Prisma types are removed
interface Company {
    id: number;
    userId: number;
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    panNumber?: string | null;
    vatNumber?: string | null;
}

interface BillPreviewProps {
    company: Partial<Company>;
    bill: Partial<BillFormValues> | any;
    subtotal: number;
    discount: number | string;
    subtotalAfterDiscount: number;
    vat: number;
    total: number;
    appliedDiscountLabel: string;
    invoiceNumber: string;
}

export function BillPreview({ company, bill, subtotal, discount, subtotalAfterDiscount, vat, total, appliedDiscountLabel, invoiceNumber }: BillPreviewProps) {
  const formattedDate = bill.billDate ? format(new Date(bill.billDate), "PPP") : 'N/A';
  const formattedDueDate = bill.dueDate ? format(new Date(bill.dueDate), "PPP") : formattedDate;
  const numericDiscount = Number(discount) || 0;
  
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
          {bill.clientPanNumber && <p className="text-sm text-muted-foreground">PAN: {bill.clientPanNumber}</p>}
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
            {(bill.items && bill.items.length > 0 && (bill.items[0].description || (bill.items[0].rate || 0) > 0)) ? bill.items.map((item: any, index: number) => (
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
            <div className="flex justify-between"><span className="text-muted-foreground">{appliedDiscountLabel}</span><span>- Rs. {numericDiscount.toFixed(2)}</span></div>
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
