const padronInput = document.getElementById("padronInput");
const departamentoSelect = document.getElementById("departamentos");
const btnBuscar = document.getElementById("btnBuscar");

function validarBotonBuscar() {
  const padronValido = padronInput.value.trim() !== "";
  const deptoValido = departamentoSelect.value !== "";
  btnBuscar.disabled = !(padronValido && deptoValido);
}

// Escuchar cambios en ambos campos
padronInput.addEventListener("input", validarBotonBuscar);
departamentoSelect.addEventListener("change", validarBotonBuscar);

// Validación inicial (por si el navegador autocompleta)
validarBotonBuscar();

/* ============================================================
        HISTORIAL DE PADRONES BUSCADOS (últimos 10)
        ============================================================ */
const MAX_HISTORIAL = 10;
//const STORAGE_KEY = 'historialPadrones';
let historialPadrones = [];
let pdfURL = null;

function agregarAlHistorial(padron, cod_depto) {
  const p = [String(padron).trim(), cod_depto];
  if (!p) return;
  historialPadrones = historialPadrones.filter((x) => x[0] !== p[0]);
  historialPadrones.unshift(p);
  if (historialPadrones.length > MAX_HISTORIAL) {
    historialPadrones = historialPadrones.slice(0, MAX_HISTORIAL);
  }
  renderizarHistorial();
}

function obtenerHistorial() {
  return historialPadrones;
}

function limpiarHistorial() {
  historialPadrones = [];
  renderizarHistorial();
}

/**
 * Dibuja los botones del historial en el contenedor.
 */
function renderizarHistorial() {
  const contenedor = document.getElementById("historialPadrones");
  if (!contenedor) return;

  const historial = obtenerHistorial();

  // Limpiar contenedor
  contenedor.innerHTML = "";

  // Si está vacío, no mostrar nada (o un mensaje sutil)
  if (historial.length === 0) {
    return;
  }

  // Etiqueta opcional
  const etiqueta = document.createElement("span");
  etiqueta.className =
    "text-[10px] uppercase tracking-wider text-slate-500 font-semibold mr-1";
  etiqueta.textContent = "Recientes:";
  contenedor.appendChild(etiqueta);

  // Crear un botón por cada padrón
  historial.forEach((padron) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = padron[0];
    btn.dataset.padron = padron[0];
    btn.dataset.depto = padron[1];

    // Clases Tailwind coherentes con el tema
    btn.className =
      "text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded font-medium transition text-emerald-300 shadow";

    // Al hacer click: ejecutar buscarPadron con el número
    btn.addEventListener("click", () => {
      document.getElementById("padronInput").value = padron[0];
      document.getElementById("departamentos").value = padron[1];
      buscarPadron(padron[0], padron[1]);
    });

    contenedor.appendChild(btn);
  });

  const btnLimpiar = document.createElement("button");
  btnLimpiar.type = "button";
  btnLimpiar.textContent = "Limpiar Historial";
  btnLimpiar.className =
    "bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:hover:bg-slate-600 text-white text-xs font-semibold px-4 py-1.5 rounded transition shadow";
  btnLimpiar.addEventListener("click", () => {
    limpiarHistorial();
  });

  contenedor.appendChild(btnLimpiar);
}

document.addEventListener("DOMContentLoaded", () => {
  renderizarHistorial();
});

async function obtenerCoordenadas(numero_padron, codigo_depto) {
  const inputVal = document.getElementById("padronInput").value.trim();
  const codDepto = document.getElementById("departamentos").value;
  //const dataset = dataPadrones[inputVal];

  if (!inputVal) {
    showAlert(
      "Padrón no encontrado. Ingrese un número válido como 6964, 6966, 6967 o 6968",
    );
    return;
  }

  const url =
    "https://web.snig.gub.uy/arcgisserver/rest/services/Uruguay/SNIG_Catastro/MapServer/0/query?f=json&where=codDepto%20%3D%20%27" +
    codDepto +
    "%27%20AND%20NroPadron%20%3D%20" +
    numero_padron +
    "%20AND%20SUBSTRING(Codigo%2C%202%2C%202)%20%3D%20%27ZZ%27&returnGeometry=true&spatialRel=esriSpatialRelIntersects&outFields=codDepto%2CDeptoPadron%2CCodigo%2CNroPadron%2CcodLocCat%2COBJECTID%2Ctipo&outSR=32721";

  try {
    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();

    // Validar que existan features y geometría
    if (!data.features || data.features.length === 0) {
      showAlert("El padrón ingresado no existe.");
    }

    // Extraer el array de coordenadas del atributo rings
    // rings es un array de anillos (polígonos con posibles huecos), cada anillo es un array de pares [x, y]
    const rings = data.features[0].geometry.rings;

    console.log("Array de coordenadas (rings):", rings);
    console.log("Cantidad de anillos: ", rings.length);
    return rings;
  } catch (error) {
    console.error("Error al obtener las coordenadas:", error);
    return null;
  }
}

