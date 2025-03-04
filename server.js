const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Utilizza la porta fornita da Render o 3000 in locale
const PORT = process.env.PORT || 3000;

// Configurazione del pool PostgreSQL utilizzando la variabile DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Necessario per la connessione su Render
});

// Crea la tabella "biglietti" se non esiste già
pool.query(`
  CREATE TABLE IF NOT EXISTS biglietti (
    numero INTEGER PRIMARY KEY,
    nome TEXT,
    cognome TEXT,
    vincente INTEGER DEFAULT NULL
  )
`, (err) => {
  if (err) {
    console.error("Errore nella creazione della tabella:", err);
  } else {
    console.log("Tabella biglietti pronta.");
  }
});

// Endpoint per verificare l'esito di un biglietto
app.post("/verifica-biglietto", (req, res) => {
  const numeroBiglietto = parseInt(req.body.numero);
console.log("Numero biglietto ricevuto:", req.body.numero);
  if (isNaN(numeroBiglietto) || numeroBiglietto < 1) {
    return res.status(400).send({ message: "Numero biglietto non valido" });
  }

  // Recupera il biglietto dal database
  pool.query("SELECT * FROM biglietti WHERE numero = $1", [numeroBiglietto], (err, result) => {
    if (err) {
  console.error("Errore nel recupero del biglietto:", err);
  return res.status(500).send({ message: "Errore nel server", error: err.message });
}
    if (result.rows.length === 0) {
      return res.status(400).send({ message: "Biglietto non trovato" });
    }
    const row = result.rows[0];

    // Se l'esito è già stato calcolato, restituisci il risultato salvato
    if (row.vincente !== null) {
      return res.send({
        numero: row.numero,
        nome: row.nome,
        cognome: row.cognome,
        vincente: row.vincente === 1,
        message: row.vincente === 1 ? "Il biglietto è vincente!" : "Il biglietto non è vincente."
      });
    }

    // Calcola l'esito con probabilità del 10%
    const isWinner = Math.random() < 0.1;
    pool.query(
      "UPDATE biglietti SET vincente = $1 WHERE numero = $2",
      [isWinner ? 1 : 0, numeroBiglietto],
      (err) => {
        if (err) {
          return res.status(500).send({ message: "Errore durante l'aggiornamento del biglietto" });
        }
        return res.send({
          numero: row.numero,
          nome: row.nome,
          cognome: row.cognome,
          vincente: isWinner,
          message: isWinner ? "Complimenti, il biglietto è vincente!" : "Mi dispiace, il biglietto non è vincente."
        });
      }
    );
  });
});

// Endpoint per esportare i risultati in formato CSV
app.get("/export-results", (req, res) => {
  pool.query("SELECT numero, nome, cognome, vincente FROM biglietti", (err, result) => {
    if (err) {
      return res.status(500).send({ message: "Errore durante l'estrazione dei dati" });
    }
    let csv = "numero,nome,cognome,esito\n";
    result.rows.forEach(row => {
      let esito = "";
      if (row.vincente === 1) {
        esito = "vincente";
      } else if (row.vincente === 0) {
        esito = "perdente";
      } else {
        esito = "non estratto";
      }
      csv += `${row.numero},${row.nome},${row.cognome},${esito}\n`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=risultati.csv");
    res.send(csv);
  });
});

// Serve file statici (la tua pagina index.html e asset) dalla cartella "public"
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
