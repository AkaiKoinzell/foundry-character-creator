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
  const a4HeightPx = Math.round(297 * pxPerMm);

  const sectionsToExpand = Array.from(
    sheet.querySelectorAll(
      ".features, .spells, .backstory, .equipment, .infusions"
    )
  );
  const minHeightFractions = {};
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
    "alignItems",
  ]);

  sheet.classList.add('compact');
  sheet.style.width = `${a4WidthPx}px`;
  sheet.style.maxWidth = "unset";
  
  // --- NEW STRATEGY ---
  // Let height be determined by content to prevent clipping.
  // The PDF generation logic will handle scaling or creating multiple pages.
  sheet.style.minHeight = "unset";
  sheet.style.height = "auto";
  sheet.style.alignItems = 'stretch';

  // --- REPLICATE TARGET LAYOUT ---
  // This layout structure is taken directly from your desired screenshot.
  sheet.style.gridTemplateColumns = "0.9fr 1.1fr 1.6fr"; // 3-column layout
  sheet.style.gridTemplateRows = "auto auto auto auto auto"; // 5 rows, sized by content
  sheet.style.gridTemplateAreas = [
    '"header header header"',
    '"abilities skills features"',
    '"abilities skills equipment"', // Equipment is now included
    '"tools-languages spells spells"',
    '"backstory backstory backstory"',
  ].join(' ');
  sheet.style.gap = "16px";

  // --- NEW ---
  // Tweak header items to prevent wrapping on export
  const header = sheet.querySelector(".char-header");
  if (header) {
      rememberStyle(header, ['flexWrap']);
      header.style.flexWrap = 'nowrap';
  }
  // --- END NEW ---


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

  const restoreTextareas = [];
  textAreas.forEach((area) => {
    const cs = window.getComputedStyle(area);
    const placeholder = document.createElement('div');
    placeholder.className = 'textarea-render';
    placeholder.textContent = area.value || '';
    placeholder.style.whiteSpace = 'pre-wrap';
    placeholder.style.wordWrap = 'break-word';
    placeholder.style.width = '100%';
    let minHeight = area.scrollHeight || area.clientHeight || 0;
    const isBackstory = area.closest('.backstory') != null || area.id === 'backstoryInput';
    // Give backstory a minimum height to help fill the page vertically
    if (isBackstory) {
      minHeight = Math.max(minHeight, 200); 
    }
    placeholder.style.minHeight = `${minHeight}px`;
    placeholder.style.border = 'none';
    placeholder.style.background = 'transparent';
    placeholder.style.padding = '0';
    placeholder.style.margin = '0';
    placeholder.style.fontFamily = cs.fontFamily;
    placeholder.style.fontSize = cs.fontSize;
    placeholder.style.lineHeight = '1.2';
    placeholder.style.color = cs.color;
    
    // --- REMOVED ---
    // The following block was removed to prevent the backstory from splitting into two columns.
    /*
    try {
      const isBackstory = area.closest('.backstory') != null || area.id === 'backstoryInput';
      if (isBackstory && (area.value?.length || 0) > 500) {
        placeholder.style.columnCount = '2';
        placeholder.style.columnGap = '12px';
      }
    } catch (_) { }
    */

    area.insertAdjacentElement('afterend', placeholder);
    rememberStyle(area, ["display"]);
    area.style.display = 'none';
    restoreTextareas.push(() => {
      placeholder.remove();
      area.style.display = '';
    });
  });
  revertActions.push(() => restoreTextareas.forEach((fn) => fn()))

  // This loop will correctly hide equipment or infusions if they are empty,
  // so we no longer need to hide them forcefully.
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
  
  // Ensure each top-level child has an explicit grid-area set.
  // This makes the layout more robust.
  Array.from(sheet.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    const cl = child.classList;
    const area = cl.contains('char-header') ? 'header'
      : cl.contains('abilities') ? 'abilities'
      : cl.contains('skills') ? 'skills'
      : cl.contains('features') ? 'features'
      : cl.contains('equipment') ? 'equipment'
      : cl.contains('tools-languages') ? 'tools-languages'
      : cl.contains('spells') ? 'spells'
      : cl.contains('backstory') ? 'backstory'
      : cl.contains('infusions') ? 'infusions'
      : '';
    if (area) {
        rememberStyle(child, ['gridArea']);
        child.style.gridArea = area;
    }
  });


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
    sheet.classList.remove('compact');
    revertActions.reverse().forEach((revert) => revert());
  }

  const imgData = canvas.toDataURL("image/jpeg", 0.9);
  const jsPDF = await loadJsPDF();
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const sheetWidthMm = (canvas.width / scale) / pxPerMm;
  const sheetHeightMm = (canvas.height / scale) / pxPerMm;

  const pageMarginMm = 2;
  const targetWidth = pageWidth - pageMarginMm * 2;
  const targetHeight = pageHeight - pageMarginMm * 2;

  const scaleToWidth = targetWidth / sheetWidthMm;
  const scaleToHeight = targetHeight / sheetHeightMm;
  const fitScale = Math.min(scaleToWidth, scaleToHeight);
  const MIN_READABLE_SCALE = 0.55;

  if (fitScale >= MIN_READABLE_SCALE && sheetHeightMm * fitScale <= targetHeight) {
    const imgWidth = sheetWidthMm * fitScale;
    const imgHeight = sheetHeightMm * fitScale;
    const offsetX = (pageWidth - imgWidth) / 2;
    const offsetY = (pageHeight - imgHeight) / 2;
    pdf.addImage(imgData, "JPEG", offsetX, offsetY, imgWidth, imgHeight);
  } else {
    // Multi-page logic for content that is too tall to fit
    const widthScale = targetWidth / sheetWidthMm;
    const scaledHeightMm = sheetHeightMm * widthScale;
    const pages = Math.ceil(scaledHeightMm / targetHeight);
    const fullPageMm = targetHeight;
    const mmPerPxScaled = (scaledHeightMm) / canvas.height;
    let yPx = 0;
    for (let i = 0; i < pages; i += 1) {
      const remainingMm = scaledHeightMm - i * fullPageMm;
      const thisPageMm = Math.min(fullPageMm, remainingMm);
      const thisPagePx = Math.round(thisPageMm / mmPerPxScaled);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(thisPagePx, canvas.height - yPx);
      const ctx = pageCanvas.getContext('2d');
      ctx.drawImage(
        canvas,
        0, yPx, canvas.width, pageCanvas.height,
        0, 0, canvas.width, pageCanvas.height
      );
      yPx += pageCanvas.height;

      const pageImg = pageCanvas.toDataURL('image/jpeg', 0.9);
      pdf.addImage(pageImg, 'JPEG', pageMarginMm, pageMarginMm, targetWidth, thisPageMm);
      if (i < pages - 1) pdf.addPage();
    }
  }

  pdf.save(`${state?.name || "character"}.pdf`);
}

export default exportPdf;