'use client';

import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { Company } from '@prisma/client';

type BillFormValues = {
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  panNumber?: string;
  billDate: Date;
  dueDate: Date;
  items: {
    description: string;
    quantity: number;
    unit: string;
    rate: number;
  }[];
  discountType: 'percentage' | 'amount';
  discountPercentage?: number;
  discountAmount?: number;
};

export interface PDFData {
    bill: BillFormValues;
    company: Partial<Company>;
    subtotal: number;
    discount: number;
    vat: number;
    total: number;
    invoiceNumber: string;
    appliedDiscountLabel: string;
}

const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    padding: 30,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FF8703',
  },
  companyDetails: {
    flexDirection: 'column',
    flexShrink: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8703',
  },
  companyInfo: {
    fontSize: 10,
    color: '#4A4A4A'
  },
  invoiceTitleSection: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8703',
  },
  invoiceNumber: {
    fontSize: 10,
    color: '#4A4A4A',
  },
  billDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  billTo: {
    flexDirection: 'column',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333'
  },
  clientName: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  clientInfo: {
    fontSize: 10,
    color: '#4A4A4A',
  },
  dates: {
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  dateText: {
    fontSize: 10,
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row"
  },
  tableHeader: {
    backgroundColor: '#F2E0D1',
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: '#F2E0D1',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColHeaderDesc: { width: '40%', padding: 5, fontWeight: 'bold', fontSize: 10, textAlign: 'left'},
  tableColHeaderQty: { width: '10%', padding: 5, fontWeight: 'bold', fontSize: 10, textAlign: 'right'},
  tableColHeaderUnit: { width: '10%', padding: 5, fontWeight: 'bold', fontSize: 10, textAlign: 'right'},
  tableColHeaderRate: { width: '20%', padding: 5, fontWeight: 'bold', fontSize: 10, textAlign: 'right'},
  tableColHeaderAmount: { width: '20%', padding: 5, fontWeight: 'bold', fontSize: 10, textAlign: 'right'},
  tableCell: {
    padding: 5,
    fontSize: 10,
  },
  tableCellDesc: { width: '40%', textAlign: 'left' },
  tableCellQty: { width: '10%', textAlign: 'right' },
  tableCellUnit: { width: '10%', textAlign: 'right' },
  tableCellRate: { width: '20%', textAlign: 'right' },
  tableCellAmount: { width: '20%', textAlign: 'right' },
  tableBodyRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  summary: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  summaryContainer: {
    width: '40%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#4A4A4A',
  },
  summaryValue: {
    fontSize: 10,
    textAlign: 'right',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 5,
  },
  summaryTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF8703'
  },
  summaryTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF8703',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 9,
    color: '#888888',
  }
});


