# Contadores de Tiempo

App web para llevar el seguimiento de fechas importantes: cuánto tiempo ha pasado desde un evento, o cuánto falta para uno futuro.

## Funcionalidades

- Crear contadores con nombre, fecha y hora
- Contadores recurrentes: diario, semanal, mensual o anual (ej. cumpleaños)
- Etiquetas para organizar y filtrar los contadores
- Configuración de las unidades de tiempo a mostrar (años, meses, días, horas, minutos, segundos)
- Exportar e importar datos en formato Excel
- Sincronización en la nube con Firebase (requiere cuenta de Google)

## Tecnologías

- HTML, CSS y JavaScript vanilla
- [esbuild](https://esbuild.github.io/) como bundler
- [Firebase](https://firebase.google.com/) para autenticación y almacenamiento en la nube (Firestore)
- [SheetJS](https://sheetjs.com/) para importación/exportación Excel

## Uso sin instalación

Puedes usar la app directamente sin compilar nada: abre `index.html` en el navegador o visita la versión publicada en GitHub Pages.

## Desarrollo local

### Requisitos

- [Node.js](https://nodejs.org/) (cualquier versión reciente)

### Pasos

```bash
# Instalar dependencias
npm install

# Compilar una vez
npm run build

# Modo watch (recompila automáticamente al guardar)
npm run dev
```

Luego abre `index.html` en el navegador.