async function obtenerArea(numero_padron, codigo_depto) {
  const url =
    "https://dgrn.mgap.gub.uy/arcgis/rest/services/CONEAT/IndicesConeat/MapServer/0/query?f=json&where=ID2%3D%27" +
    codigo_depto +
    "-" +
    numero_padron +
    "%27%20&returnGeometry=true&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=102100";

  try {
    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const area = await response.json();

    // Validar que existan features
    if (!area.features || area.features.length === 0) {
      //showAlert("Indice de productividad no encontrado.");
      return null;
    }

    return area.features[0].attributes;
  } catch (error) {
    console.error("Error al obtener el area:", error);
    return null;
  }
}

async function obtenerArea2(numero_padron, codigo_depto) {
  const url =
    "http://gis.catastro.gub.uy/arcgis/rest/services/v2022/Mapa_Base_DNCv_11_2022Prod/MapServer/14/query?f=json" +
    "&where=" +
    encodeURIComponent(
      `NUMDEPTO = ${codigo_depto} AND NUMPAD = ${numero_padron}`,
    ) +
    "&returnGeometry=false" +
    "&spatialRel=esriSpatialRelIntersects" +
    "&outFields=*";

  try {
    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();

    // Validar que existan features
    if (!data.features || data.features.length === 0) {
      //showAlert("Área no encontrada en Catastro.");
      return null;
    }

    return data.features[0].attributes;
  } catch (error) {
    console.error("Error al obtener el área (Catastro):", error);
    return null;
  }
}

async function obtenerJOBID(numero_padron, codigo_depto) {
  const url =
    "https://dgrn.mgap.gub.uy/arcgis/rest/services/CONEAT/gpCroquisParcelas/GPServer/CroquisParcelas/submitJob?f=json&Padrones=" +
    codigo_depto +
    "-" +
    numero_padron;

  try {
    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const jobid = await response.json();

    // Validar que existan features
    if (!jobid) {
      //showAlert("Indice de productividad no encontrado.");
      return null;
    }

    return jobid.jobId;
  } catch (error) {
    console.error("Error al obtener el JOB Id:", error);
    return null;
  }
}

async function obtenerURLConeat(jobId) {
  const url =
    "https://dgrn.mgap.gub.uy/arcgis/rest/services/CONEAT/gpCroquisParcelas/GPServer/CroquisParcelas/jobs/" +
    jobId +
    "/results/Croquis?f=json&returnType=data";

  try {
    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const pdfConeat = await response.json();

    // Validar que existan features
    if (!pdfConeat || !pdfConeat.value) {
      //showAlert("Indice de productividad no encontrado.");
      return null;
    }

    return pdfConeat.value.url;
  } catch (error) {
    console.error("Error al obtener el JOB Id:", error);
    return null;
  }
}

function buscarPadron(numero_padron, codigo_depto) {
  // Uso
  obtenerCoordenadas(numero_padron, codigo_depto).then((rings) => {
    if (rings) {
      try {
        const rings_len = rings.length;

        for (var i = 0; i < rings_len; i++) {
          currentPolygonLatLngs = rings[i].map((coord) => {
            const converted = utmToLatLon(coord[0], coord[1], 21, true);
            return [converted[0], converted[1]];
          });

          currentPolygonLayer = L.polygon(currentPolygonLatLngs, {
            color: "#34d399",
            weight: 3,
            fillColor: "#10b981",
            fillOpacity: 0.0,
          }).addTo(map);
        }

        map.fitBounds(currentPolygonLayer.getBounds(), { padding: [50, 50] });

        /*obtenerArea(numero_padron, codigo_depto).then((area) => {
          currentAttributes = area;
          obtenerJOBID(numero_padron, codigo_depto).then((jobId) => {
            setTimeout(function () {
              obtenerURLConeat(jobId).then((url) => {
                pdfURL = url;
                actualizarCardConDistancias();
                agregarAlHistorial(numero_padron, codigo_depto);
              });
            }, 2000);
          });
        });*/

        obtenerArea(numero_padron, codigo_depto).then((area) => {
          currentAttributes = area;

          if (area === null) {
            // Sin resultados en CONEAT → consultar Catastro
            const control_deptos = document.getElementById("departamentos");
            const numero_Depto =
              control_deptos.options[control_deptos.selectedIndex].attributes[
                "data-code"
              ].value;

            obtenerArea2(numero_padron, numero_Depto).then(
              (attributesArray) => {
                currentAttributesCatastro = attributesArray;
                console.log("Attributes Catastro:", attributesArray);
                continuarFlujo(numero_padron, codigo_depto);
              },
            );
          } else {
            // CONEAT devolvió datos → flujo normal
            continuarFlujo(numero_padron, codigo_depto);
          }
        });
      } catch (error) {
        console.error("Error al buscar padrón:", error);
        showAlert("Ocurrió un error al procesar la geometría del padrón.");
      }
    }
  });
}

