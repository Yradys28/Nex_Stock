# nexStock

Aplicación de escritorio para la **gestión comercial local**: inventario, caja, ventas, créditos (fiados) y control de movimientos. Diseñada para negocios que manejan stock y cuentas por cobrar, funciona **100% offline** (sin internet).

## Stack tecnológico

- **[Tauri v2](https://tauri.app)** (Rust) — motor nativo ultraligero
- **React 19 + Vite** — interfaz y build rápido
- **Tailwind CSS** — estilos
- **SQLite** vía `tauri-plugin-sql` — base de datos local (`nexstock.db`)

## Módulos

| Módulo | Descripción |
|---|---|
| Dashboard | Métricas del día, alertas de stock bajo y accesos directos |
| Inventario | Alta, edición, búsqueda y borrado de productos con stock en tiempo real |
| Caja / Ventas | Registro de ventas con descuento atómico de stock |
| Movimientos | Auditoría de ingresos/egresos con filtros por día, semana, mes y año |
| Créditos | Cuentas por cobrar: abonos, saldos y estados (pendiente/pagada) |
| Categorías | Organización de productos |

## Requisitos

- Node.js 18+
- [Rust / rustup](https://rustup.rs)
- Windows: WebView2 Runtime (incluido de fábrica en Windows 11)

## Desarrollo

```bash
npm install
npm run tauri dev
```

## Generar instalador (producción)

```bash
npm run tauri build
```

Genera los instaladores en `src-tauri/target/release/bundle/`:

- **`nsis/nexstock_0.1.0_x64-setup.exe`** ← recomendado para distribuir en pendrive
- `msi/nexstock_0.1.0_x64_en-US.msi` ← alternativa para instalación con directrices MSI

## Cambiar el ícono de la app

Se genera a partir de **una sola imagen cuadrada** (ideal: PNG de 1024×1024 px):

```bash
npx tauri icon ruta/a/tu-logo.png
```

Esto reemplaza todos los tamaños en `src-tauri/icons/` (`.ico`, `.icns`, PNGs). Copia también la imagen a `public/icon.png` para el favicon. Luego rebuild:

> ⚠️ **Importante:** `build.rs` de Tauri solo se regenera si cambia `tauri.conf.json` — si solo cambias los archivos de `icons/`, el `.exe` **conservará el ícono anterior** (quedando en caché en `resource.lib`). Fuerza la regeneración antes del rebuild:
>
> ```bash
> cd src-tauri && cargo clean -p nexstock --release && cd ..
> npm run tauri build
> ```

## Base de datos

SQLite local en la carpeta de datos de la app:

```
%APPDATA%\com.jesys-yrady.nexstock\nexstock.db
```

Tablas: `productos`, `creditos`, `credito_items`, `movimientos`, `categorias`, `ajustes`. El esquema se crea automáticamente al iniciar (`src/db.jsx`).

## Estructura del proyecto

```
├── src/                 # Frontend React
│   ├── App.jsx          # Ruteo principal
│   ├── db.jsx           # Capa de datos (todas las consultas SQLite)
│   └── components/      # Dashboard, Inventario, Caja, Movimientos, Créditos, Categorías
├── src-tauri/           # Backend Rust
│   ├── tauri.conf.json  # Configuración de la app e instalador
│   ├── icons/           # Íconos generados
│   └── capabilities/    # Permisos (SQL, etc.)
└── public/              # Assets estáticos (favicon)
```
