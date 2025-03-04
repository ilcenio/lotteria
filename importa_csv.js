const fs = require("fs");
const csv = require("csv-parser");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

fs.createReadStream("biglietti.csv")
  .pipe(csv({ separator: ';' }))
  .on("data", (data) => {
    pool.query(
      "INSERT INTO biglietti (numero, nome, cognome) VALUES ($1, $2, $3) ON CONFLICT (numero) DO NOTHING",
      [parseInt(data.numero), data.nome, data.cognome],
      (err) => {
        if (err) console.error("Errore inserimento biglietto:", err);
      }
    );
  })
  .on("end", () => {
    console.log("Importazione completata!");
    pool.end();
  });