function continuarFlujo(numero_padron, codigo_depto) {
  obtenerJOBID(numero_padron, codigo_depto).then((jobId) => {
    setTimeout(function () {
      obtenerURLConeat(jobId).then((url) => {
        pdfURL = url;
        actualizarCardConDistancias();
        agregarAlHistorial(numero_padron, codigo_depto);
      });
    }, 2000);
  });
}

// Initialize map centered around Uruguay
const map = L.map("map").setView([-30.5, -57.0], 11);

// Add Esri World Imagery Satellite Tile Layer
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    detectRetina: true,
  },
).addTo(map);

let currentPolygonLayer = null;
let userMarker = null;
let fallbackMarker = null;
let userLocationCoords = null;
let currentAttributes = null;
let currentAttributesCatastro = null;
let currentPolygonLatLngs = null;

// Default fallback location requested
const fallbackCoords = [-30.4042769, -56.4730174];

// Add fallback marker initially
fallbackMarker = L.marker(fallbackCoords, {
  title: "Ubicación por defecto",
})
  .addTo(map)
  .bindPopup("<b>Ubicación por defecto</b><br>-30.4042769, -56.4730174");

function utmToLatLon(easting, northing, zone = 21, southernHemisphere = true) {
  const a = 6378137.0;
  const eccSquared = 0.00669437999014;
  const k0 = 0.9996;

  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));

  let x = easting - 500000.0;
  let y = northing;
  if (southernHemisphere) {
    y -= 10000000.0;
  }

  const M = y / k0;
  const mu =
    M /
    (a *
      (1 -
        eccSquared / 4 -
        (3 * eccSquared * eccSquared) / 64 -
        (5 * eccSquared * eccSquared * eccSquared) / 256));

  const phi1Rad =
    mu +
    ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) * Math.sin(4 * mu) +
    ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu);

  const N1 =
    a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  const T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  const C1 =
    (eccSquared * Math.cos(phi1Rad) * Math.cos(phi1Rad)) / (1 - eccSquared);
  const R1 =
    (a * (1 - eccSquared)) /
    Math.pow(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  const D = x / (N1 * k0);

  const latRad =
    phi1Rad -
    ((N1 * Math.tan(phi1Rad)) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccSquared) *
          D *
          D *
          D *
          D) /
          24 +
        ((61 +
          90 * T1 +
          298 * C1 +
          45 * T1 * T1 -
          252 * eccSquared -
          3 * C1 * C1) *
          D *
          D *
          D *
          D *
          D *
          D) /
          720);

  const lonRad =
    (D -
      ((1 + 2 * T1 + C1) * D * D * D) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eccSquared + 24 * T1 * T1) *
        D *
        D *
        D *
        D *
        D) /
        120) /
    Math.cos(phi1Rad);

  const centralMeridian = ((zone * 6 - 183) * Math.PI) / 180;
  const lonRadFinal = centralMeridian + lonRad;

  return [(latRad * 180) / Math.PI, (lonRadFinal * 180) / Math.PI];
}

function calcularDistanciaMinima(puntoLatLon, latLngsPolygon) {
  let minDistance = Infinity;
  const p1 = L.latLng(puntoLatLon[0], puntoLatLon[1]);

  latLngsPolygon.forEach((coord) => {
    const p2 = L.latLng(coord[0], coord[1]);
    const dist = p1.distanceTo(p2); // distance in meters
    if (dist < minDistance) {
      minDistance = dist;
    }
  });
  return Math.round(minDistance);
}

