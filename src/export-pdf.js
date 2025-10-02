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
  // Avoid enforcing large minimum heights that add whitespace.
  // We'll let content determine section height for a tighter layout.
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
  ]);
  // Apply compact styling only during export to reduce height and maximize scale
  sheet.classList.add('compact');
  sheet.style.width = `${a4WidthPx}px`;
  sheet.style.maxWidth = "unset";
  const a4HeightPx = Math.round(297 * pxPerMm);
  // Let height expand to fit content to avoid clipping during capture
  sheet.style.minHeight = "unset";
  sheet.style.height = "auto";
  // Fixed 4-column layout matching your design
  sheet.style.alignItems = 'stretch';
  sheet.style.gridTemplateRows = "auto auto auto auto auto";
  sheet.style.gridTemplateColumns = "0.9fr 0.35fr 0.75fr 1.6fr";
  sheet.style.gridTemplateAreas = [
    '"header header header header"',
    '"abilities skills skills features"',
    '"tools-languages tools-languages spells spells"',
    '"tools-languages tools-languages spells spells"',
    '"backstory backstory backstory backstory"',
  ].join(' ');
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

  // Replace textareas with plain elements for reliable rendering in html2canvas
  const restoreTextareas = [];
  textAreas.forEach((area) => {
    const cs = window.getComputedStyle(area);
    const placeholder = document.createElement('div');
    placeholder.className = 'textarea-render';
    placeholder.textContent = area.value || '';
    placeholder.style.whiteSpace = 'pre-wrap';
    placeholder.style.wordWrap = 'break-word';
    placeholder.style.width = '100%';
    placeholder.style.minHeight = `${area.scrollHeight || area.clientHeight || 0}px`;
    placeholder.style.border = 'none';
    placeholder.style.background = 'transparent';
    // Keep text dense to save vertical space in one-page export
    placeholder.style.padding = '0';
    placeholder.style.margin = '0';
    placeholder.style.fontFamily = cs.fontFamily;
    placeholder.style.fontSize = cs.fontSize;
    placeholder.style.lineHeight = '1.2';
    placeholder.style.color = cs.color;
    // If this is the backstory textarea and it's long, render in two columns
    try {
      const isBackstory = area.closest('.backstory') != null || area.id === 'backstoryInput';
      if (isBackstory && (area.value?.length || 0) > 500) {
        placeholder.style.columnCount = '2';
        placeholder.style.columnGap = '12px';
      }
    } catch (_) { /* ignore */ }
    area.insertAdjacentElement('afterend', placeholder);
    rememberStyle(area, ["display"]);
    area.style.display = 'none';
    restoreTextareas.push(() => {
      placeholder.remove();
      area.style.display = '';
    });
  });
  revertActions.push(() => restoreTextareas.forEach((fn) => fn()))

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
    backstorySection.style.alignSelf = "start";
    backstorySection.style.minHeight = "0";
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
    featuresSection.style.gridRow = "auto";
  }

  // Hide equipment/infusions to follow the requested layout
  if (equipmentSection) {
    rememberStyle(equipmentSection, ["display"]);
    equipmentSection.style.display = "none";
  }
  if (infusionsSection) {
    rememberStyle(infusionsSection, ["display"]);
    infusionsSection.style.display = "none";
  }

  // Abilities: two-column grid
  const abilityList = sheet.querySelector('.ability-list');
  if (abilityList) {
    rememberStyle(abilityList, ["display", "gridTemplateColumns", "gap", "justifyItems", "alignItems"]);
    abilityList.style.display = 'grid';
    abilityList.style.gridTemplateColumns = 'repeat(2, minmax(68px, 1fr))';
    abilityList.style.gap = '8px';
    abilityList.style.justifyItems = 'center';
    abilityList.style.alignItems = 'start';
  }

  // Skills: right padding and line height
  if (sheet.querySelector('.skills')) {
    const skills = sheet.querySelector('.skills');
    rememberStyle(skills, ["paddingRight"]);
    skills.style.paddingRight = '16px';
    const ul = skills.querySelector('ul');
    if (ul) {
      rememberStyle(ul, ["lineHeight", "paddingRight"]);
      ul.style.lineHeight = '1.3';
      ul.style.paddingRight = '4px';
    }
  }

  // Features / Tools-Languages: denser text and stronger border
  if (featuresSection) {
    rememberStyle(featuresSection, ["fontSize", "lineHeight", "borderWidth", "textAlign"]);
    featuresSection.style.fontSize = '0.9rem';
    featuresSection.style.lineHeight = '1.2';
    featuresSection.style.borderWidth = '2px';
    featuresSection.style.textAlign = 'left';
  }
  if (languagesSection) {
    rememberStyle(languagesSection, ["fontSize", "lineHeight", "borderWidth", "textAlign", "minHeight"]);
    languagesSection.style.fontSize = '0.9rem';
    languagesSection.style.lineHeight = '1.2';
    languagesSection.style.borderWidth = '2px';
    languagesSection.style.textAlign = 'left';
    languagesSection.style.minHeight = '310px';
  }

  // Spells: two columns and a bit taller
  if (spellsSection) {
    rememberStyle(spellsSection, ["borderWidth", "minHeight"]);
    spellsSection.style.borderWidth = '2px';
    spellsSection.style.minHeight = '310px';
    const sUl = spellsSection.querySelector('ul');
    if (sUl) {
      rememberStyle(sUl, ["columnCount", "columnGap", "paddingLeft", "margin"]);
      sUl.style.columnCount = '2';
      sUl.style.columnGap = '16px';
      sUl.style.paddingLeft = '1.1rem';
      sUl.style.margin = '.25rem 0';
    }
  }

  // Backstory: trim padding and set min-height
  if (backstorySection) {
    rememberStyle(backstorySection, ["borderWidth", "minHeight", "paddingLeft", "textAlign"]);
    backstorySection.style.borderWidth = '2px';
    backstorySection.style.minHeight = '460px';
    backstorySection.style.paddingLeft = '2px';
    backstorySection.style.textAlign = 'left';
    const renderDiv = backstorySection.querySelector('.textarea-render');
    if (renderDiv) {
      rememberStyle(renderDiv, ["marginLeft", "paddingLeft", "textAlign"]);
      renderDiv.style.marginLeft = '0';
      renderDiv.style.paddingLeft = '0';
      renderDiv.style.textAlign = 'left';
    }
  }

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

  // Attempt to fit everything on a single page by scaling if reasonable.
  const scaleToWidth = targetWidth / sheetWidthMm;
  const scaleToHeight = targetHeight / sheetHeightMm;
  const fitScale = Math.min(scaleToWidth, scaleToHeight);
  const MIN_READABLE_SCALE = 0.55; // below this, fallback to multipage

  if (fitScale >= MIN_READABLE_SCALE) {
    const imgWidth = sheetWidthMm * fitScale;
    const imgHeight = sheetHeightMm * fitScale;
    const offsetX = (pageWidth - imgWidth) / 2;
    const offsetY = (pageHeight - imgHeight) / 2;
    pdf.addImage(imgData, "JPEG", offsetX, offsetY, imgWidth, imgHeight);
  } else {
    // Multi-page: slice the captured canvas vertically (fit to width)
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
      // Place at left margin, top margin, full target width, and computed mm height
      pdf.addImage(pageImg, 'JPEG', pageMarginMm, pageMarginMm, targetWidth, thisPageMm);
      if (i < pages - 1) pdf.addPage();
    }
  }

  pdf.save(`${state?.name || "character"}.pdf`);
}

