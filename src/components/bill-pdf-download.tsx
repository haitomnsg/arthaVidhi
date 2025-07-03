'use client';

import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF'
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1
  }
});

const MyDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text>Hello World!</Text>
      </View>
    </Page>
  </Document>
);

export const downloadTestPdf = async () => {
  try {
    const doc = <MyDocument />;
    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hello-world.pdf';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);

  } catch (error) {
    console.error("Error generating test PDF: ", error);
    alert("Failed to generate test PDF.");
  }
};
