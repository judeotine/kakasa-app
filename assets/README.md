# assets

`app.json` references these image assets — add the real files before building:

- `icon.png` — app icon (1024×1024)
- `splash.png` — splash screen image
- `adaptive-icon.png` — Android adaptive icon foreground

Until they exist, `expo start` / EAS builds that read `app.json` will warn or fail
on the missing paths.
