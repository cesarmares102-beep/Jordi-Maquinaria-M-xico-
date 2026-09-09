/* ==========================================================================
   Jordi Maquinaria — i18n
   --------------------------------------------------------------------------
   El HTML se sirve en INGLÉS (idioma por defecto, sin parpadeo). Este módulo
   guarda el inglés de cada nodo y aplica el diccionario español cuando el
   usuario cambia de idioma. La elección persiste en localStorage.
   Se carga ANTES de cinematic.js (defer) para que el motor arranque con el
   texto correcto.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'jm-lang';
  var DEFAULT = 'en';

  /* --- Diccionario español. El inglés es el contenido literal del HTML. --- */
  var ES = {
    /* meta */
    'meta.title': 'Jordi Maquinaria — Corte, doblado y troquelado de metal en México',
    'meta.description': 'Más de 50 años proveyendo maquinaria industrial de corte, doblado y troquelado en México. Asesoría especializada y marcas de alto rendimiento. Cotiza tu equipo.',
    'og.title': 'Jordi Maquinaria — Transforma el metal en grandes ideas',
    'og.description': 'Soluciones en corte, doblado y troquelado para una industria más competitiva en México.',

    /* cabecera / navegación */
    'skip': 'Saltar al contenido',
    'brand.aria': 'Jordi Maquinaria — inicio',
    'nav.aria': 'Navegación principal',
    'indicator.aria': 'Navegación por escenas',
    'lang.aria': 'Idioma',
    'nav.equipment': 'Equipos',
    'nav.applications': 'Aplicaciones',
    'nav.about': 'Nosotros',
    'nav.contact': 'Contacto',
    'cta.quoteNow': 'Cotiza ahora <i aria-hidden="true">→</i>',

    /* hero */
    'hero.media.aria': 'Corte por láser de una placa de acero',
    'hero.eyebrow': 'Maquinaria industrial',
    'hero.title': 'Transforma <span>el metal</span> en <span class="hl">grandes ideas</span>',
    'hero.intro': 'Soluciones en corte, doblado y troquelado para una industria más competitiva en México.',
    'hero.btnQuote': 'Cotiza tu equipo <i aria-hidden="true">→</i>',
    'hero.btnExplore': 'Explora equipos',
    'hero.marqueeAria': 'Tipos de maquinaria de Jordi Maquinaria',

    /* tipos de maquinaria (marquesina) */
    'mq.1': 'Láser',
    'mq.2': 'Sierras de banda',
    'mq.3': 'Sierras de disco',
    'mq.4': 'Cizallas',
    'mq.5': 'Waterjet',
    'mq.6': 'Dobladoras',
    'mq.7': 'Roladoras',
    'mq.8': 'Curvadoras',
    'mq.9': 'Punzonadoras',
    'mq.10': 'Prensas',
    'mq.11': 'Alimentadores a prensa',

    /* equipos */
    'eq.eyebrow': 'Nuestros equipos',
    'eq.title': 'Tecnología para <span>cada necesidad</span>',
    'eq.text': 'Una selección de maquinaria de alto rendimiento, respaldada por las mejores marcas del mundo.',
    'eq.catalog': 'Ver catálogo completo →',
    'eq.cta': 'Ver equipos <span aria-hidden="true">→</span>',
    'eq.c1.title': 'Corte',
    'eq.c1.alt': 'Corte de metal con proyección de chispas',
    'eq.c1.l1': 'Láser', 'eq.c1.l2': 'Sierras', 'eq.c1.l3': 'Cizallas', 'eq.c1.l4': 'Water Jet',
    'eq.c2.title': 'Doblado',
    'eq.c2.alt': 'Máquina dobladora de metal en operación',
    'eq.c2.l1': 'Dobladoras', 'eq.c2.l2': 'Roladoras', 'eq.c2.l3': 'Curvadoras',
    'eq.c3.title': 'Troquelado',
    'eq.c3.alt': 'Maquinaria de troquelado y punzonado de metal',
    'eq.c3.l1': 'Punzonadoras', 'eq.c3.l2': 'Prensas', 'eq.c3.l3': 'Alimentadores',
    'eq.c4.title': 'Automatización',
    'eq.c4.alt': 'Automatización industrial: carga y descarga de lámina',
    'eq.c4.l1': 'Automatización', 'eq.c4.l2': 'Alimentación', 'eq.c4.l3': 'Carga / Descarga',

    /* calidad / origen */
    'or.eyebrow': 'Calidad / Origen',
    'or.flag.aria': 'Unión Europea',
    'or.title': 'Calidad europea<br />que <span class="hl">marca la diferencia</span>',
    'or.lead': 'En Jordi Maquinaria ofrecemos soluciones industriales desarrolladas bajo altos estándares europeos de calidad, precisión y durabilidad. Tecnología concebida para responder a las exigencias reales de la fabricación.',
    'or.marqueeAria': 'Pilares de calidad de Jordi Maquinaria',
    'or.p1.label': 'Tecnología', 'or.p1.desc': 'Soluciones de última generación',
    'or.p2.label': 'Precisión', 'or.p2.desc': 'Resultados consistentes en cada proceso',
    'or.p3.label': 'Calidad', 'or.p3.desc': 'Fabricación bajo estándares europeos',
    'or.p4.label': 'Experiencia', 'or.p4.desc': 'Tecnología aplicada a la industria real',
    'or.cta': 'Conoce nuestros procesos <i aria-hidden="true">→</i>',
    'or.media.aria': 'Maquinaria de corte por láser de precisión de Jordi Maquinaria',
    'or.stamp.kicker': 'European engineering',
    'or.stamp.made': 'Made in',
    'or.stamp.europe': 'Europe',
    'or.stamp.tags': 'Precisión · Ingeniería · Calidad · Confianza',

    /* nosotros */
    'ab.eyebrow': 'Sobre Jordi',
    'ab.title': 'Más de 50 años moviendo la industria',
    'ab.text': 'Experiencia, precisión y un equipo especializado para llevar cada proyecto más lejos.',
    'ab.fact1': 'años de experiencia',
    'ab.fact2': 'clientes en México',
    'ab.fact3': 'equipos instalados',
    'ab.ben1': 'Asesoría especializada',
    'ab.ben2': 'Marcas de alto rendimiento',
    'ab.catalog': 'Conoce nuestra historia →',
    'ab.media.aria': 'Estructura industrial de acero',
    'ab.media.caption': 'Experiencia<br />que transforma<br />el metal',

    /* aplicaciones */
    'ap.eyebrow': 'Aplicaciones',
    'ap.title': 'Soluciones reales para industrias reales',
    'ap.btnAll': 'Ver todas las aplicaciones <i aria-hidden="true">→</i>',
    'ap.trackAria': 'Aplicaciones industriales de Jordi Maquinaria',
    'ap.readMore': 'Leer más',
    'ap.readLess': 'Leer menos',

    'ap.1.aria': 'Iluminación pública urbana de noche',
    'ap.1.industry': 'Iluminación pública',
    'ap.1.title': 'Tecnología para estructuras que resisten',
    'ap.1.t1': 'Con tecnología Jordi Maquinaria, los fabricantes de alumbrado público pueden llevar la fabricación de brazos, báculos y farolas a un proceso más preciso, flexible y eficiente.',
    'ap.1.t2': 'Nuestras soluciones de corte por láser de fibra permiten trabajar estructuras metálicas con altos niveles de precisión, contribuyendo a obtener productos terminados con mayor resistencia y durabilidad.',
    'ap.1.t3': 'Contamos con amplia experiencia en este tipo de aplicaciones y entendemos las exigencias que implica fabricar componentes destinados a permanecer expuestos y cumplir durante años.',
    'ap.1.f1': 'La tecnología de corte por láser de fibra permite optimizar diferentes etapas de fabricación de los elementos utilizados en iluminación pública. La precisión del proceso facilita la realización de geometrías y cortes complejos, mientras que la flexibilidad de la tecnología permite adaptarse a diferentes diseños y necesidades de producción.',
    'ap.1.f2': 'Con tecnología Jordi Maquinaria, los fabricantes pueden disponer de soluciones orientadas a mejorar la flexibilidad del proceso productivo, optimizar tiempos de fabricación y conseguir componentes con acabados precisos y consistentes.',
    'ap.1.f3': 'Desde brazos y báculos hasta diferentes configuraciones de farolas y estructuras metálicas, nuestras soluciones están diseñadas para responder a las necesidades reales de fabricación del sector.',

    'ap.2.aria': 'Detalle frontal de un automóvil en producción',
    'ap.2.industry': 'Industria del automóvil',
    'ap.2.title': 'Precisión para una industria que no admite errores',
    'ap.2.t1': 'La industria automotriz exige precisión, velocidad y consistencia en cada componente. Con tecnología Jordi Maquinaria, el corte por láser se convierte en una solución capaz de responder a las exigencias de una de las industrias más avanzadas del mundo.',
    'ap.2.t2': 'Nuestras soluciones pueden utilizarse tanto para el procesamiento de chapa como para la fabricación de componentes y piezas destinadas al interior del vehículo.',
    'ap.2.f1': 'La industria del automóvil es uno de los sectores en los que la precisión del proceso de fabricación tiene mayor importancia.',
    'ap.2.f2': 'Con tecnología Jordi Maquinaria, las empresas pueden utilizar soluciones de corte por láser de fibra para diferentes aplicaciones dentro del proceso productivo, desde el procesamiento de chapa hasta la fabricación de componentes destinados al interior del vehículo.',
    'ap.2.f3': 'La precisión y consistencia del corte por láser permiten obtener geometrías definidas y acabados uniformes, características especialmente importantes cuando se trabaja con componentes que deben integrarse posteriormente en sistemas y estructuras más complejas.',
    'ap.2.f4': 'Nuestra tecnología está orientada a fabricantes que buscan mejorar la eficiencia de sus procesos y disponer de una solución flexible capaz de adaptarse a diferentes necesidades de producción.',

    'ap.3.aria': 'Ala de una aeronave sobre las nubes',
    'ap.3.industry': 'Aeronáutica y aeroespacial',
    'ap.3.title': 'Tecnología para procesos donde la precisión lo cambia todo',
    'ap.3.t1': 'En la industria aeronáutica y aeroespacial, cada componente está sujeto a exigencias extraordinarias. Jordi Maquinaria aporta tecnología de corte diseñada para acompañar procesos industriales donde la precisión, la calidad y la flexibilidad son fundamentales.',
    'ap.3.t2': 'Más que proporcionar maquinaria, acompañamos a cada cliente en la búsqueda de la solución tecnológica adecuada para su proceso de fabricación.',
    'ap.3.f1': 'La industria aeronáutica y aeroespacial representa uno de los entornos de fabricación con mayores exigencias técnicas.',
    'ap.3.f2': 'Con tecnología Jordi Maquinaria, nuestro objetivo es adaptar las posibilidades del corte por láser a las necesidades concretas de cada proceso y aplicación.',
    'ap.3.f3': 'Desde nuestro departamento comercial y técnico acompañamos a nuestros clientes durante la definición de la solución, analizando las características de los materiales, las geometrías, los volúmenes de producción y las necesidades específicas de cada proyecto.',
    'ap.3.f4': 'La inversión continua en tecnología y desarrollo nos permite ampliar las posibilidades de aplicación del corte por láser y ofrecer soluciones capaces de responder a procesos industriales cada vez más exigentes.',
    'ap.3.f5': 'Porque en sectores de alta precisión, la tecnología no debe limitar el proceso: debe hacerlo posible.',

    'ap.4.aria': 'Estructura arquitectónica de acero y vidrio',
    'ap.4.industry': 'Ascensores y elevadores',
    'ap.4.title': 'Precisión que se convierte en eficiencia',
    'ap.4.t1': 'La fabricación de ascensores requiere componentes precisos, uniformes y consistentes. Con tecnología Jordi Maquinaria, el corte por láser de fibra permite procesar materiales como el acero inoxidable con alta precisión y velocidad, reduciendo tiempos y optimizando costes de producción.',
    'ap.4.f1': 'Los fabricantes de ascensores y elevadores necesitan procesos capaces de mantener altos niveles de precisión y uniformidad en cada componente.',
    'ap.4.f2': 'El corte por láser de fibra ofrece una solución especialmente adecuada para este tipo de fabricación, donde el acero inoxidable ocupa un papel fundamental y la calidad del corte tiene un impacto directo en el resultado final.',
    'ap.4.f3': 'Con tecnología Jordi Maquinaria, es posible procesar materiales con gran velocidad y precisión, optimizando los tiempos de fabricación y reduciendo los costes asociados al proceso.',
    'ap.4.f4': 'Al tratarse de un proceso de corte sin contacto, se minimiza el riesgo de deformación del material y se consigue una elevada consistencia en las piezas fabricadas.',
    'ap.4.f5': 'El resultado es un proceso más flexible, rápido y eficiente, capaz de adaptarse a diferentes diseños y necesidades de producción.',

    'ap.5.aria': 'Tractor trabajando en un campo de cultivo',
    'ap.5.industry': 'Industria agrícola',
    'ap.5.title': 'Más velocidad para una industria que nunca se detiene',
    'ap.5.t1': 'La maquinaria agrícola necesita componentes resistentes, precisos y capaces de soportar procesos de fabricación exigentes. Jordi Maquinaria aporta tecnología de corte por láser de fibra para acelerar la producción, mejorar la eficiencia y optimizar los costes de fabricación.',
    'ap.5.f1': 'La evolución de la industria agrícola ha llevado a los fabricantes de maquinaria y equipos a incorporar procesos tecnológicos cada vez más avanzados.',
    'ap.5.f2': 'En este contexto, el corte por láser de fibra permite procesar piezas metálicas con gran precisión y velocidad, convirtiéndose en una herramienta estratégica para mejorar los procesos de fabricación.',
    'ap.5.f3': 'Con tecnología Jordi Maquinaria, los fabricantes pueden trabajar piezas de acero de diferentes espesores y optimizar tanto la velocidad como la eficiencia del proceso de corte.',
    'ap.5.f4': 'En aplicaciones donde se procesan habitualmente piezas de acero de aproximadamente 4 a 6 mm, la tecnología láser puede representar una alternativa eficiente frente a otros sistemas de corte, permitiendo reducir tiempos de fabricación y optimizar costes.',
    'ap.5.f5': 'La combinación de velocidad, precisión y flexibilidad permite responder a las necesidades de una industria que requiere producir más, mejor y de forma cada vez más eficiente.',

    'ap.6.aria': 'Estructuras metálicas de mobiliario urbano',
    'ap.6.industry': 'Mobiliario urbano',
    'ap.6.title': 'Diseño y precisión para transformar el espacio público',
    'ap.6.t1': 'El mobiliario urbano exige funcionalidad, resistencia y diseño. Con tecnología Jordi Maquinaria, el corte por láser permite transformar chapa metálica en componentes precisos para crear bancos, barandales, barreras de seguridad y diferentes elementos destinados al espacio público.',
    'ap.6.f1': 'El corte por láser abre nuevas posibilidades para la transformación de productos metálicos destinados al mobiliario urbano.',
    'ap.6.f2': 'La precisión y flexibilidad del proceso permiten realizar diferentes geometrías y patrones de corte para fabricar componentes utilizados en bancos, barandales, barreras de seguridad, elementos de protección y otras estructuras metálicas.',
    'ap.6.f3': 'Con tecnología Jordi Maquinaria, los fabricantes pueden trabajar diferentes materiales y espesores, adaptando el proceso a las características concretas de cada proyecto.',
    'ap.6.f4': 'Nuestros equipos pueden realizar cortes de hasta 25 mm en acero, 20 mm en acero inoxidable y 15 mm en aluminio, ampliando las posibilidades de fabricación y diseño.',
    'ap.6.f5': 'El resultado es una tecnología capaz de convertir una pieza de chapa en un componente funcional, preciso y preparado para formar parte del entorno urbano.',

    /* contacto */
    'co.title': 'Hablemos de tu proyecto',
    'co.text': 'Nuestro equipo de especialistas está listo para asesorarte y ofrecerte la mejor solución.',
    'co.f.name': 'Nombre completo',
    'co.f.company': 'Empresa',
    'co.f.phone': 'Teléfono o WhatsApp',
    'co.f.email': 'Correo electrónico',
    'co.f.interest': '¿Qué equipo te interesa?',
    'co.f.opt0': 'Selecciona una opción',
    'co.f.opt1': 'Corte',
    'co.f.opt2': 'Doblado',
    'co.f.opt3': 'Troquelado',
    'co.f.opt4': 'Sierras',
    'co.f.opt5': 'Procesamiento de lámina',
    'co.f.opt6': 'Otro',
    'co.f.submit': 'Solicitar cotización <i aria-hidden="true">→</i>',
    'co.info.title': 'Contáctanos',
    'co.info.loc': 'Querétaro, México.<small>Polígono Empresarial Santa Rosa Jáuregui,<br />Av. Hércules #301 A, Bodega 13, C.P. 76220.</small>',
    'co.motto': 'Más industria.<br />Más posibilidades.',

    /* cadenas que usa cinematic.js (no están en el DOM) */
    'form.checkFields': 'Revisa los campos obligatorios: nombre, teléfono y correo.',
    'form.mailOpened': 'Se abrió tu cliente de correo con los datos. Envía el mensaje para completar la solicitud.',
    'form.sending': 'Enviando…',
    'form.sent': '¡Gracias! Tu solicitud fue enviada. Te contactaremos pronto.',
    'form.sendError': 'No se pudo enviar. Escríbenos a ventas@jordimaquinaria.mx',
    'form.offline': 'Sin conexión. Escríbenos a ventas@jordimaquinaria.mx',
    'form.mailSubject': 'Solicitud de cotización — Jordi Maquinaria'
  };

  /* inglés para las cadenas que NO viven en el DOM */
  var EN_JS = {
    'ap.readMore': 'Read more',
    'ap.readLess': 'Read less',
    'form.checkFields': 'Please check the required fields: name, phone and email.',
    'form.mailOpened': 'Your email client opened with the details. Send the message to complete your request.',
    'form.sending': 'Sending…',
    'form.sent': 'Thank you! Your request was sent. We will contact you soon.',
    'form.sendError': "Couldn't send. Write to us at ventas@jordimaquinaria.mx",
    'form.offline': 'No connection. Write to us at ventas@jordimaquinaria.mx',
    'form.mailSubject': 'Quote request — Jordi Maquinaria'
  };

  /* --- captura del inglés presente en el DOM --- */
  var textNodes = [].slice.call(document.querySelectorAll('[data-i18n]'));
  var ariaNodes = [].slice.call(document.querySelectorAll('[data-i18n-aria]'));
  var altNodes = [].slice.call(document.querySelectorAll('[data-i18n-alt]'));

  var EN = {};
  // metadatos: el inglés por defecto es lo que ya trae el <head>
  EN['meta.title'] = document.title;
  var _md = document.querySelector('meta[name="description"]');
  if (_md) EN['meta.description'] = _md.getAttribute('content');
  var _ot = document.querySelector('meta[property="og:title"]');
  if (_ot) EN['og.title'] = _ot.getAttribute('content');
  var _od = document.querySelector('meta[property="og:description"]');
  if (_od) EN['og.description'] = _od.getAttribute('content');

  textNodes.forEach(function (n) { EN[n.getAttribute('data-i18n')] = n.innerHTML; });
  ariaNodes.forEach(function (n) {
    var k = n.getAttribute('data-i18n-aria');
    if (!(k in EN)) EN[k] = n.getAttribute('aria-label') || '';
  });
  altNodes.forEach(function (n) {
    var k = n.getAttribute('data-i18n-alt');
    if (!(k in EN)) EN[k] = n.getAttribute('alt') || '';
  });

  function val(lang, key) {
    if (lang === 'es') return (key in ES) ? ES[key] : (EN[key] != null ? EN[key] : (EN_JS[key] != null ? EN_JS[key] : key));
    return (EN[key] != null) ? EN[key] : (EN_JS[key] != null ? EN_JS[key] : key);
  }

  function setMeta(sel, content) {
    var m = document.querySelector(sel);
    if (m) m.setAttribute('content', content);
  }

  var current = DEFAULT;
  try { var stored = localStorage.getItem(KEY); if (stored === 'es' || stored === 'en') current = stored; } catch (e) {}

  function apply(lang) {
    current = lang;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    document.documentElement.lang = lang;

    textNodes.forEach(function (n) { n.innerHTML = val(lang, n.getAttribute('data-i18n')); });
    ariaNodes.forEach(function (n) { n.setAttribute('aria-label', val(lang, n.getAttribute('data-i18n-aria'))); });
    altNodes.forEach(function (n) { n.setAttribute('alt', val(lang, n.getAttribute('data-i18n-alt'))); });

    document.title = val(lang, 'meta.title');
    setMeta('meta[name="description"]', val(lang, 'meta.description'));
    setMeta('meta[property="og:title"]', val(lang, 'og.title'));
    setMeta('meta[property="og:description"]', val(lang, 'og.description'));
    setMeta('meta[property="og:locale"]', lang === 'es' ? 'es_MX' : 'en_US');

    [].slice.call(document.querySelectorAll('[data-lang-btn]')).forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-btn') === lang));
    });

    window.__lang = lang;
    window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }

  /* API para cinematic.js */
  window.__t = function (key) { return val(current, key); };
  window.jmSetLang = apply;
  Object.defineProperty(window, '__lang', { value: current, writable: true, configurable: true });

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-lang-btn]') : null;
    if (!b) return;
    e.preventDefault();
    var l = b.getAttribute('data-lang-btn');
    if (l && l !== current) apply(l);
  });

  apply(current);
})();
