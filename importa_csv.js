const fs = require("fs");
const csv = require("csv-parser");
const sqlite3 = require("sqlite3").verbose();

// Apri il database
const db = new sqlite3.Database("./lotteria.db");

// Leggi il file CSV e inserisci i dati
fs.createReadStream("biglietti.csv")
  .pipe(csv({ separator: ';' })) // Specifica il separatore come punto e virgola
  .on("data", (data) => {
      // Assumiamo che il CSV abbia colonne "numero", "nome", "cognome"
      db.run("INSERT OR IGNORE INTO biglietti (numero, nome, cognome) VALUES (?, ?, ?)",
        [parseInt(data.numero), data.nome, data.cognome],
        (err) => {
          if(err) console.error("Errore inserimento biglietto:", err);
        }
      );
  })
  .on("end", () => {
      console.log("Importazione completata!");
      db.close();
  });
