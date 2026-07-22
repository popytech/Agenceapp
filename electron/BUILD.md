# ERP Popytech — Build Windows (.exe)

## Prérequis sur votre PC Windows

1. **Node.js 18+** — https://nodejs.org
2. **Git** — https://git-scm.com

---

## Étapes pour générer le .exe

### 1. Cloner / copier le projet

```bash
git clone <url-du-repo>
cd <dossier-projet>
```

### 2. Installer les dépendances du projet Next.js

```bash
npm install
```

### 3. Installer les dépendances Electron

```bash
npm run electron:install
```

### 4. Générer le .exe installeur

```bash
npm run electron:build:win
```

> Cette commande :
> 1. Build l'app Next.js (`next build`)
> 2. Package tout dans un installeur Windows `.exe` via electron-builder

### 5. Récupérer l'installeur

Le fichier `.exe` se trouve dans :
```
electron/dist/ERP Popytech Setup 1.0.0.exe
```

---

## Installer l'ERP sur Windows

1. Double-cliquer sur `ERP Popytech Setup 1.0.0.exe`
2. Suivre les étapes de l'assistant (comme n'importe quelle appli)
3. Cocher "Lancer ERP Popytech" à la fin
4. L'ERP s'ouvre directement — sans navigateur

---

## Notes

- L'app démarre un serveur Next.js **local** sur le port 3000
- Les données restent synchronisées avec Supabase en ligne
- Toutes les variables d'environnement sont embarquées dans le build
- Une icône est créée sur le **bureau** et dans le **menu Démarrer**

---

## Icônes personnalisées (optionnel)

Remplacer dans `electron/` :
- `icon.png` — 512×512px (macOS/Linux)
- `icon.ico` — format .ico Windows (plusieurs tailles)