const BillPDFDocument = ({ bill, company, subtotal, discount, vat, total, invoiceNumber, appliedDiscountLabel }: PDFData) => {
    const formattedDate = bill.billDate ? format(bill.billDate, "PPP") : 'N/A';
    const formattedDueDate = bill.dueDate ? format(bill.dueDate, "PPP") : formattedDate;
    const subtotalAfterDiscount = subtotal - discount;

    return (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                <View style={pdfStyles.header}>
                    <View style={pdfStyles.companyDetails}>
                        <Text style={pdfStyles.companyName}>{String(company.name || "Your Company Name")}</Text>
                        <Text style={pdfStyles.companyInfo}>{String(company.address || "123 Business Rd, Kathmandu")}</Text>
                        <Text style={pdfStyles.companyInfo}>{`Phone: ${String(company.phone || "N/A")} | Email: ${String(company.email || "N/A")}`}</Text>
                        <Text style={pdfStyles.companyInfo}>{`PAN: ${String(company.panNumber || "N/A")}${company.vatNumber ? ` | VAT: ${company.vatNumber}` : ''}`}</Text>
                    </View>
                    <View style={pdfStyles.invoiceTitleSection}>
                        <Text style={pdfStyles.invoiceTitle}>INVOICE</Text>
                        <Text style={pdfStyles.invoiceNumber}>{`#${String(invoiceNumber || 'INV-000')}`}</Text>
                    </View>
                </View>

                <View style={pdfStyles.billDetails}>
                    <View style={pdfStyles.billTo}>
                        <Text style={pdfStyles.sectionTitle}>Bill To:</Text>
                        <Text style={pdfStyles.clientName}>{String(bill.clientName || 'Client Name')}</Text>
                        <Text style={pdfStyles.clientInfo}>{String(bill.clientAddress || 'Client Address')}</Text>
                        <Text style={pdfStyles.clientInfo}>{String(bill.clientPhone || 'Client Phone')}</Text>
                        {bill.panNumber ? <Text style={pdfStyles.clientInfo}>{`PAN: ${bill.panNumber}`}</Text> : null}
                    </View>
                    <View style={pdfStyles.dates}>
                        <Text style={pdfStyles.dateText}>{`Bill Date: ${formattedDate}`}</Text>
                        <Text style={pdfStyles.dateText}>{`Due Date: ${formattedDueDate}`}</Text>
                    </View>
                </View>

                <View style={pdfStyles.table}>
                    <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
                        <Text style={pdfStyles.tableColHeaderDesc}>Description</Text>
                        <Text style={pdfStyles.tableColHeaderQty}>Qty</Text>
                        <Text style={pdfStyles.tableColHeaderUnit}>Unit</Text>
                        <Text style={pdfStyles.tableColHeaderRate}>Rate (Rs.)</Text>
                        <Text style={pdfStyles.tableColHeaderAmount}>Amount (Rs.)</Text>
                    </View>
                    {(bill.items || []).map((item, index) => (
                        <View key={index} style={[pdfStyles.tableRow, pdfStyles.tableBodyRow]}>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellDesc]}>{String(item.description || '')}</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellQty]}>{String(item.quantity || 0)}</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellUnit]}>{String(item.unit || '')}</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellRate]}>{(Number(item.rate) || 0).toFixed(2)}</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellAmount]}>{((Number(item.quantity) || 0) * (Number(item.rate) || 0)).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                <View style={pdfStyles.summary}>
                    <View style={pdfStyles.summaryContainer}>
                        <View style={pdfStyles.summaryRow}>
                            <Text style={pdfStyles.summaryLabel}>Subtotal</Text>
                            <Text style={pdfStyles.summaryValue}>{`Rs. ${subtotal.toFixed(2)}`}</Text>
                        </View>
                        <View style={pdfStyles.summaryRow}>
                            <Text style={pdfStyles.summaryLabel}>{appliedDiscountLabel}</Text>
                            <Text style={pdfStyles.summaryValue}>{`- Rs. ${discount.toFixed(2)}`}</Text>
                        </View>
                        <View style={pdfStyles.summaryRow}>
                            <Text style={pdfStyles.summaryLabel}>Subtotal after Discount</Text>
                            <Text style={pdfStyles.summaryValue}>{`Rs. ${subtotalAfterDiscount.toFixed(2)}`}</Text>
                        </View>
                        <View style={pdfStyles.summaryRow}>
                            <Text style={pdfStyles.summaryLabel}>VAT (13%)</Text>
                            <Text style={pdfStyles.summaryValue}>{`Rs. ${vat.toFixed(2)}`}</Text>
                        </View>
                        <View style={pdfStyles.summaryTotalRow}>
                            <Text style={pdfStyles.summaryTotalLabel}>Total</Text>
                            <Text style={pdfStyles.summaryTotalValue}>{`Rs. ${total.toFixed(2)}`}</Text>
                        </View>
                    </View>
                </View>

                <Text style={pdfStyles.footer}>Thank you for your business! | ArthaVidhi by Haitomns Groups</Text>
            </Page>
        </Document>
    )
};


export const generateAndDownloadPdf = async (data: PDFData): Promise<boolean> => {
    const safeData: PDFData = {
        invoiceNumber: String(data.invoiceNumber || 'INV-0000'),
        appliedDiscountLabel: String(data.appliedDiscountLabel || 'Discount'),
        subtotal: Number(data.subtotal || 0),
        discount: Number(data.discount || 0),
        vat: Number(data.vat || 0),
        total: Number(data.total || 0),
        company: {
            name: String(data.company?.name || 'Your Company'),
            address: String(data.company?.address || ''),
            phone: String(data.company?.phone || ''),
            email: String(data.company?.email || ''),
            panNumber: String(data.company?.panNumber || ''),
            vatNumber: String(data.company?.vatNumber || ''),
        },
        bill: {
            clientName: String(data.bill?.clientName || 'Client Name'),
            clientAddress: String(data.bill?.clientAddress || ''),
            clientPhone: String(data.bill?.clientPhone || ''),
            panNumber: String(data.bill?.panNumber || ''),
            billDate: data.bill?.billDate instanceof Date ? data.bill.billDate : new Date(),
            dueDate: data.bill?.dueDate instanceof Date ? data.bill.dueDate : new Date(),
            discountType: data.bill?.discountType || 'amount',
            discountAmount: Number(data.bill?.discountAmount || 0),
            discountPercentage: Number(data.bill?.discountPercentage || 0),
            items: (data.bill?.items || []).map(item => ({
                description: String(item.description || ''),
                quantity: Number(item.quantity || 0),
                unit: String(item.unit || ''),
                rate: Number(item.rate || 0),
            })),
        }
    };

    try {
        const doc = <BillPDFDocument {...safeData} />;
        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeData.invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        return true;

    } catch (error) {
        console.error("Error generating PDF: ", error);
        alert("Failed to generate PDF. Please try again.");
        return false;
    }
};
