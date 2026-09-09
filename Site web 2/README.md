# Jordi Maquinaria — sitio web

Sitio estático de una sola página: **HTML + un CSS + dos JS**, sin build, sin dependencias, sin `node_modules`. Se sirve tal cual.

## Estructura

```
index.html                 Página completa (6 escenas: Hero · Equipos · Calidad/Origen · Nosotros · Aplicaciones · Contacto)
assets/
  css/styles.css           Todos los estilos
  js/i18n.js               Traducción EN/ES (por defecto EN) + selector de idioma
  js/cinematic.js          Motor de scrollytelling cinematográfico (desktop: scroll; móvil: gestos)
  img/                      Fotografías y logotipo (logo.png, logo-light.png)
_headers                    Cabeceras HTTP para Cloudflare Pages (caché + seguridad)
```

## Desarrollo local

Cualquier servidor estático. Por ejemplo:

```bash
npx serve .
# o
python -m http.server 4321
```

Abrir `http://localhost:4321`.

## Deploy en Cloudflare Pages

1. Subir este repositorio a GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → elegir el repo.
3. Configuración de build:
   - **Framework preset:** `None`
   - **Build command:** *(vacío)*
   - **Build output directory:** `/`
4. **Save and Deploy**. El archivo `_headers` se aplica automáticamente.

Cada `git push` a la rama principal genera un nuevo deploy.

## Notas para producción

- **Formulario de contacto:** `index.html` usa `action="https://formspree.io/f/your-form-id"`.
  Sustituir `your-form-id` por el ID real de Formspree (o el endpoint que se use).
  Mientras no esté configurado, el formulario abre el cliente de correo (`mailto:`) como respaldo.
- **Idioma por defecto:** inglés. La elección del usuario se guarda en `localStorage` (`jm-lang`).
- **Tipografías:** Google Fonts (DM Sans + Manrope) por `<link>`.
- **Imágenes de la galería de Aplicaciones:** actualmente son enlaces a Unsplash (placeholder).
  Reemplazar por fotos propias en `assets/img/` y actualizar las URLs en `index.html` cuando estén disponibles.
- **`prefers-reduced-motion`:** respetado (el motor pasa a transiciones simples de opacidad).
