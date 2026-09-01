# Fallout: New Vegas – Hacking dei Terminali: Regole Dettagliate

## 1. Struttura della schermata

Il terminale mostra due colonne di testo (stile "terminale anni '80"), composte da:
- **Indirizzi di memoria** a sinistra (es. `0xF2A4`) — puramente estetici, non contano
- **Un blocco di caratteri "spazzatura"**: simboli come `!@#$%^&*()_+{}[]<>.,;:'"|\/~` mescolati a...
- **Parole reali**, tutte della **stessa lunghezza** (in genere tra 4 e 12 lettere, a seconda del livello di difficoltà)

Il numero di parole candidate varia in base al livello:
- **Novice**: parole più corte, meno candidate
- **Advanced**
- **Expert**
- **Very Hard**: parole più lunghe, più candidate, più "rumore" tra le parole

Solo **una** parola tra quelle candidate è quella corretta (la password).

## 2. Meccanica del "Likeness" (correttezza)

Ogni volta che selezioni una parola sbagliata, il gioco confronta lettera per lettera (posizione per posizione) quella parola con la password corretta, e ti restituisce un messaggio tipo:

```
>Please wait
>2/7 correct.
```

Questo significa: la parola che hai scelto condivide **2 lettere nella posizione esatta** su un totale di 7 (la lunghezza della parola), rispetto alla password reale.

Punti chiave:
- Conta **solo le posizioni identiche**, non le lettere in comune ovunque nella parola.
- Non ti dice *quali* lettere sono giuste, solo *quante*.
- Se ottieni **0/7 correct**, nessuna lettera è nella posizione giusta.
- Se indovini, ottieni l'accesso immediato.

## 3. Tentativi disponibili

- Hai **4 tentativi** per indovinare la password corretta.
- Ogni selezione di una parola sbagliata consuma un tentativo.
- Se esaurisci i 4 tentativi, il terminale si blocca:
  - Non puoi più hackerarlo per un certo periodo di tempo di gioco (di solito si "resetta" dopo un certo numero di ore o giorni), oppure
  - In alcuni casi è bloccato permanentemente per quella run (dipende dal terminale/script specifico)

## 4. Le sequenze speciali (bracket trick)

All'interno del muro di caratteri spazzatura, cerca coppie di simboli **corrispondenti** (dello stesso tipo) che racchiudono un blocco di caratteri al loro interno. Non si tratta necessariamente di due simboli attaccati: tra apertura e chiusura può esserci qualsiasi sequenza di caratteri spazzatura, anche piuttosto lunga. Esempi:

```
{HG5%$fT@]     (no — tipi diversi, non valido)
<<>tR#!qz>     (valido: < ... >)
(9j$Fk;.Lm)    (valido: ( ... ))
[Qw@1!zXcV]    (valido: [ ... ])
```

L'unica condizione è che il simbolo di apertura e quello di chiusura siano **dello stesso tipo**:
- `(` con `)`
- `[` con `]`
- `{` con `}`
- `<` con `>`

Il contenuto in mezzo (lunghezza e caratteri) è irrilevante: conta solo che i due simboli si corrispondano.

Selezionando l'intero blocco tra i due simboli, ottieni uno dei due effetti casuali:

1. **Reallocated dud** → una parola sbagliata viene rimossa dalla lista dei candidati (appare come una sequenza di punti al posto della parola)
2. **Replenish Attempts** → i tentativi rimasti tornano al massimo (o comunque aumentano)

Non consumano tentativi, quindi conviene sempre individuarle e usarle prima di rischiare un tentativo su una parola vera e propria.

## 5. Strategia ottimale

1. **Primo tentativo**: scegli la parola che ha, in media, **il maggior numero di lettere in comune (per posizione)** con tutte le altre parole candidate. Questo massimizza l'informazione ottenuta dal primo indizio (è la stessa logica usata dai solutori automatici per questo minigioco).
2. **Dopo ogni tentativo**: usa il punteggio "X/Y correct" per **eliminare** tutte le parole che, confrontate con quella appena tentata, non potrebbero dare lo stesso punteggio se fossero loro la password corretta.
3. Ripeti finché non rimane una sola parola candidata plausibile, oppure la indovini direttamente.
4. Sfrutta sempre le sequenze tra parentesi corrispondenti per guadagnare tentativi extra o eliminare candidate, prima di "spendere" un tentativo vero e proprio su una parola.

## 6. Conseguenze dell'hacking

- **Successo**: accesso completo al terminale (dati, controllo di torrette/robot, apertura porte, ecc. a seconda del terminale)
- **Fallimento** (tentativi esauriti): terminale bloccato temporaneamente; a volte attiva un allarme o blocca porte collegate, se lo script del terminale lo prevede
- Alcuni terminali richiedono un **livello minimo di Scienze (Science)** per essere anche solo tentati
