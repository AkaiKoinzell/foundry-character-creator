document.addEventListener("DOMContentLoaded", () => {
  const step1Container = document.getElementById("step1");
  if (!step1Container) return;
  step1Container.innerHTML = `
    <h2>Step 1: Inserisci Nome e Livello</h2>
    <label for="characterName">Nome del Personaggio:</label>
    <input type="text" id="characterName" placeholder="Inserisci il nome">
    <br><br>
    <label for="levelSelect">Livello:</label>
    <select id="levelSelect">
      ${[...Array(20)].map((_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
    </select>
  `;
});
