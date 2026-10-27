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
audio delle playlist come file del sito. I binari della beta sono allegati alle
GitHub Releases di questo repository pubblico; il codice dell'app resta privato.
Il sito non pubblicizza compatibilità non collaudate.

## Release dell'app

Richiede Windows, Flutter e i toolchain Android/Visual Studio, Node.js 22+,
PowerShell e `gh` autenticato con permesso di scrittura su questo repository.
I comandi partono dalla cartella del sito. Incrementare `version: x.y.z+build`
nel `pubspec.yaml` dell'app prima di una nuova distribuzione. Il tag include
anche il numero build; i pacchetti già preparati o pubblicati non vengono sovrascritti.

```powershell
node scripts/release-app.mjs prepare --app-dir C:/percorso/app --platform windows
# Per entrambe le piattaforme: --platform all (predefinito).
# Android richiede android/key.properties e il keystore privato già configurati.
node scripts/release-app.mjs publish --bundle C:/percorso/app/build/releases/v1.0.10-build.11-beta --notes C:/percorso/note-pubbliche.md
```

`prepare` esegue analisi, test e build release; crea ZIP Windows portabile
(exe, DLL e data, senza .lib/.pdb), APK firmato quando richiesto, `release.json`,
`SHA256SUMS.txt` e provenienza locale. `--skip-checks` serve esclusivamente
quando analisi e test sono appena stati eseguiti sullo stesso checkout;
la build viene comunque rigenerata. Il default è beta; `--channel stable`
prepara una release stabile. Non usare la chiave di debug per distribuire Android.

Prima di `publish`, provare il pacchetto e rivedere le note pubbliche.
Il publisher ricontrolla dimensioni e SHA-256, carica una bozza, verifica
gli allegati e poi la pubblica. In caso di errore di upload resta una bozza:
ispezionarla manualmente prima di riprovare. Vengono caricati solo i binari,
il manifest e i checksum; sorgenti, keystore e provenienza locale restano privati.
La firma release Android richiede di registrare i fingerprint del certificato
in Firebase/Google prima di distribuire un APK con accesso Google.

L'evento `release: published` ricostruisce Pages: `sync-release.mjs` legge
le release pubblicate (incluse le beta), verifica manifest e allegati e
genera il catalogo. La homepage viene renderizzata durante il build con
versione, build, data UTC, dimensione, note e link diretti. Nessuna richiesta
GitHub API dal browser e nessuna dipendenza da JavaScript per scaricare.
Android e Windows conservano ciascuno l'ultima build pubblicata disponibile.
Per ripristinare il sito dopo la rimozione di una release, lanciare manualmente
il workflow Pages. Per il solo preview locale: `node scripts/sync-release.mjs`,
`npm run build`; il server di preview serve i sorgenti, quindi i link finali
vanno verificati anche in `dist/index.html` o sul deploy Pages.

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
