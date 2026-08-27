# 📅 Mi Horario · Estilo ESI UCA

Editor de horarios académicos que reproduce el diseño visual de los horarios
oficiales de la **Escuela Superior de Ingeniería (ESI)** de la Universidad de
Cádiz, campus de Puerto Real — tipografía, colores y estructura de tabla
calcados directamente del PDF oficial con cuentagotas de píxel.

Construye tu horario a mano (asignaturas, grupos, aulas, semanas activas...)
o impórtalo a partir de los datos de tu PDF oficial, y descárgalo como imagen
PNG lista para compartir o imprimir.

### 🔗 Ver en vivo

**[https://samuhe38.github.io/Horario-Uni/](https://samuhe38.github.io/Horario-Uni/)**

Publicado con GitHub Pages — no hace falta instalar nada, ábrelo directamente
en el navegador.

## ✨ Características

- **Constructor manual completo** — asignaturas con siglas, nombre completo,
  código oficial y color; sesiones con día, hora, aula y uno o varios grupos
  (teoría, problemas, prácticas informáticas, prácticas de laboratorio...).
- **Semanas activas por grupo** — marca semana a semana en qué semanas hay
  clase, igual que la fila de números 1–16 del horario oficial.
- **Solapamientos automáticos** — si dos sesiones coinciden en el mismo
  horario, se colocan en columnas contiguas más estrechas dentro del mismo
  día; si no hay solape, la sesión ocupa todo el ancho disponible.
- **Filas de altura automática** — cada franja crece según su propio
  contenido, tal como en la tabla original, en vez de forzar una escala de
  reloj que comprima el texto.
- **Réplica visual fiel** — tipografía Arial, los dos tonos exactos de teal
  del original (`#008080` y `#065E78`), esquinas rectas, huecos discontinuos
  cuando no hay solape... todo verificado a partir del PDF real.
- **Importar / Exportar en JSON** — guarda tu horario o pásalo entre
  dispositivos.
- **Exportar como imagen PNG** lista para compartir.
- **Guardado automático en el navegador** (`localStorage`) — recargas la
  página y tu horario sigue ahí. Nada sale de tu propio navegador.

## 🚀 Cómo usarlo

La forma más rápida es abrir directamente la [versión publicada en GitHub
Pages](https://samuhe38.github.io/Horario-Uni/) — no requiere instalar nada.

Si prefieres tenerlo en local para modificarlo, es un proyecto HTML/CSS/JS
puro (módulos ES nativos del navegador, sin build ni dependencias de npm),
pero los navegadores bloquean `import`/`export` cuando el archivo se abre
directamente como `file://`. Necesitas servirlo con cualquier servidor
estático — no hace falta nada complicado:

**Opción A — Python** (ya viene instalado en la mayoría de sistemas)
```bash
git clone https://github.com/samuhe38/Horario-Uni.git
cd Horario-Uni
python3 -m http.server 8000
```
Abre `http://localhost:8000` en el navegador.

**Opción B — Node**
```bash
npm start
```

**Opción C — GitHub Pages**
Ya está publicado en [samuhe38.github.io/Horario-Uni](https://samuhe38.github.io/Horario-Uni/)
(`Settings → Pages`, rama `main`, carpeta raíz). Cualquier cambio que se
suba a `main` se refleja ahí automáticamente al cabo de un minuto o dos.

**Opción D — VS Code**
Extensión "Live Server" → clic derecho sobre `index.html` → *Open with Live
Server*.

## 📁 Estructura del proyecto

```
horario-esi/
├── index.html                # Punto de entrada
├── css/
│   ├── base.css                # Interfaz de la herramienta (topbar, pestañas, formularios, modal)
│   └── calendar.css            # Réplica visual del horario ESI — lo que se exporta a PNG
├── js/
│   ├── main.js                  # Arranque de la app y conexión de eventos
│   ├── state.js                  # Estado global compartido
│   ├── utils.js                   # Funciones puras (color, tiempo, ids, escape html)
│   ├── storage.js                  # Persistencia en localStorage
│   ├── subjects.js                  # CRUD de asignaturas
│   ├── sessionForm.js                # Formulario de sesiones, grupos y semanas activas
│   ├── calendar.js                    # Motor de solapamientos (layoutDay) y render del calendario
│   ├── modal.js                        # Modal de detalle de sesión
│   └── importExport.js                  # Import/Export JSON + exportación a PNG (html2canvas)
├── examples/
│   └── ejemplo-horario.json    # Horario de ejemplo real (1ºA Ingeniería Informática, curso 2026-2027)
├── LICENSE
├── package.json
└── README.md
```

Cada módulo de `js/` tiene una responsabilidad única y se comunica con el
resto mediante funciones exportadas explícitas — sin variables globales ni
dependencias circulares. `main.js` es el único módulo que conoce a todos los
demás; el resto no se importan entre sí salvo cuando es estrictamente
necesario (por ejemplo, `calendar.js` importa `openModal` de `modal.js`).

## 🧩 Modelo de datos

Todo el horario se representa con esta forma (es exactamente lo que se
guarda al exportar a `.json`):

```json
{
  "meta": {
    "titulo": "Grado en Ingeniería Informática",
    "anio": "2026-2027",
    "curso": "1º",
    "semestre": "1º",
    "grupo": "1ºA"
  },
  "subjects": [
    { "id": "cal", "siglas": "CAL", "nombre": "Cálculo", "codigo": "21714009", "color": "#e41c1e" }
  ],
  "sessions": [
    {
      "id": "abc123",
      "subjectId": "cal",
      "day": 0,
      "start": "08:30",
      "end": "10:00",
      "room": "Aula D01",
      "grupos": [
        {
          "id": "def456",
          "code": "A1",
          "tipo": "Clases de teoría",
          "weeksTotal": 16,
          "weeksActive": [true, true, true, false, "... 16 valores en total"]
        }
      ]
    }
  ]
}
```

- `day`: `0` = Lunes … `4` = Viernes.
- `weeksActive`: un booleano por semana; `true` = hay clase esa semana.
- Una `session` puede tener varios `grupos` (por ejemplo, teoría y problemas
  a la misma hora y aula), tal como aparece en los horarios oficiales.

## 🖨️ Importar desde tu PDF oficial

La pestaña **"2 · Importar"** explica el flujo y muestra el esquema JSON
completo. En resumen: le pasas tu PDF de horario y tu(s) grupo(s) a un
asistente de IA (por ejemplo Claude), le pides que te devuelva los datos en
el formato de arriba, y pegas el resultado en el cuadro de texto de esa
pestaña. En `examples/ejemplo-horario.json` tienes un caso real ya resuelto
(1ºA de Ingeniería Informática) para probarlo directamente.

## 🎨 Fidelidad visual

Los colores de `css/calendar.css` no son aproximados — se extrajeron
muestreando píxeles directamente del PDF oficial:

| Elemento | Color |
|---|---|
| Bordes / líneas (marco de "Clases de teoría", subrayado del título) | `#008080` |
| Texto de cabeceras (título, "Año académico") | `#065E78` |
| Días de la semana, líneas de la tabla | `#000000` |
| Tipografía | Arial / Helvetica |

Cada asignatura conserva su propio color para el texto de sus siglas y un
tono pastel del mismo color como fondo de sus sesiones — igual que en el
horario real.

## 🛠️ Stack técnico

- HTML5 + CSS3 (sin frameworks)
- JavaScript con módulos ES nativos (`import`/`export`), sin bundler
- [html2canvas](https://html2canvas.hertzen.com/) (vía CDN) solo para la
  exportación a PNG
- `localStorage` para la persistencia local

## 📄 Licencia

Distribuido bajo licencia MIT — consulta [LICENSE](LICENSE).
