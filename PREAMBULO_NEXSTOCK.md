# Preámbulo y Documentación de Arquitectura: NexStock

## 1. Visión General del Sistema
**NexStock** es una aplicación de escritorio orientada a la gestión comercial local (diseñada para negocios que manejan inventario, control de caja, historial de transacciones, gestión de créditos/fiados, panel de control y venta de productos específicos como agua y mercancía general). Al ser una aplicación de escritorio offline-first, opera de manera totalmente local en la computadora del cliente mediante SQLite sin requerir internet.

## 2. Stack Tecnológico y Razones de Elección
- **Tauri v2 (Rust + Webview):** Motor nativo ultraligero y seguro del sistema operativo, ideal para evitar el consumo excesivo de memoria RAM propio de Electron.
- **React + Vite (Frontend):** Interfaz de usuario basada en componentes modernos, reactivos y con un entorno de desarrollo sumamente rápido.
- **Tailwind CSS (Estilos):** Maquetación limpia, responsiva y basada en clases utilitarias para mantener una interfaz profesional.
- **SQLite vía `tauri-plugin-sql` (Base de Datos):** Persistencia local estructurada en un archivo local, asegurando que la información de inventario y caja no se pierda al cerrar la app.

## 3. Módulos y Arquitectura Funcional

### A. Capa de Datos (`db.js`)
- **Propósito:** Centralizar toda la comunicación con la base de datos SQLite. 
- **Funcionamiento:** Exporta funciones asíncronas limpias (ej. `getProductosDb`, `actualizarStockDb`, `guardarMovimientoDb`, gestión de créditos, métricas del dashboard, etc.) utilizando el plugin de Tauri, manejando bloques de seguridad (`try...catch`).

### B. Módulo de Dashboard (`Dashboard.jsx`)
- **Propósito:** Panel principal de control y resumen ejecutivo de la aplicación.
- **Funcionamiento:** Muestra métricas clave en tiempo real al abrir la app (como el total de ventas del día, alertas de productos con stock bajo, accesos directos a funciones principales y resúmenes rápidos del estado financiero actual).

### C. Módulo de Inventario (`Inventario.jsx`)
- **Propósito:** Núcleo de control y alta de mercancía.
- **Funcionamiento:** Permite registrar, editar, buscar y eliminar productos, manteniendo el stock actualizado en tiempo real con las tablas de SQLite.

### D. Módulo de Caja y Ventas (`Caja.jsx`)
- **Propósito:** Punto neurálgico para procesar cobros, transacciones y cobros directos.
- **Funcionamiento:** Calcula totales y ejecuta de forma atómica dos tareas críticas: registrar el movimiento financiero y descontar el stock de manera persistente en la base de datos mediante `actualizarStockDb`.

### E. Módulo de Movimientos / Transacciones
- **Propósito:** Auditoría financiera y trazabilidad de ingresos/egresos.
- **Funcionamiento:** Almacena cronológicamente cada entrada, salida o venta. Incluye **filtros avanzados para calcular y visualizar las ganancias y flujos filtrados por días, semanas, mes, año y de forma general**.

### F. Módulo de Créditos (Fiados / Cuentas por Cobrar)
- **Propósito:** Gestión de deudas y saldos pendientes de clientes.
- **Funcionamiento:** Permite registrar ventas a crédito asociadas a un cliente, llevar el control de los abonos realizados, actualizar los saldos restantes y cambiar el estado de la deuda (pendiente / pagada).