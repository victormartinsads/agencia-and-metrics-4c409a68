import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Exporta um elemento HTML para PDF A4 multi-página.
 * Estratégia: rasteriza o elemento inteiro com html2canvas e fatia
 * a imagem em páginas A4, preservando o layout visto na tela.
 */
export async function exportDiagnosticoPDF(element: HTMLElement, filename: string) {
  // Rasteriza
  const canvas = await html2canvas(element, {
    backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();   // 210
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
