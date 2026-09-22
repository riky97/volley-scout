# Volley Scout — Guida utente

Volley Scout serve a raccogliere i dati di una partita di pallavolo direttamente a bordo campo.
Funziona senza connessione a internet: tutti i dati restano sul computer dove è installato il
programma.

## 1. Installazione

1. Esegui il file di installazione (`Volley Scout_x.y.z_x64-setup.exe` oppure il pacchetto `.msi`).
2. Avvia **Volley Scout** dal menu Start.

Non servono registrazioni, account o abbonamenti.

## 2. Prima di una partita

### Creare la partita

1. Dalla Home scegli **Nuova partita**.
2. Inserisci il nome della tua squadra e quello dell'avversario, la data e, se vuoi, palestra e
   competizione.
3. Scegli il formato: al meglio di 3 o di 5 set, i punti per vincere un set e i punti del tie-break.
4. Indica chi effettua il primo servizio e da quale lato giocate.
5. Premi **Avanti**.

### Inserire la rosa

1. Aggiungi i giocatori con numero di maglia, nome e ruolo.
2. Segna con **Libero** chi ricopre quel ruolo e togli la spunta a **Disponibile** per chi non gioca.
3. Due giocatori non possono avere lo stesso numero di maglia: il programma lo segnala subito.
4. Puoi salvare la rosa come **modello** e riutilizzarla nelle partite successive.
5. Premi **Avanti** quando hai almeno sei giocatori disponibili.

### Impostare il sestetto

1. Assegna un giocatore a ciascuna posizione da P1 a P6.
   P1 è la posizione di chi batte, in basso a destra del campo.
2. Conferma chi batte per primo in questo set.
3. Premi **Inizia set**.

## 3. Durante la partita

La schermata **Scout live** è divisa in quattro zone:

- in alto il **punteggio**, i set vinti e l'indicazione di chi è al servizio;
- a sinistra il **campo** con i sei giocatori e i contatori di time-out e cambi;
- al centro il **pannello azione**;
- a destra l'elenco delle **ultime azioni**.

### Registrare un'azione

Tre passaggi, sempre nello stesso ordine:

1. tocca il **giocatore** (nel campo o nell'elenco del pannello);
2. tocca il **fondamentale** (Battuta, Ricezione, Attacco, Muro, Difesa, Alzata);
3. tocca l'**esito** (Punto, Positivo, Neutro, Negativo, Errore).

L'azione viene registrata subito e punteggio, servizio e rotazione si aggiornano da soli.
Gli esiti non previsti per un fondamentale restano visibili ma disattivati.

### I pulsanti rapidi

In fondo alla schermata trovi sempre:

- **Annulla azione** — cancella l'ultima azione registrata;
- **Punto nostro** — assegna un punto alla tua squadra; se hai già selezionato giocatore e
  fondamentale, il punto viene attribuito a quel giocatore;
- **Punto avversario** — assegna un punto agli avversari;
- **Errore nostro** — segnala un punto perso; se hai già selezionato giocatore e fondamentale, viene
  registrato come errore di quel giocatore;
- **Termina set** — chiude il set in corso, dopo conferma.

### Time-out e cambi

- **Time-out**: scegli se è tuo o dell'avversario. Se superi il limite previsto compare un avviso,
  ma il time-out viene comunque registrato.
- **Cambio**: scegli chi esce (fra i sei in campo) e chi entra (fra i disponibili in panchina).
  La rotazione resta corretta automaticamente.

### Scorciatoie da tastiera

| Tasti | Azione |
|---|---|
| `0`–`9` | digita il numero di maglia per selezionare il giocatore |
| `Invio` | conferma il numero digitato |
| `Alt` + `1`…`6` | seleziona il giocatore nella posizione da P1 a P6 |
| `B` `R` `A` `M` `D` `Z` | Battuta, Ricezione, Attacco, Muro, Difesa, Alzata |
| `P` `+` `N` `-` `E` | Punto, Positivo, Neutro, Negativo, Errore |
| `Spazio` | Punto nostro |
| `X` | Punto avversario |
| `Q` | Errore nostro |
| `Ctrl` + `Z` | annulla l'ultima azione |
| `Ctrl` + `Maiusc` + `Z` | ripristina l'azione annullata |
| `T` / `Maiusc` + `T` | time-out nostro / avversario |
| `C` | apri la finestra del cambio |
| `S` | mostra o nascondi le statistiche |
| `Ctrl` + `Invio` | termina il set |
| `Esc` | annulla la selezione in corso |
| `?` | mostra l'elenco delle scorciatoie |

Le scorciatoie si possono disattivare dalle Impostazioni.

### Correggere un errore di inserimento

- **Annulla azione** rimuove l'ultima azione e riporta indietro punteggio e rotazione.
- Nell'elenco delle azioni puoi eliminare una singola azione anche più indietro nel tempo: il
  programma ricalcola tutto ciò che viene dopo e ti dice quante azioni saranno interessate.

## 4. Fine set e fine partita

Quando il punteggio chiude il set compare una finestra di conferma: il set si chiude solo quando
confermi. Poi puoi correggere il sestetto e iniziare il set successivo.

Quando una squadra raggiunge i set necessari, il programma propone di andare al **Riepilogo**.

## 5. Riepilogo ed esportazione

Nel riepilogo trovi i dati della partita, il risultato finale, il punteggio di ogni set, le
statistiche di squadra e quelle per giocatore.

Puoi esportare:

- **PDF** — pensato per essere stampato o condiviso;
- **Excel (XLSX)** — con i fogli Riepilogo, Giocatori, Statistiche, Eventi e un foglio per ogni set;
- **JSON** — copia completa dei dati, utile come backup e reimportabile nel programma.

Il nome del file proposto è `scout_TuaSquadra_Avversario_AAAA-MM-GG`.

## 6. Salvataggio e recupero

La partita viene salvata da sola dopo ogni azione che assegna un punto: non serve premere Salva.
L'indicatore in alto a destra mostra lo stato del salvataggio.

Se il programma si chiude per errore, alla riapertura la Home propone **Riprendi partita** con
l'ultima partita non terminata. Creare una nuova partita non cancella mai quella in corso: la
ritrovi sempre in **Archivio partite**.

Premendo la **X** della finestra l'applicazione chiede conferma prima di chiudersi: scegli
**Sì, chiudi** per uscire oppure **Annulla** per restare. Se un salvataggio è ancora in corso viene
completato prima della chiusura.

Se un file di partita risulta danneggiato, il programma lo mette da parte (non lo cancella) e ti
avvisa, continuando a funzionare normalmente.

## 7. Impostazioni

- **Tema**: chiaro, scuro o come il sistema.
- **Squadra predefinita** e **formato predefinito** per le nuove partite.
- **Conferme** per le operazioni che cancellano dati.
- **Conferma automatica** delle azioni durante la partita.
- **Scorciatoie da tastiera** attive o disattivate.
- **Cartella dati**: dove sono salvate le partite su questo computer.

## 8. Domande frequenti

**Serve internet?** No, mai: né per registrare la partita né per esportare i file.

**Posso segnare anche i giocatori avversari?** No. Volley Scout registra in dettaglio solo la tua
squadra; degli avversari tiene il punteggio con **Punto avversario**.

**Come faccio un backup?** Esporta la partita in JSON, oppure copia la cartella dati indicata nelle
Impostazioni.

**Il libero può battere?** Le regole non lo prevedono. Se il libero finisce in posizione P1 il
programma lo segnala, ma non ti blocca.
