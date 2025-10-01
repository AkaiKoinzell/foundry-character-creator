# foundry-character-creator
Modello per la creazione dei personaggi D&amp;D e output in file JSON per Foundry

## Mobile support

L'interfaccia è ora responsive e utilizzabile su telefoni e tablet (pulsanti touch‑friendly, layout della scheda del personaggio a colonne ridotte e navigazione scorrevole su schermi piccoli).

### Anteprima su smartphone (stessa Wi‑Fi)

1. Installa le dipendenze (solo se ti servono build/test):
   `npm install`
2. Avvia un semplice server statico:
   `npm run serve`
3. Nel terminale vedrai un URL Locale e uno o più URL di Rete. Apri l'URL di Rete sul telefono, ad es. `http://<ip-del-tuo-pc>:5173/landing.html`.

Note
- Telefono e PC devono essere sulla stessa rete/Wi‑Fi.
- Se il firewall lo chiede, consenti al processo Node di accettare connessioni.
- Su desktop puoi anche aprire direttamente `landing.html` o `index.html`, ma sui telefoni in genere serve un web server per caricare correttamente gli ES module.
