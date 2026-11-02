# Cotizador 3D · Quirón 3D

Calculadora de costos de impresión 3D con lista de precios, pedidos, pagos y presupuestos para mandar por WhatsApp.

**Usala online:** https://edukaos.github.io/cotizador-3d/

## Qué hace

- Lee el **.gcode** o el **.3mf laminado** (Bambu Studio, OrcaSlicer, PrusaSlicer, Cura) y completa tiempo, gramos e imagen de la pieza.
- **STL / 3MF sin laminar:** vista 3D, medidas, volumen y peso estimado.
- Piezas por placa, varias impresoras, catálogo de materiales, comisión de cobro, precio mínimo, redondeo y descuentos por cantidad.
- Lista de precios con duplicar y **actualizar precios** cuando cambian tus costos.
- **Pedidos:** cliente, fecha de entrega sugerida, estados, envío, pagos parciales, saldo y presupuesto en imagen.
- **Resumen del mes:** ventas, costos, comisiones, ganancia, lo cobrado, piezas más vendidas y mejores clientes.
- Copia de seguridad en un archivo.

Sin configurar nada, todo se guarda **solo en el navegador** de quien la usa.

## Guardar en tu Google (Sheet + Drive + Calendar)

Con un script gratuito en tu cuenta de Google, la lista y los pedidos van a una **Google Sheet**, los archivos a una carpeta de **Drive** y las entregas a tu **Calendar**.

1. Creá una **Google Sheet** nueva (por ejemplo «Cotizador 3D»).
2. En la planilla: **Extensiones › Apps Script**.
3. Borrá lo que haya y pegá el contenido de [`Codigo.gs`](Codigo.gs).
4. Guardá (ícono del disquete). Arriba, elegí la función **configurar** y tocá **Ejecutar**. Google te pide permisos: **Revisar permisos › tu cuenta › Configuración avanzada › Ir a (proyecto) › Permitir**. (Aparece el aviso de "app no verificada" porque el script es tuyo; es normal.)
5. En el **Registro de ejecución** aparece **tu CLAVE** (se genera sola). Guardala; si la perdés, ejecutá **configurar** de nuevo y se vuelve a mostrar.
6. **Implementar › Nueva implementación** › engranaje › **Aplicación web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   - **Implementar** y copiá la **URL de la aplicación web** (termina en `/exec`).
7. En el cotizador tocá **Conectar con Google**, pegá la URL y tu clave, y listo.

La URL y la clave quedan guardadas solo en tu navegador. Sin la clave, nadie puede leer ni escribir tus datos aunque tenga la URL.

Si después cambiás el código del script: **Implementar › Gestionar implementaciones › lápiz › Versión: Nueva versión › Implementar** (la URL sigue siendo la misma).

### Qué queda en tu Google

- Hoja **Cotizaciones**: pieza, material, impresora, gramos, tiempo, costo, precio y links a los archivos.
- Hoja **Pedidos**: cliente, contacto, entrega, estado, total, cobrado, saldo, envío, piezas y notas.
- Hojas ocultas **Config** e **Imagenes**: tu taller y las miniaturas de las piezas.
- Carpeta de Drive **Quirón 3D – Pedidos** con los STL, gcode y fotos (hasta 15 MB por archivo).
- Eventos de día completo en tu Calendar con la fecha de entrega y aviso el día anterior.

Editá la planilla a mano con cuidado: la columna **datos** es la que usa el cotizador.
