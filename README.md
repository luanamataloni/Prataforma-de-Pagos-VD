# 💰 Plataforma de Gestión de Pagos

Sistema integral para la gestión de clientes, servicios y seguimiento de cobros con un diseño SaaS moderno y minimalista.

## 🚀 Características

- **Dashboard General**: Visualización de estadísticas clave (Clientes, Servicios, Recaudación).
- **Gestión de Clientes**: Registro completo de clientes (Razón Social, CUIT, Email, etc.).
- **Gestión de Servicios**: Configuración de abonos mensuales y anuales.
- **Panel de Pagos Moderno**:
  - Tabla dinámica tipo SaaS con badges de estado y frecuencia.
  - Generación automática de cobros por periodo.
  - **Subida de Comprobantes**: Sistema para adjuntar archivos (PDF/Imagen) a cada pago.
  - Visualización directa de documentos desde la plataforma.
- **Diseño Responsivo**: Experiencia optimizada para Desktop (Menú superior) y Mobile (Navegación inferior).

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React.js, Vite, Lucide React (iconos), CSS3 (Grid & Flexbox).
- **Backend**: Node.js, Express.
- **Base de Datos**: SQLite (mediante `better-sqlite3`).
- **Gestión de Archivos**: Multer.

## 📦 Instalación y Configuración

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/luanamataloni/Prataforma-de-Pagos-VD.git
   cd Prataforma-de-Pagos-VD
   ```

2. **Instalar todas las dependencias**:
   (Ejecutar en la raíz del proyecto para instalar dependencias de backend, frontend y herramientas de desarrollo):
   ```bash
   npm install
   ```

3. **Ejecutar el proyecto en modo desarrollo**:
   ```bash
   npm run dev
   ```
   *Este comando iniciará simultáneamente el Backend (puerto 3001) y el Frontend (puerto 5173).*

## 📂 Estructura del Proyecto

- `/backend`: Servidor Express, rutas, controladores y gestión de base de datos SQLite.
- `/frontend`: Aplicación React con Vite, componentes y estilos.
- `/backend/uploads`: Carpeta donde se almacenan los comprobantes de pago subidos.

## 📄 Notas Adicionales

- La base de datos brindada en el código (`pagos.db`) inicializará las tablas automáticamente al arrancar por primera vez.
- Se utiliza un proxy en el frontend para comunicar con el backend de forma transparente durante el desarrollo.

---
Desarrollado con ❤️ para la gestión eficiente de cobros.

