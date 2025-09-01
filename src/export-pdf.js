import html2canvas from "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js";
let jsPdfLoader;
/**
 * Lazy-load the jsPDF library using a UMD build that exposes a global.
 * This avoids importing the ESM build which relies on bare module
 * specifiers like "@babel/runtime" that the browser cannot resolve
 * without a bundler.
 */
async function loadJsPDF() {
  if (globalThis.jspdf?.jsPDF) return globalThis.jspdf.jsPDF;
  if (!jsPdfLoader) {
    jsPdfLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
      script.onload = () => resolve(globalThis.jspdf.jsPDF);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return jsPdfLoader;
}

export async function exportPdf(state) {
  const sheet = document.getElementById("characterSheet");
  if (!sheet) throw new Error("Character sheet not found");

  const canvas = await html2canvas(sheet, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");
  const jsPDF = await loadJsPDF();
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  pdf.save(`${state?.name || "character"}.pdf`);
}

export default exportPdf;