export default exportPdf;

/**
 * Download a standalone HTML snapshot of the character sheet using the same
 * compact export layout as the PDF. This gives you something you can edit.
 */
export async function downloadExportHtml(state) {
  const sheet = document.getElementById("characterSheet");
  if (!sheet) throw new Error("Character sheet not found");

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

  // Apply export layout tweaks
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
  sheet.classList.add('compact');
  sheet.style.width = `${a4WidthPx}px`;
  sheet.style.maxWidth = "unset";
  sheet.style.minHeight = "unset";
  sheet.style.height = "auto";
  sheet.style.gridTemplateRows = "auto auto auto auto auto";
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

  const restoreTextareas = [];
  textAreas.forEach((area) => {
    const cs = window.getComputedStyle(area);
    const placeholder = document.createElement('div');
    placeholder.className = 'textarea-render';
    placeholder.textContent = area.value || '';
    placeholder.style.whiteSpace = 'pre-wrap';
    placeholder.style.wordWrap = 'break-word';
    placeholder.style.width = '100%';
    placeholder.style.minHeight = `${area.scrollHeight || area.clientHeight || 0}px`;
    placeholder.style.border = 'none';
    placeholder.style.background = 'transparent';
    placeholder.style.padding = '0';
    placeholder.style.margin = '0';
    placeholder.style.fontFamily = cs.fontFamily;
    placeholder.style.fontSize = cs.fontSize;
    placeholder.style.lineHeight = '1.2';
    placeholder.style.color = cs.color;
    try {
      const isBackstory = area.closest('.backstory') != null || area.id === 'backstoryInput';
      if (isBackstory && (area.value?.length || 0) > 500) {
        placeholder.style.columnCount = '2';
        placeholder.style.columnGap = '12px';
      }
    } catch (_) { /* ignore */ }
    area.insertAdjacentElement('afterend', placeholder);
    rememberStyle(area, ["display"]);
    area.style.display = 'none';
    restoreTextareas.push(() => {
      placeholder.remove();
      area.style.display = '';
    });
  });
  revertActions.push(() => restoreTextareas.forEach((fn) => fn()))

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
    backstorySection.style.alignSelf = "start";
    backstorySection.style.minHeight = "0";
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

  // Ensure each top-level child has inline grid-area for portability
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
    if (area) child.style.gridArea = area;
  });

  let html;
  try {
    const clone = sheet.cloneNode(true);
    const title = state?.name ? `${state.name} – Character Sheet` : 'Character Sheet';
    html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>${SNAPSHOT_CSS}</style></head><body>${clone.outerHTML}</body></html>`;
  } finally {
    sheet.classList.remove('compact');
    revertActions.reverse().forEach((revert) => revert());
  }

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state?.name || 'character'}-export.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
