# **Style Guide: ATS Recruiting Platform (MUI \+ TanStack Edition)**

## **5\. Design System — Lectura Obligatoria para Agentes**

Cada pantalla en el ATS debe seguir este sistema de diseño. La consistencia de píxeles con los mockups de Figma es un requisito, no una preferencia. Se utiliza **Material UI (MUI)** para la base de componentes y **TanStack** para la gestión de estados y datos.

### **🛠 Tech Stack Principal**

- **UI Framework:** Material UI v5/v6 (Custom Theme).
- **State & Data:** TanStack Query v5 (Fetching) & TanStack Form (Lógica de formularios).
- **Icons:** lucide-react (Integrados en componentes MUI).
- **Layout:** Box, Stack y Grid de MUI. No se usa Tailwind CSS — todo el layout y spacing se maneja con el sistema de MUI para mantener una única fuente de verdad.

### **🎨 Paleta de Colores (MUI Theme)**

Solo usar estos valores. Nunca introducir un color fuera de esta lista.

| Categoría           | Variable CSS   | Hex      | Uso                         |
| :------------------ | :------------- | :------- | :-------------------------- |
| **Primary (Main)**  | \--primary-600 | \#2563eb | Botones principales, CTAs   |
| **Primary (Hover)** | \--primary-700 | \#1d4ed8 | Estados hover               |
| **Background**      | \--background  | \#f8fafc | Fondo de página (Slate 50\) |
| **Card / Paper**    | \--card-bg     | \#ffffff | Superficies de tarjetas     |
| **Text Primary**    | \--slate-900   | \#0f172a | Títulos principales         |
| **Text Secondary**  | \--slate-700   | \#334155 | Cuerpo de texto y labels    |
| **Error**           | \--red-500     | \#ef4444 | Alertas y estados inválidos |
| **Success**         | \--green-600   | \#16a34a | Éxito y confirmaciones      |

### **📝 Tipografía (MUI Hierarchy)**

Usar fuentes nativas del sistema. Solo dos pesos: 400 (Normal) y 500 (Medium).

- **h1 (Typography variant="h1"):** 30px | font-medium | text-slate-900
- **h2 (Typography variant="h2"):** 24px | font-medium | text-slate-900
- **body1:** 16px | font-normal | text-slate-700 (Default)
- **body2:** 14px | font-normal | text-slate-600 (Textos secundarios)

### **🧱 Componentes y Patrones (MUI \+ TanStack)**

#### **1\. Formularios (TanStack Form \+ MUI)**

`<form.Field`  
 `name="fullName"`  
 `children={(field) => (`  
 `<TextField`  
 `label="Nombre completo"`  
 `variant="outlined"`  
 `fullWidth`  
 `required`  
 `value={field.state.value}`  
 `onBlur={field.handleBlur}`  
 `onChange={(e) => field.handleChange(e.target.value)}`  
 `error={!!field.state.meta.errors.length}`  
 `helperText={field.state.meta.errors[0]}`  
 `sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f8fafc' } }}`  
 `/>`  
 `)}`  
`/>`

#### **2\. Botones**

- **Contained (Primary):** variant="contained" con elevation={0}. Radio de 8px.
- **Outlined (Secondary):** variant="outlined" con color Slate 200\.
- **Selectable Card:** Usar ButtonBase o CardActionArea para las opciones con borde de 2px en hover/active.

#### **3\. Carga de Datos (TanStack Query)**

Implementar Skeleton de MUI mientras isLoading sea true.

### **📐 Spacing y Layout**

- **Grid System:** Usar Grid container spacing={3} (24px de gap).
- **Padding de Tarjetas:** Siempre p: 4 (32px equivalente).
- **Border Radius:** 8px para botones/inputs; 16px para tarjetas principales.

### **🔍 Checklist de Diseño para el Agente (JIRA)**

- ¿Los datos se obtienen mediante useQuery de TanStack?
- ¿La lógica de validación reside en TanStack Form?
- ¿Se utilizan componentes de Material UI con los overrides del tema?
- ¿Los colores están limitados estrictamente a la paleta definida?
- ¿Se han incluido estados de carga (Skeletons) y error (Alerts)?
- ¿Solo se han utilizado iconos de lucide-react?
