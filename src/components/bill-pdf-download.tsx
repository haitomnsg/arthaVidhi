
'use client';

import React, { useEffect, useRef } from 'react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { Company } from '@prisma/client';

// Define a local version of the form values type to avoid dependency loops
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
  discount?: number;
};

export interface PDFData {
    bill: BillFormValues;
    company: Partial<Company>;
    subtotal: number;
    discount: number;
    vat: number;
    total: number;
    invoiceNumber: string;
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
  tableColHeader: {
    width: '20%',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableColHeaderDesc: {
    width: '40%',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableCell: {
    padding: 5,
    fontSize: 10,
  },
  tableCellDesc: {
    width: '40%',
  },
  tableCellOther: {
    width: '20%',
    textAlign: 'right'
  },
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


const BillPDFDocument = ({ bill, company, subtotal, discount, vat, total, invoiceNumber }: PDFData) => {
    const formattedDate = bill.billDate ? format(bill.billDate, "PPP") : 'N/A';
    const formattedDueDate = bill.dueDate ? format(bill.dueDate, "PPP") : formattedDate;

    return (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                <View style={pdfStyles.header}>
                    <View style={pdfStyles.companyDetails}>
                        <Text style={pdfStyles.companyName}>{company.name}</Text>
                        <Text style={pdfStyles.companyInfo}>{company.address}</Text>
                        <Text style={pdfStyles.companyInfo}>Phone: {company.phone} | Email: {company.email}</Text>
                        <Text style={pdfStyles.companyInfo}>PAN: {company.panNumber} | VAT: {company.vatNumber}</Text>
                    </View>
                    <View style={pdfStyles.invoiceTitleSection}>
                        <Text style={pdfStyles.invoiceTitle}>INVOICE</Text>
                        <Text style={pdfStyles.invoiceNumber}>#{invoiceNumber}</Text>
                    </View>
                </View>

                <View style={pdfStyles.billDetails}>
                    <View style={pdfStyles.billTo}>
                        <Text style={pdfStyles.sectionTitle}>Bill To:</Text>
                        <Text style={pdfStyles.clientName}>{bill.clientName}</Text>
                        <Text style={pdfStyles.clientInfo}>{bill.clientAddress}</Text>
                        <Text style={pdfStyles.clientInfo}>{bill.clientPhone}</Text>
                        {bill.panNumber && <Text style={pdfStyles.clientInfo}>PAN: {bill.panNumber}</Text>}
                    </View>
                    <View style={pdfStyles.dates}>
                        <Text style={pdfStyles.dateText}>Bill Date: {formattedDate}</Text>
                        <Text style={pdfStyles.dateText}>Due Date: {formattedDueDate}</Text>
                    </View>
                </View>

                <View style={pdfStyles.table}>
                    <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
                        <Text style={pdfStyles.tableColHeaderDesc}>Description</Text>
                        <Text style={[pdfStyles.tableColHeader, {textAlign: 'right'}]}>Quantity</Text>
                        <Text style={[pdfStyles.tableColHeader, {textAlign: 'right'}]}>Rate (Rs.)</Text>
                        <Text style={[pdfStyles.tableColHeader, {textAlign: 'right'}]}>Amount (Rs.)</Text>
                    </View>
                    {bill.items.map((item, index) => (
                        <View key={index} style={[pdfStyles.tableRow, pdfStyles.tableBodyRow]}>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellDesc]}>{item.description}</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellOther]}>{item.quantity} {item.unit}</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellOther]}>{(Number(item.rate) || 0).toFixed(2)}</Text>
                            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellOther]}>{((Number(item.quantity) || 0) * (Number(item.rate) || 0)).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                <View style={pdfStyles.summary}>
                    <View style={pdfStyles.summaryContainer}>
                        <View style={pdfStyles.summaryRow}>
                            <Text style={pdfStyles.summaryLabel}>Subtotal</Text>
                            <Text style={pdfStyles.summaryValue}>Rs. {subtotal.toFixed(2)}</Text>
                        </View>
                        <View style={pdfStyles.summaryRow}>
                            <Text style={pdfStyles.summaryLabel}>Discount</Text>
                            <Text style={pdfStyles.summaryValue}>- Rs. {discount.toFixed(2)}</Text>
                        </View>
                        <View style={pdfStyles.summaryRow}>
                            <Text style={pdfStyles.summaryLabel}>Subtotal after Discount</Text>
                            <Text style={pdfStyles.summaryValue}>Rs. {(subtotal - discount).toFixed(2)}</Text>
                        </View>
                        <View style={pdfStyles.summaryRow}>
                            <Text style={pdfStyles.summaryLabel}>VAT (13%)</Text>
                            <Text style={pdfStyles.summaryValue}>Rs. {vat.toFixed(2)}</Text>
                        </View>
                        <View style={pdfStyles.summaryTotalRow}>
                            <Text style={pdfStyles.summaryTotalLabel}>Total</Text>
                            <Text style={pdfStyles.summaryTotalValue}>Rs. {total.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                <Text style={pdfStyles.footer}>Thank you for your business! | ArthaVidhi by Haitomns Groups</Text>
            </Page>
        </Document>
    )
};


export const BillPDFGenerator = ({ data, onComplete }: { data: PDFData; onComplete: () => void }) => {
    const downloadLinkRef = useRef<HTMLAnchorElement & { click: () => void }>(null);

    useEffect(() => {
        if (downloadLinkRef.current) {
          const timer = setTimeout(() => {
            downloadLinkRef.current?.click();
            onComplete();
          }, 500);
          return () => clearTimeout(timer);
        }
    }, [onComplete]);

    return (
        <PDFDownloadLink
            document={<BillPDFDocument {...data} />}
            fileName={`${data.invoiceNumber}.pdf`}
            ref={downloadLinkRef as any}
            style={{ display: "none" }}
        >
            {({loading}) => (loading ? 'Loading...' : 'Download')}
        </PDFDownloadLink>
    );
}
