import { PDFDocument, StandardFonts } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.esm.min.js";

export async function exportPdf(state) {
  const templateBytes = await fetch('assets/PDF Sheet Empty.pdf').then(r => r.arrayBuffer());
  const { fields, checkboxes } = await fetch('assets/field-coords.json').then(r => r.json());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const pageHeight = page.getHeight();

  const classText = (state.classes || [])
    .map(c => `${c.name || ''} ${c.level || ''}`.trim())
    .join(' / ');
  const background = state.system?.details?.background || '';
  const race = state.system?.details?.race || '';
  const age = state.system?.details?.age ? String(state.system.details.age) : '';

  const textFields = {
    CharacterName: state.name || '',
    PlayerName: state.playerName || '',
    ClassBackground: [classText, background].filter(Boolean).join(' / '),
    RaceAge: [race, age].filter(Boolean).join(' / '),
    Alignment: state.system?.details?.alignment || '',
  };

  for (const [fieldId, value] of Object.entries(textFields)) {
    const field = fields[fieldId];
    if (field) {
      const y = pageHeight - (field.y + field.height);
      page.drawText(String(value), { x: field.x, y, size: fontSize, font });
    }
  }

  const abilityMap = {
    str: 'STR',
    dex: 'DEX',
    con: 'CON',
    int: 'INT',
    wis: 'WIS',
    cha: 'CHA',
  };

  for (const [ability, fieldId] of Object.entries(abilityMap)) {
    const field = fields[fieldId];
    if (field) {
      const value = state.system?.abilities?.[ability]?.value ?? '';
      const y = pageHeight - (field.y + field.height);
      page.drawText(String(value), { x: field.x, y, size: fontSize, font });
    }
  }

  const checkboxFontSize = 10;
  for (const [key, skill] of Object.entries(state.system?.skills || {})) {
    const skillName = (skill.label || key).replace(/\s+/g, '_');
    if (skill.proficient && checkboxes[`${skillName}_prof`]) {
      const cb = checkboxes[`${skillName}_prof`];
      const x = cb.x + cb.w / 2;
      const y = pageHeight - (cb.y + cb.h / 2);
      page.drawText('X', { x, y, size: checkboxFontSize, font });
    }
    if (skill.expert && checkboxes[`${skillName}_expert`]) {
      const cb = checkboxes[`${skillName}_expert`];
      const x = cb.x + cb.w / 2;
      const y = pageHeight - (cb.y + cb.h / 2);
      page.drawText('X', { x, y, size: checkboxFontSize, font });
    }
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.name || 'character'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export default exportPdf;
