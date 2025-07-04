
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

    // --- Define Colors & Fonts ---
    const primaryColor = [254, 145, 22]; // Orange from ArthaVidhi theme hsl(32 100% 50%) -> #fe9116
    const textColor = [38, 38, 38]; // #262626
    const mutedTextColor = [115, 115, 115]; // #737373
    const headerBgColor = [252, 243, 232]; // Muted background from theme
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let y = 20;

    // --- Header Section ---
    
    // Logo
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("ArthaVidhi", margin, y);

    // Invoice Title
    doc.setFontSize(26);
    doc.text("INVOICE", pageWidth - margin, y, { align: 'right' });
    y += 7;
    
    // Company Name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(company?.name || "Your Company Name", margin, y);
    
    // Invoice Number
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(`# ${bill.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });
    y += 6;

    // Company Details
    doc.setFontSize(9);
    doc.text(company?.address || "Company Address", margin, y);
    y += 5;
    const phoneEmail = `Phone: ${company.phone || 'N/A'} | Email: ${company.email || 'N/A'}`;
    doc.text(phoneEmail, margin, y);
    y += 5;
    const panVat = `PAN: ${company.panNumber || 'N/A'} | VAT: ${company.vatNumber || 'N/A'}`;
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
    y += 15;

    // --- Items Table ---
    // Table Header
    doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    const itemColX = margin + 3;
    const qtyColX = itemColX + 80;
    const unitColX = qtyColX + 20;
    const rateColX = unitColX + 25;
    const amountColX = pageWidth - margin - 3;
    
    doc.text("Item", itemColX, y);
    doc.text("Qty", qtyColX, y, { align: 'center'});
    doc.text("Unit", unitColX, y, { align: 'center'});
    doc.text("Rate", rateColX, y, { align: 'right'});
    doc.text("Amount", amountColX, y, { align: 'right' });
    y += 3;

    // Table Body
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    
    if (!bill.items || bill.items.length === 0) {
        y += 15;
        doc.setFontSize(10);
        doc.text("No items on this bill.", pageWidth / 2, y, { align: 'center' });
    } else {
        bill.items.forEach(item => {
            if (y > pageHeight - 60) {
                doc.addPage();
                y = 20;
            }
            y += 8;
            const itemTotal = item.quantity * item.rate;

            // Draw item row
            doc.text(item.description, itemColX, y, { maxWidth: 75 });
            doc.text(item.quantity.toString(), qtyColX, y, { align: 'center'});
            doc.text(item.unit, unitColX, y, { align: 'center'});
            doc.text(`Rs. ${item.rate.toFixed(2)}`, rateColX, y, { align: 'right'});
            doc.text(`Rs. ${itemTotal.toFixed(2)}`, amountColX, y, { align: 'right' });
        });
    }

    // --- Totals Section ---
    let totalsY = pageHeight - 80;
    if (y > totalsY) { // prevent totals from overlapping items
        totalsY = y + 15;
    }
    if (totalsY > pageHeight - 80) {
        doc.addPage();
        totalsY = 20;
    }
    
    const totalsX = pageWidth - margin;
    const totalsLabelX = totalsX - 80;
    
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
    
    doc.text("Subtotal after Discount", totalsLabelX, totalsY);
    doc.text(`Rs. ${totals.subtotalAfterDiscount.toFixed(2)}`, totalsX, totalsY, { align: 'right' });
    totalsY += 7;

    doc.text("VAT (13%)", totalsLabelX, totalsY);
    doc.text(`Rs. ${totals.vat.toFixed(2)}`, totalsX, totalsY, { align: 'right' });
    totalsY += 7;

    doc.line(totalsLabelX - 5, totalsY, totalsX, totalsY);
    totalsY += 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Total", totalsLabelX, totalsY);
    doc.text(`Rs. ${totals.total.toFixed(2)}`, totalsX, totalsY, { align: 'right' });
    
    // --- Footer Section ---
    let footerY = pageHeight - 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: 'center' });
    footerY += 4;
    doc.text("ArthaVidhi - Billing Software by Haitomns Groups", pageWidth / 2, footerY, { align: 'center' });

    // --- Save the PDF ---
    doc.save(`${bill.invoiceNumber}.pdf`);

  } catch (error) {
    console.error("Error generating PDF: ", error);
    alert("Failed to generate PDF. Please try again.");
    throw error;
  }
};