function obtenerUbicacionActual() {
  if (!navigator.geolocation) {
    showAlert("Su navegador no soporta geolocalización.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      userLocationCoords = [lat, lon];

      if (userMarker) {
        map.removeLayer(userMarker);
      }

      userMarker = L.marker([lat, lon], {
        title: "Mi Ubicación GPS",
      })
        .addTo(map)
        .bindPopup("<b>Tu ubicación GPS actual</b>")
        .openPopup();

      map.setView([lat, lon], 13);
      actualizarCardConDistancias();
    },
    (error) => {
      console.warn(
        "No se pudo obtener la ubicación GPS, usando fallback:",
        error,
      );
      showAlert(
        "No se pudo obtener la ubicación GPS en tiempo real. Posicionando en la ubicación por defecto.",
      );
      userLocationCoords = fallbackCoords;
      map.setView(fallbackCoords, 12);
      actualizarCardConDistancias();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}

function seleccionarPadron(padronNum, codigo_depto) {
  document.getElementById("padronInput").value = padronNum;
  buscarPadron(padronNum, codigo_depto);
}

function actualizarCardConDistancias() {
  //if (!currentAttributes || !currentPolygonLatLngs) return;

  const card = document.getElementById("infoCard");
  const title = document.getElementById("cardTitle");
  const content = document.getElementById("cardContent");

  const padron_value = document.getElementById("padronInput").value;
  const depto_control = document.getElementById("departamentos");
  const depto_text = depto_control.options[depto_control.selectedIndex].text;

  title.innerText = `Padrón N° ${padron_value}`;

  // Calculate distance from default fallback location
  const distanciaFallback = calcularDistanciaMinima(
    fallbackCoords,
    currentPolygonLatLngs,
  );

  // Calculate distance from GPS location if available
  let gpsHtml = `<p class="text-slate-400 italic">GPS: Haga clic en "Mi Ubicación"</p>`;
  if (userLocationCoords) {
    const distanciaGps = calcularDistanciaMinima(
      userLocationCoords,
      currentPolygonLatLngs,
    );
    gpsHtml = `<p class="text-sky-300"><strong>Distancia desde GPS:</strong> ${distanciaGps.toLocaleString()} metros</p>`;
  }

  if (!currentAttributes && !currentAttributesCatastro) {
    content.innerHTML = `
                    <p><strong>Departamento:</strong> ${depto_text}</p>
                    <p><img src="exclamation-triangle.svg" class="alert_svg">&nbsp;<strong>Índice de Productividad no encontrado.</strong></p>
                    <hr class="border-slate-700 my-1">
                    <p class="text-amber-300"><strong>Distancia (Ubicación por defecto):</strong> ${distanciaFallback.toLocaleString()} metros</p>
                    ${gpsHtml}
                `;
  } else {
    content.innerHTML = `
                    <p><strong>Departamento:</strong> ${depto_text}</p>
                    <p><strong>Área:</strong> ${currentAttributes ? currentAttributes.AREAHA : currentAttributesCatastro.VALAREAH} ha (${currentAttributes ? currentAttributes.AREAMC.toLocaleString() : currentAttributesCatastro.VALAREAM2} m²)</p>
                    <p><strong>Índice de Productividad:</strong> ${currentAttributes ? currentAttributes.IND_CONEAT : currentAttributesCatastro.VALIP}</p>
                    <p><strong>Índice de Valor Real:</strong> ${currentAttributes ? currentAttributes.IND_VR : currentAttributesCatastro.VALIVR}</p>
                    <a href="${pdfURL}" target="_blank" rel="noopener noreferrer" style="width:170px;display:${pdfURL ? "flex" : "none"};"
                        class="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow flex items-center gap-1.5 no-underline">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                        Ver Croquis CONEAT
                    </a>
                    <hr class="border-slate-700 my-1">
                    <p class="text-amber-300"><strong>Distancia (Ubicación por defecto):</strong> ${distanciaFallback.toLocaleString()} metros</p>
                    ${gpsHtml}
                `;
  }

  card.classList.remove("hidden");
}

function cerrarCard() {
  document.getElementById("infoCard").classList.add("hidden");
}

function showAlert(msg) {
  document.getElementById("modalMessage").innerText = msg;
  document.getElementById("customModal").classList.remove("hidden");
}

function cerrarModal() {
  document.getElementById("customModal").classList.add("hidden");
}

window.onload = function () {
  // Default center map to fallback location and select padron 732
  map.setView(fallbackCoords, 11);
  //seleccionarPadron(7442);
};
