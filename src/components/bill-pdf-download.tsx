'use client';

import jsPDF from 'jspdf';
import { format } from 'date-fns';

// Define types locally since Prisma types are removed
interface Company {
    id: number;
    userId: number;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    panNumber: string | null;
    vatNumber: string | null;
}

// This matches the data structure returned by the `createBill` server action
interface BillPdfData {
    bill: {
        id: number;
        invoiceNumber: string;
        clientName: string;
        clientAddress: string;
        clientPhone: string;
        clientPanNumber: string | null;
        billDate: Date;
        dueDate: Date;
        discount: number;
        status: string;
        items: {
            id: number;
            description: string;
            quantity: number;
            unit: string;
            rate: number | string; // Can be string from DB
        }[];
    };
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

    // --- Define Colors & Fonts ---
    const primaryColor = [255, 135, 3]; // #FF8703
    const textColor = [38, 38, 38]; // #262626
    const mutedTextColor = [115, 115, 115]; // #737373
    const headerBgColor = [252, 243, 232]; // Muted background
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let y = 20;

    // --- Header Section ---
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("ArthaVidhi", margin, y);

    doc.setFontSize(26);
    doc.text("INVOICE", pageWidth - margin, y, { align: 'right' });
    y += 7;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(company?.name || "Your Company Name", margin, y);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(`# ${bill.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });
    y += 6;

    doc.setFontSize(9);
    doc.text(company?.address || "Company Address", margin, y);
    y += 5;
    const phoneEmail = `Phone: ${company?.phone || 'N/A'} | Email: ${company?.email || 'N/A'}`;
    doc.text(phoneEmail, margin, y);
    y += 5;
    const panVat = `PAN: ${company?.panNumber || 'N/A'} | VAT: ${company?.vatNumber || 'N/A'}`;
    doc.text(panVat, margin, y);
    y += 15;

    // --- Bill To & Dates Section ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("Bill To:", margin, y);

    const billDateX = pageWidth - margin - 50;
    doc.text("Bill Date:", billDateX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(format(new Date(bill.billDate), "PPP"), pageWidth - margin, y, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(bill.clientName, margin, y);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("Due Date:", billDateX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(format(new Date(bill.dueDate), "PPP"), pageWidth - margin, y, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(bill.clientAddress, margin, y);
    y += 6;
    doc.text(bill.clientPhone, margin, y);
    y += 6;
    if (bill.clientPanNumber) {
        doc.text(`PAN: ${bill.clientPanNumber}`, margin, y);
    }
    y += 15;

    // --- Items Table ---
    doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    doc.text("Item", margin + 3, y);
    doc.text("Qty", 115, y, { align: 'center' });
    doc.text("Unit", 135, y, { align: 'center' });
    doc.text("Rate", 160, y, { align: 'right' });
    doc.text("Amount", 195, y, { align: 'right' });
    y += 3;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    
    bill.items.forEach(item => {
        const rateAsNumber = Number(item.rate);
        const itemTotal = item.quantity * rateAsNumber;
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
        doc.text(item.description, margin + 3, y, { maxWidth: 90 });
        doc.text(item.quantity.toString(), 115, y, { align: 'center' });
        doc.text(item.unit, 135, y, { align: 'center' });
        doc.text(`Rs. ${rateAsNumber.toFixed(2)}`, 160, y, { align: 'right' });
        doc.text(`Rs. ${itemTotal.toFixed(2)}`, 195, y, { align: 'right' });
        y += 2;
    });
    doc.line(margin, y, pageWidth - margin, y);
    y += 10; // Margin after the table

    // --- Totals Section ---
    const totalsBlockHeight = 50; // Estimated height for totals section
    if (y + totalsBlockHeight > pageHeight - 25) { // Check if it fits on the page (25 is margin for footer)
      doc.addPage();
      y = 20; // Reset to top if new page is added
    }

    const totalsX = pageWidth - margin;
    const totalsLabelX = totalsX - 80;
    let totalsY = y;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    
    doc.text("Subtotal", totalsLabelX, totalsY);
    doc.text(`Rs. ${totals.subtotal.toFixed(2)}`, totalsX, totalsY, { align: 'right' });
    totalsY += 7;

    doc.text(totals.appliedDiscountLabel, totalsLabelX, totalsY);
    doc.text(`- Rs. ${totals.discount.toFixed(2)}`, totalsX, totalsY, { align: 'right' });
    totalsY += 7;

    doc.setLineWidth(0.2);
    doc.line(totalsLabelX - 5, totalsY, totalsX, totalsY);
    totalsY += 7;
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("Subtotal after Discount", totalsLabelX, totalsY);
    doc.text(`Rs. ${totals.subtotalAfterDiscount.toFixed(2)}`, totalsX, totalsY, { align: 'right' });
    totalsY += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text("VAT (13%)", totalsLabelX, totalsY);
    doc.text(`Rs. ${totals.vat.toFixed(2)}`, totalsX, totalsY, { align: 'right' });
    totalsY += 7;

    doc.setLineWidth(0.2);
    doc.line(totalsLabelX - 5, totalsY, totalsX, totalsY);
    totalsY += 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Total", totalsLabelX, totalsY);
    doc.text(`Rs. ${totals.total.toFixed(2)}`, totalsX, totalsY, { align: 'right' });
    
    // --- Footer Section ---
    const footerY = pageHeight - 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: 'center' });
    doc.text("ArthaVidhi - Billing Software by Haitomns Groups", pageWidth / 2, footerY + 4, { align: 'center' });

    // --- Save the PDF ---
    doc.save(`${bill.invoiceNumber}.pdf`);

  } catch (error) {
    console.error("Error generating PDF: ", error);
    // Use a user-friendly toast or alert in a real app
    alert("Failed to generate PDF. Please try again.");
    throw error;
  }
};
