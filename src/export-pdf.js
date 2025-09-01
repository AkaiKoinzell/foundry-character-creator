import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";

export async function generateRecapPdf(state) {
  const existingPdfBytes = await fetch("assets/PDF%20Sheet%20Empty.pdf").then((res) =>
    res.arrayBuffer()
  );
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const page = pdfDoc.getPages()[0];
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const classes = state.classes.reduce((acc, c) => {
    if (c.name) acc[c.name] = c.level || 0;
    return acc;
  }, {});

  const abilities = Object.entries(state.system.abilities || {}).reduce(
    (acc, [ab, obj]) => {
      acc[ab] = obj.value;
      return acc;
    },
    {}
  );

  const summary = {
    race: state.system.details.race,
    background: state.system.details.background,
    classes,
    feats: (state.feats || []).map((f) => f.name),
    skills: state.system.skills || [],
    abilities,
  };

  const lines = JSON.stringify(summary, null, 2).split("\n");
  lines.forEach((line, i) => {
    page.drawText(line, {
      x: 50,
      y: height - 50 - i * 14,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
  });

  const pdfBytes = await pdfDoc.save();
  saveAs(
    new Blob([pdfBytes], { type: "application/pdf" }),
    `${state.name || "character"}.pdf`
  );
}

