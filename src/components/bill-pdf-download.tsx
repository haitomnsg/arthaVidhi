'use client';

import jsPDF from 'jspdf';

export const downloadTestPdf = () => {
  try {
    // Create a new PDF document
    const doc = new jsPDF();

    // Add "Hello World!" text to the document
    doc.text("Hello World!", 10, 10);

    // Save the PDF with the name "hello-world.pdf"
    doc.save("hello-world.pdf");

  } catch (error) {
    console.error("Error generating test PDF: ", error);
    alert("Failed to generate test PDF.");
  }
};
