
'use client';

import { format } from 'date-fns';
import type { Company } from '@prisma/client';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import type { QuotationFormValues } from '@/app/dashboard/quotations/create/page';

interface QuotationPreviewProps {
    company: Partial<Company>;
    quotation: Partial<QuotationFormValues> | any;
    subtotal: number;
    vat: number;
    total: number;
}

export function QuotationPreview({ company, quotation, subtotal, vat, total }: QuotationPreviewProps) {
  const formattedDate = quotation.quotationDate ? format(new Date(quotation.quotationDate), "PPP") : format(new Date(), "PPP");
  
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
          <h2 className="text-3xl font-bold uppercase text-primary">Quotation</h2>
          <p className="text-muted-foreground">Date: {formattedDate}</p>
        </div>
       </header>
       <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h4 className="font-semibold mb-2">Quote For:</h4>
          <p className="font-bold">{quotation.clientName || "Client Name"}</p>
          <p className="text-sm text-muted-foreground">{quotation.clientAddress || "Client Address"}</p>
          <p className="text-sm text-muted-foreground">{quotation.clientPhone || "Client Phone"}</p>
          {quotation.panNumber && <p className="text-sm text-muted-foreground">PAN: {quotation.panNumber}</p>}
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
            {(quotation.items && quotation.items.length > 0 && (quotation.items[0].description || (quotation.items[0].rate || 0) > 0)) ? quotation.items.map((item: any, index: number) => (
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
            <div className="flex justify-between"><span className="text-muted-foreground">VAT (13%)</span><span>Rs. {vat.toFixed(2)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold text-lg"><span className="text-primary">Total</span><span className="text-primary">Rs. {total.toFixed(2)}</span></div>
        </div>
       </div>

       <footer className="mt-16 text-center text-xs text-muted-foreground">
        <p>This quotation is valid for 30 days.</p>
        <p>ArthaVidhi - Billing Software by Haitomns Groups</p>
       </footer>
    </div>
  )
}
