const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(express.static('public'));
app.use(cors());
app.use(bodyParser.json());

// Crea o apre il database "lotteria.db"
const db = new sqlite3.Database("./lotteria.db");

// Crea la tabella "biglietti" se non esiste già
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS biglietti (
    numero INTEGER PRIMARY KEY,
    nome TEXT,
    cognome TEXT,
    vincente INTEGER DEFAULT NULL
  )`);
});

// Endpoint per verificare e salvare l'esito di un biglietto
app.post("/verifica-biglietto", (req, res) => {
    const numeroBiglietto = parseInt(req.body.numero);

    // Verifica che il numero del biglietto sia valido
    if (isNaN(numeroBiglietto) || numeroBiglietto < 1) {
        return res.status(400).send({ message: "Numero biglietto non valido" });
    }
    
    // Cerca il biglietto nel database
    db.get("SELECT * FROM biglietti WHERE numero = ?", [numeroBiglietto], (err, row) => {
        if (err) {
            return res.status(500).send({ message: "Errore nel server" });
        }
        if (!row) {
            return res.status(400).send({ message: "Biglietto non trovato" });
        }
        
        // Se l'esito è già stato calcolato, lo restituisce
        if (row.vincente !== null) {
            return res.send({
                numero: row.numero,
                nome: row.nome,
                cognome: row.cognome,
                vincente: row.vincente === 1,
                message: row.vincente === 1 ? "Il biglietto è vincente!" : "Il biglietto non è vincente."
            });
        }
        
        // Altrimenti, calcola l'esito con probabilità del 10%
        const isWinner = Math.random() < 0.1;
        
        // Salva l'esito nel database
        db.run("UPDATE biglietti SET vincente = ? WHERE numero = ?", [isWinner ? 1 : 0, numeroBiglietto], function(err) {
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
        });
    });
});

// Endpoint per esportare i risultati in formato CSV
app.get("/export-results", (req, res) => {
  db.all("SELECT numero, nome, cognome, vincente FROM biglietti", (err, rows) => {
    if (err) {
      return res.status(500).send({ message: "Errore durante l'estrazione dei dati" });
    }
    let csv = "numero,nome,cognome,esito\n";
    rows.forEach(row => {
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
    // Imposta gli header per indicare che si tratta di un file CSV in download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=risultati.csv");
    res.send(csv);
  });
});

// Avvia il server sulla porta 3000
app.listen(3000, () => console.log("Server in ascolto su http://localhost:3000"));
