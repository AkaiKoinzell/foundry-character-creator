import { fetchJsonWithRetry } from './data.js';

/**
 * Display available premade characters and load the selected one.
 */
export async function showPremadeSelector() {
  try {
    const index = await fetchJsonWithRetry('data/premade/index.json', 'premade index');
    const list = index.characters || [];
    const overlay = document.createElement('div');
    overlay.id = 'premadeSelector';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.color = '#fff';

    list.forEach((char) => {
      const btn = document.createElement('button');
      btn.textContent = char.name || char.file;
      btn.className = 'btn';
      btn.style.margin = '0.5rem';
      btn.addEventListener('click', async () => {
        try {
          const data = await fetchJsonWithRetry(
            `data/premade/${char.file}`,
            char.name || char.file
          );
          localStorage.setItem('characterState', JSON.stringify(data));
          window.location.href = 'index.html';
        } catch (err) {
          console.error(err);
        }
      });
      overlay.appendChild(btn);
    });

    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.className = 'btn';
    cancel.style.margin = '0.5rem';
    cancel.addEventListener('click', () => overlay.remove());
    overlay.appendChild(cancel);

    document.body.appendChild(overlay);
  } catch (err) {
    console.error(err);
  }
}

export default { showPremadeSelector };
