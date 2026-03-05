# 🖍️ Crayon Games

Coleccion de minijuegos con estetica de crayola sobre cuaderno escolar. Incluye un menu principal para seleccionar entre los juegos disponibles.

## 🎮 Juegos

### 🖍️ Crayon Snake

Controla una crayola que pinta su camino, recoge manzanas y estrellas bonus, ¡y no te salgas del cuaderno!

| Metodo | Accion |
|--------|--------|
| **Flechas del teclado** | Mover la crayola |
| **W A S D** | Mover la crayola |
| **Swipe tactil** | Mover la crayola (movil) |
| **D-Pad en pantalla** | Mover la crayola (movil) |

### 🔴 Crayon Circuit

Conecta los pares de puntos del mismo color con trazos de crayola, ¡sin cruzar las lineas!

- 8 niveles progresivos (5x5 a 8x8)
- Click/toca un punto y arrastra para dibujar el camino
- Si las lineas se cruzan, pierdes
- Progreso guardado en el navegador

## 🚀 Desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abrir en el navegador
# → http://localhost:5173
```

## 📦 Build de producción

```bash
npm run build
```

Los archivos se generan en la carpeta `dist/`. Para previsualizarlos:

```bash
npm run preview
```

## ☁️ Deploy

### Vercel (recomendado)

1. Sube el proyecto a un repositorio en GitHub
2. Ve a [vercel.com](https://vercel.com) e inicia sesión con GitHub
3. Importa tu repositorio
4. Vercel detecta Vite automáticamente — click en **Deploy**
5. ¡Listo! Tu juego estará en `tu-proyecto.vercel.app`

### Netlify

1. Sube el proyecto a GitHub
2. Ve a [netlify.com](https://netlify.com) e inicia sesión
3. Click en **"Add new site"** → **"Import an existing project"**
4. Selecciona tu repositorio
5. Configura:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. Click en **Deploy site**

### GitHub Pages

1. Instala el plugin de deploy:
   ```bash
   npm install -D gh-pages
   ```

2. Agrega a `vite.config.js`:
   ```js
   export default defineConfig({
     base: '/nombre-de-tu-repo/',
     // ...
   })
   ```

3. Agrega a `package.json` en `scripts`:
   ```json
   "deploy": "npm run build && gh-pages -d dist"
   ```

4. Ejecuta:
   ```bash
   npm run deploy
   ```

5. En GitHub → Settings → Pages, selecciona la rama `gh-pages`

## 🏗️ Arquitectura

```
src/
  main.jsx            → Punto de entrada
  App.jsx             → Router: menu principal o juego activo
  components/
    GameMenu.jsx      → Menu de seleccion de juegos
    BackButton.jsx    → Boton de volver reutilizable
  games/
    CrayonSnake.jsx   → Juego Snake completo (~570 lineas)
    CrayonCircuit.jsx → Juego Circuit completo (~720 lineas)
```

Cada juego es un componente autonomo que recibe `onBack` como prop para volver al menu.

## 🛠️ Tech Stack

- **React 18** — UI con hooks
- **Vite 6** — Build tool ultrarrápido
- **SVG** — Renderizado del juego
- **CSS Animations** — Efectos visuales

## 📄 Licencia

MIT — Usa este proyecto como quieras.
