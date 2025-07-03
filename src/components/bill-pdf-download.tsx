
'use client';

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Company, Bill, BillItem } from '@prisma/client';

interface BillPdfData {
    bill: Bill & { items: BillItem[] };
    company: Partial<Company>;
    totals: {
        subtotal: number;
        discount: number;
        subtotalAfterDiscount: number;
        vat: number;
        total: number;
        appliedDiscountLabel: string;
    };
}

export const generateBillPdf = (data: BillPdfData) => {
  try {
    const { bill, company, totals } = data;
    const doc = new jsPDF();

    const pageHeight = doc.internal.pageSize.height;
    let y = 15;

    // --- Header ---
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || "Your Company", 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(company?.address || "Company Address", 15, y);
    y += 5;
    const phoneEmail = [company.phone, company.email].filter(Boolean).join(' | ');
    doc.text(phoneEmail, 15, y);
    y += 5;
    const panVat = [
        company.panNumber ? `PAN: ${company.panNumber}` : '',
        company.vatNumber ? `VAT: ${company.vatNumber}` : ''
    ].filter(Boolean).join(' | ');
    doc.text(panVat, 15, y);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("INVOICE", 195, 20, { align: 'right' });
    doc.setFontSize(12);
    doc.text(`# ${bill.invoiceNumber}`, 195, 27, { align: 'right' });
    y = 45;

    // --- Bill To & Dates ---
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("BILL TO:", 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(bill.clientName, 15, y + 6);
    doc.text(bill.clientAddress, 15, y + 12);
    doc.text(bill.clientPhone, 15, y + 18);
    if(bill.clientPanNumber) {
        doc.text(`PAN: ${bill.clientPanNumber}`, 15, y + 24);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text("Bill Date:", 145, y);
    doc.text("Due Date:", 145, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(bill.billDate), "PPP"), 195, y, { align: 'right' });
    doc.text(format(new Date(bill.dueDate), "PPP"), 195, y + 6, { align: 'right' });

    y += 35;

    // --- Items Table Header ---
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(230, 230, 230);
    doc.rect(15, y - 5, 180, 8, 'F');
    doc.text("Item Description", 18, y);
    doc.text("Qty", 115, y, { align: 'center' });
    doc.text("Unit", 135, y, { align: 'center' });
    doc.text("Rate", 160, y, { align: 'right' });
    doc.text("Amount", 195, y, { align: 'right' });
    y += 8;

    // --- Items Table Body ---
    doc.setFont('helvetica', 'normal');
    bill.items.forEach(item => {
        if (y > pageHeight - 50) {
            doc.addPage();
            y = 20;
        }
        const itemTotal = item.quantity * item.rate;
        
        doc.text(item.description, 18, y);
        doc.text(item.quantity.toString(), 115, y, { align: 'center' });
        doc.text(item.unit, 135, y, { align: 'center' });
        doc.text(item.rate.toFixed(2), 160, y, { align: 'right' });
        doc.text(itemTotal.toFixed(2), 195, y, { align: 'right' });
        y += 7;
    });

    // --- Totals Section ---
    y += 5;
    doc.setLineWidth(0.2);
    doc.line(130, y, 195, y);
    y += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text("Subtotal", 132, y);
    doc.text(`Rs. ${totals.subtotal.toFixed(2)}`, 195, y, { align: 'right' });
    y += 6;

    doc.text(totals.appliedDiscountLabel, 132, y);
    doc.text(`- Rs. ${totals.discount.toFixed(2)}`, 195, y, { align: 'right' });
    y += 6;

    doc.line(130, y, 195, y);
    y += 6;

    doc.text("Subtotal after Discount", 132, y);
    doc.text(`Rs. ${totals.subtotalAfterDiscount.toFixed(2)}`, 195, y, { align: 'right' });
    y += 6;

    doc.text("VAT (13%)", 132, y);
    doc.text(`Rs. ${totals.vat.toFixed(2)}`, 195, y, { align: 'right' });
    y += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.setLineWidth(0.5);
    doc.line(130, y, 195, y);
    y += 6;

    doc.setFontSize(12);
    doc.text("TOTAL", 132, y);
    doc.text(`Rs. ${totals.total.toFixed(2)}`, 195, y, { align: 'right' });

    // --- Footer ---
    y = pageHeight - 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text("Thank you for your business!", doc.internal.pageSize.width / 2, y, { align: 'center' });
    y += 4;
    doc.text("ArthaVidhi - Billing Software by Haitomns Groups", doc.internal.pageSize.width / 2, y, { align: 'center' });

    // --- Save the PDF ---
    doc.save(`${bill.invoiceNumber}.pdf`);

  } catch (error) {
    console.error("Error generating PDF: ", error);
    alert("Failed to generate PDF. Please try again.");
    throw error;
  }
};
