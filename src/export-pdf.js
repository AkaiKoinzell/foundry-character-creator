let html2CanvasLoader;
let jsPdfLoader;

async function loadHtml2Canvas() {
  if (typeof window === 'undefined') {
    return async () => {
      throw new Error('html2canvas is not available in this environment');
    };
  }
  if (window.html2canvas) return window.html2canvas;
  if (!html2CanvasLoader) {
    html2CanvasLoader = import(
      'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js'
    ).then((mod) => mod.default || mod);
  }
  return html2CanvasLoader;
}
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

  const html2canvas = await loadHtml2Canvas();
  const pxPerMm = 96 / 25.4;
  const a4WidthPx = Math.round(210 * pxPerMm);
  const sectionsToExpand = Array.from(
    sheet.querySelectorAll(
      ".features, .spells, .backstory, .equipment, .infusions"
    )
  );
  const minHeightFractions = {
    features: 0.35,
    spells: 0.28,
    backstory: 0.5,
  };
  const textAreas = Array.from(sheet.querySelectorAll("textarea"));
  const optionalEmptySections = Array.from(
    sheet.querySelectorAll(".equipment, .infusions")
  );
  const languagesSection = sheet.querySelector(".tools-languages");
  const spellsSection = sheet.querySelector(".spells");
  const backstorySection = sheet.querySelector(".backstory");
  const equipmentSection = sheet.querySelector(".equipment");
  const infusionsSection = sheet.querySelector(".infusions");
  const featuresSection = sheet.querySelector(".features");

  const revertActions = [];

  const rememberStyle = (el, props) => {
    const prev = props.reduce((acc, prop) => {
      acc[prop] = el.style[prop];
      return acc;
    }, {});
    revertActions.push(() => {
      props.forEach((prop) => {
        el.style[prop] = prev[prop];
      });
    });
  };

  rememberStyle(sheet, [
    "width",
    "maxWidth",
    "minHeight",
    "height",
    "gridTemplateRows",
    "gridTemplateColumns",
    "gridTemplateAreas",
    "gap",
  ]);
  sheet.style.width = `${a4WidthPx}px`;
  sheet.style.maxWidth = "unset";
  const a4HeightPx = Math.round(297 * pxPerMm);
  sheet.style.minHeight = `${a4HeightPx}px`;
  sheet.style.height = `${a4HeightPx}px`;
  sheet.style.gridTemplateRows = "auto 1fr 1fr auto 2fr";
  sheet.style.gridTemplateColumns = "0.9fr 1.1fr 1.6fr";
  sheet.style.gap = "16px";

  sectionsToExpand.forEach((section) => {
    rememberStyle(section, ["height", "minHeight", "maxHeight", "overflow"]);
    section.style.height = "auto";
    const baseHeight = section.scrollHeight;
    const cls = Array.from(section.classList).find((name) =>
      Object.prototype.hasOwnProperty.call(minHeightFractions, name)
    );
    const boostedHeight = cls
      ? Math.max(baseHeight, Math.round(a4HeightPx * minHeightFractions[cls]))
      : baseHeight;
    section.style.minHeight = `${boostedHeight}px`;
    section.style.maxHeight = "none";
    section.style.overflow = "visible";
  });

  textAreas.forEach((area) => {
    rememberStyle(area, [
      "height",
      "overflow",
      "resize",
      "border",
      "background",
      "padding",
      "whiteSpace",
      "width",
    ]);
    area.style.overflow = "hidden";
    area.style.resize = "none";
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
    area.style.border = "none";
    area.style.background = "transparent";
    area.style.padding = "0";
    area.style.whiteSpace = "pre-wrap";
    area.style.width = "100%";
  });

  optionalEmptySections.forEach((section) => {
    if (!section.textContent.trim()) {
      rememberStyle(section, ["display"]);
      section.style.display = "none";
    }
  });

  [languagesSection, spellsSection].forEach((section) => {
    if (!section) return;
    rememberStyle(section, ["alignSelf"]);
    section.style.alignSelf = "start";
  });

  if (backstorySection) {
    rememberStyle(backstorySection, ["alignSelf", "minHeight"]);
    backstorySection.style.alignSelf = "stretch";
    const currentMin = parseFloat(backstorySection.style.minHeight) || 0;
    const minPx = Math.max(
      currentMin,
      Math.round(a4HeightPx * (minHeightFractions.backstory || 0.45))
    );
    backstorySection.style.minHeight = `${minPx}px`;
  }

  const hasEquipment = Boolean(
    equipmentSection && equipmentSection.style.display !== "none" && equipmentSection.textContent.trim()
  );
  const hasInfusions = Boolean(
    infusionsSection && infusionsSection.style.display !== "none" && infusionsSection.textContent.trim()
  );

  if (infusionsSection) {
    rememberStyle(infusionsSection, ["gridArea"]);
    infusionsSection.style.gridArea = "infusions";
  }

  if (featuresSection) {
    rememberStyle(featuresSection, ["gridRow"]);
    if (!hasEquipment && !hasInfusions) {
      featuresSection.style.gridRow = "2 / span 2";
    } else {
      featuresSection.style.gridRow = "auto";
    }
  }

  const midRow = hasEquipment
    ? '"abilities skills equipment"'
    : hasInfusions
    ? '"abilities skills infusions"'
    : '"abilities skills features"';
  const hasToolsLanguages = Boolean(
    languagesSection &&
    languagesSection.style.display !== "none" &&
    languagesSection.textContent.trim()
  );
  const tlRow = hasToolsLanguages
    ? '"tools-languages spells spells"'
    : '"spells spells spells"';
  const templateRows = [
    '"header header header"',
    '"abilities skills features"',
    midRow,
    tlRow,
    '"backstory backstory backstory"',
  ];
  sheet.style.gridTemplateAreas = templateRows.join(" ");

  const scale =
    typeof window !== "undefined" && window.devicePixelRatio
      ? Math.max(1, Math.min(window.devicePixelRatio, 3))
      : 2;

  const trimCanvasWhitespace = (sourceCanvas) => {
    const ctx = sourceCanvas.getContext("2d");
    const { width, height } = sourceCanvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    const rowEmpty = (y) => {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] === 0) continue;
        if (data[idx] < 250 || data[idx + 1] < 250 || data[idx + 2] < 250) {
          return false;
        }
      }
      return true;
    };

    const colEmpty = (x) => {
      for (let y = 0; y < height; y += 1) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] === 0) continue;
        if (data[idx] < 250 || data[idx + 1] < 250 || data[idx + 2] < 250) {
          return false;
        }
      }
      return true;
    };

    let top = 0;
    while (top < height && rowEmpty(top)) top += 1;
    let bottom = height - 1;
    while (bottom > top && rowEmpty(bottom)) bottom -= 1;
    let left = 0;
    while (left < width && colEmpty(left)) left += 1;
    let right = width - 1;
    while (right > left && colEmpty(right)) right -= 1;

    if (top === 0 && left === 0 && bottom === height - 1 && right === width - 1) {
      return sourceCanvas;
    }

    const padding = Math.max(0, Math.round(6 * scale));
    top = Math.max(0, top - padding);
    left = Math.max(0, left - padding);
    bottom = Math.min(height - 1, bottom + padding);
    right = Math.min(width - 1, right + padding);

    const trimmedWidth = right - left + 1;
    const trimmedHeight = bottom - top + 1;
    const trimmedCanvas = document.createElement("canvas");
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;
    const trimmedCtx = trimmedCanvas.getContext("2d");
    const cropped = ctx.getImageData(left, top, trimmedWidth, trimmedHeight);
    trimmedCtx.putImageData(cropped, 0, 0);
    return trimmedCanvas;
  };

  let canvas;
  try {
    canvas = await html2canvas(sheet, { scale });
    canvas = trimCanvasWhitespace(canvas);
  } finally {
    revertActions.reverse().forEach((revert) => revert());
  }

  const imgData = canvas.toDataURL("image/jpeg", 0.9);
  const jsPDF = await loadJsPDF();
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const sheetWidthMm = (canvas.width / scale) / pxPerMm;
  const sheetHeightMm = (canvas.height / scale) / pxPerMm;

  const pageMarginMm = 6;
  const targetWidth = pageWidth - pageMarginMm * 2;
  const targetHeight = pageHeight - pageMarginMm * 2;

  const scaleFactor = Math.min(
    targetWidth / sheetWidthMm,
    targetHeight / sheetHeightMm
  );

  const imgWidth = sheetWidthMm * scaleFactor;
  const imgHeight = sheetHeightMm * scaleFactor;
  const offsetX = (pageWidth - imgWidth) / 2;
  const offsetY = (pageHeight - imgHeight) / 2;

  pdf.addImage(imgData, "JPEG", offsetX, offsetY, imgWidth, imgHeight);
  pdf.save(`${state?.name || "character"}.pdf`);
}

export default exportPdf;
