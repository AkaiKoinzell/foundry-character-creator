import { PDFDocument, StandardFonts } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.esm.min.js";

export async function exportPdf(state) {
  const templateBytes = await fetch('assets/PDF Sheet Empty.pdf').then(r => r.arrayBuffer());
  const { fields, checkboxes } = await fetch('assets/field-coords.json').then(r => r.json());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;

  if (fields.CharacterName)
    page.drawText(state.name || '', { x: fields.CharacterName.x, y: fields.CharacterName.y, size: fontSize, font });

  if (fields.PlayerName)
    page.drawText(state.playerName || '', { x: fields.PlayerName.x, y: fields.PlayerName.y, size: fontSize, font });

  if (fields.Class) {
    const classText = (state.classes || []).map(c => `${c.name || ''} ${c.level || ''}`.trim()).join(' / ');
    page.drawText(classText, { x: fields.Class.x, y: fields.Class.y, size: fontSize, font });
  }

  if (fields.Race)
    page.drawText(state.system?.details?.race || '', { x: fields.Race.x, y: fields.Race.y, size: fontSize, font });

  if (fields.Background)
    page.drawText(state.system?.details?.background || '', { x: fields.Background.x, y: fields.Background.y, size: fontSize, font });

  if (fields.Strength)
    page.drawText(String(state.system?.abilities?.str?.value ?? ''), { x: fields.Strength.x, y: fields.Strength.y, size: fontSize, font });

  if (fields.Dexterity)
    page.drawText(String(state.system?.abilities?.dex?.value ?? ''), { x: fields.Dexterity.x, y: fields.Dexterity.y, size: fontSize, font });

  if (fields.Constitution)
    page.drawText(String(state.system?.abilities?.con?.value ?? ''), { x: fields.Constitution.x, y: fields.Constitution.y, size: fontSize, font });

  if (fields.Intelligence)
    page.drawText(String(state.system?.abilities?.int?.value ?? ''), { x: fields.Intelligence.x, y: fields.Intelligence.y, size: fontSize, font });

  if (fields.Wisdom)
    page.drawText(String(state.system?.abilities?.wis?.value ?? ''), { x: fields.Wisdom.x, y: fields.Wisdom.y, size: fontSize, font });

  if (fields.Charisma)
    page.drawText(String(state.system?.abilities?.cha?.value ?? ''), { x: fields.Charisma.x, y: fields.Charisma.y, size: fontSize, font });

  const checkboxFontSize = 10;
  for (const [key, skill] of Object.entries(state.system?.skills || {})) {
    const skillName = (skill.label || key).replace(/\s+/g, '_');
    if (skill.proficient && checkboxes[`${skillName}_prof`]) {
      const { x, y } = checkboxes[`${skillName}_prof`];
      page.drawText('X', { x, y, size: checkboxFontSize, font });
    }
    if (skill.expert && checkboxes[`${skillName}_expert`]) {
      const { x, y } = checkboxes[`${skillName}_expert`];
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
