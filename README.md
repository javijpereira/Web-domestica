# Mi Casa 2.4 — Personal & Mobile

## Cambios
- Preferencias del dashboard independientes por cuenta Firebase (`users/{uid}.preferences`).
- Secciones activables/desactivables y ordenables desde Configuración.
- Tema claro/oscuro guardado por usuario y sincronizado entre dispositivos.
- Ajustes de contraste del tema oscuro para tarjetas, textos, formularios, agenda, calendario, menús y navegación.
- Dashboard reorganizado en un único contenedor para permitir ordenar todas las tarjetas.
- Ajustes mobile-first para Android e iPhone: `viewport-fit=cover`, áreas seguras, controles táctiles, tipografía de formularios de 16px, diálogos y calendario adaptables.

## Instalación
1. Haz una copia de seguridad de la versión publicada.
2. Sustituye los archivos por los de esta carpeta manteniendo la ruta de publicación actual.
3. Publica la aplicación y limpia/actualiza la caché del navegador o instala de nuevo la PWA si fuera necesario.
4. Inicia sesión con dos cuentas familiares diferentes y comprueba que cada una mantiene su propio tema, visibilidad y orden.

## Nota sobre Firebase
Las preferencias se guardan como campo `preferences` en el documento `users/{uid}` usando `setDoc(..., {merge:true})`. Las reglas de Firestore deben permitir que cada usuario lea y actualice su propio documento `users/{uid}`. No se modifican reglas de seguridad desde este paquete.

## Pruebas pendientes antes de producción
- Validar las reglas de Firestore del proyecto real.
- Probar dos cuentas de una misma familia en dos dispositivos.
- Probar iOS Safari/PWA y Android Chrome/PWA en dispositivos físicos.
- Comprobar contraste visual de cada pantalla y componentes añadidos por futuras versiones.
