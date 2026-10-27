# Homely Hamster — sito pubblico

Sito di presentazione, guida e informazioni privacy di Homely Hamster, progetto Whiteware Lab.

**Online:** https://whiteware-lab.github.io/homelyhamster-site/

Questo repository contiene soltanto il sito statico e un programma dimostrativo.
Il repository dell'app è privato e separato: `Whiteware-Lab/homelyhamster-app`.
Firebase continua a gestire le funzioni dell'app; il sito non richiede account,
chiavi API, servizi esterni di analytics o dipendenze frontend.

## Sviluppo

Richiede Node.js 22 o successivo. Nessuna installazione npm necessaria.

```sh
npm test
npm run build
npm run preview
```

Preview: http://127.0.0.1:8765/homelyhamster-site/

GitHub Actions verifica i file, prepara `dist/` e pubblica su Pages dopo i push
su `main`. Le pull request eseguono i controlli senza pubblicare. `.nojekyll`
mantiene il comportamento statico. Il build include soltanto i file pubblici.
La pubblicazione non deve includere file dell'app, credenziali, build private o
audio delle playlist. Le build beta sono attualmente su richiesta via email:
il sito non pubblicizza release pubbliche o compatibilità non collaudate.

## Contenuti

- `index.html`: presentazione, stato della beta, compatibilità e FAQ.
- `guida/`: percorso pratico per la prima sessione.
- `privacy/` ed `elimina-account/`: trattamento e controllo dei dati.
- `assets/logo.png`: logo esistente del progetto.
- `assets/workout-demo.json`: programma Homely dimostrativo, senza dati reali.
- `assets/demo-model.js`: simulazione illustrativa, senza connessione ai sensori.

La demo usa gli stessi blocchi del programma introduttivo dell'app. È una
presentazione nel browser, non l'interfaccia Flutter né un driver del trainer.

Per un futuro dominio personalizzato aggiornare canonical, Open Graph, sitemap,
URL nel 404 e riferimenti OAuth; i collegamenti tra le pagine sono relativi.
Mantenere accessibili i vecchi URL Firebase già usati dall'app finché i client
non saranno migrati. La pagina tecnica Firebase `/desktop-auth` deve continuare
a funzionare per l'accesso Google su Windows.
