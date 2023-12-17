let datos = [];
const isDisplayTree = false;

//Carga de los datos desde el dispositivo
function cargarDatos() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    input.addEventListener('change', (event) => {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
                const contenido = e.target.result;
                procesarDatosCSV(contenido);
            };

            reader.readAsText(file);

        }
    });

    input.click();
}

//Procesamiento de la información del archivo CSV
function procesarDatosCSV(contenido) {
    try {
        //División de filas y cabeceras
        const filas = contenido.split('\n');
        const cabecera = filas[0].split(',');

        datos = [];

        for (let i = 1; i < filas.length; i++) {
            const valores = filas[i].split(',');
            const fila = {};

            for (let j = 0; j < cabecera.length; j++) {
                fila[cabecera[j].trim()] = valores[j].trim();
            }

            datos.push(fila);
        }

        //Asignación a la varibale global
        globalThis.datos = datos;
        globalThis.datos.forEach((element) => {
            console.log(element);
        })

        //Limpiar y mostrar el árbol
        $('#estructuraArbol').jstree('destroy');
        $('#resultado').text('');
        visualizarArbol();
    } catch (error) {
        mostrarError("Error al procesar datos: " + error);
    }
}

function mostrarError(mensaje) {
    alert(mensaje);
}

//Visualización del árbol en base a los datos cargados
function visualizarArbol() {
    const treeData = transformarDatosArbol(globalThis.datos);
    $('#estructuraArbol').jstree({
        'core': {
            'data': treeData,
            'themes': {
                'responsive': false,
                'variant': 'small',
                'stripes': true
            }
        }
    });
    globalThis.isDisplayTree = true;
}

//Transformación de datos para visualización en el árbol
function transformarDatosArbol(datos) {
    const treeData = [];

    const nodeMap = new Map();

    datos.forEach((fila) => {
        const partes = fila.MMSPATH.split(/\/|\$/);
        let parent = null;

        partes.forEach((parte, index) => {
            const ruta = partes.slice(0, index + 1).join('$');
            let nodo = nodeMap.get(ruta);

            if (!nodo) {
                nodo = {
                    id: ruta,
                    text: parte,
                    children: [],
                    values: { NOMBRE: "", MMSPATH: "" }
                };

                if (index === partes.length - 1) {
                    nodo.values = { NOMBRE: fila.NOMBRE, MMSPATH: fila.MMSPATH };
                }

                if (parent) {
                    parent.children.push(nodo);
                } else {
                    treeData.push(nodo);
                }

                nodeMap.set(ruta, nodo);
            }

            parent = nodo;
        });
    });

    return treeData;
}

//Filtro mediante expresión regular
function buscarConExpresionRegular() {
    const expresion = $('#expresionInput').val();
    const coincidencias = buscarCoincidencias(expresion);
    //mostrarResultados(coincidencias);
}

//Busqueda de coincidencias para el filtro por expresiones regulares
function buscarCoincidencias(expresion) {
    let datosFiltrados;
    if (!expresion || expresion.trim() === "") {
        datosFiltrados = globalThis.datos;
    } else {
        datosFiltrados = globalThis.datos.filter((fila) => new RegExp(expresion, "i").test(fila.MMSPATH));
    }

    if (datosFiltrados.length == 0) {
        alert("No se encontraron coincidencias");
    }

    //Visualización de la estructura árbol de acuerdo a las coincidencia
    const treeData = transformarDatosArbol(datosFiltrados);
    $('#estructuraArbol').jstree(true).destroy();
    $('#estructuraArbol').jstree({
        'core': {
            'data': treeData,
            'themes': {
                'responsive': false,
                'variant': 'small',
                'stripes': true
            }
        }
    });
}

//Calculo de la métrica capacidad
function calcularMetrica() {
    const expresion = $('#expresionInput').val();
    let capacidad = medirCapacidad(expresion, globalThis.datos);
    $('#capacidadInput').val('La capacidad es ' + capacidad);
    //console.log("La capacidad es: " + capacidad);
}

//Medición de la métrica
function medirCapacidad(expresion, datos) {
    const longitudExpresion = expresion.length;

    const datosFiltrados = datos.filter((fila) => new RegExp(expresion, "i").test(fila.MMSPATH));
    const numeroCoincidencias = datosFiltrados.length;

    let puntaje = 0;
    //Caso de no encontrar ninguna coincidencia
    if (numeroCoincidencias == 0) {
        //$('#capacidadInput').val('La capacidad es ' + puntaje);
        return puntaje;
    }
    //Calculo del valor
    puntaje = (((datos.length - numeroCoincidencias) * 100) / datos.length) + (100 / datos.length);
    //$('#capacidadInput').val('La capacidad es ' + puntaje);
    return puntaje;
}

//Calculo, filtrado y Visualización de las expresiones candidatas
function visualizarExpresionesCandidatas() {
    const expresiones = {};
    let data = globalThis.datos;

    data.forEach((cadena) => {
        const expreCandidatas = generarExpresionesCandidatas(cadena.MMSPATH);
        expresiones[cadena.NOMBRE] = (expreCandidatas);
    })

    const capacidades = {};
    let capacidad = [];
    let mayor = 0, indice = 0;
    let aux = 0;
    //Recorrido de la lista para calcular la capacidad de cada expresión
    Object.keys(expresiones).forEach((llave, index) => {
        expresiones[llave].forEach((item, index) => {
            aux = medirCapacidad(item, globalThis.datos);
            //Comparación de la capacidad
            if (aux > mayor) {
                mayor = aux;
                indice = index;
            }
        })

        //Filtrado de la expresión con mayor capacidad
        expresiones[llave] = [expresiones[llave][indice]];
        capacidades[llave] = capacidad;
        mayor = 0; indice = 0;
    });

    mostrarExpresionesCandidatas(expresiones);
}

//Generación de las expresiones candidatas
function generarExpresionesCandidatas(cadena) {
    const candidatas = [];

    // Divide la cadena por los signos $ y /
    const partes = cadena.split(/[/$]/);

    // Filtra partes vacías y agrega cada parte por separado
    const partesFiltradas = partes.filter(part => part.trim() !== '');
    candidatas.push(...partesFiltradas);

    // Genera una expresión candidata con cada concatenación
    for (let i = 0; i < partesFiltradas.length; i++) {
        const candidata = partesFiltradas.slice(0, i + 1).join('$');
        candidatas.push(candidata);
    }

    return candidatas;
}


function mostrarResultados(coincidencias) {
    $('#resultado').text(`Señales coincidentes: ${coincidencias.join(', ')}`);
}

//Visualización de las expresiones candidatas
function mostrarExpresionesCandidatas(expresiones) {
    const accordionContainer = document.getElementById('accordionPanelsStayOpen');
    let primeraSeccion = true;

    Object.keys(expresiones).forEach((llave, index) => {
        // Crear el elemento accordion-item
        const accordionItem = document.createElement('div');
        accordionItem.classList.add('accordion-item');

        // Crear el encabezado del accordion-item
        const accordionHeader = document.createElement('h2');
        accordionHeader.classList.add('accordion-header');
        accordionHeader.id = `panelsStayOpen-heading${index + 1}`;

        // Crear el botón del accordion-item
        const accordionButton = document.createElement('button');
        accordionButton.classList.add('accordion-button');
        accordionButton.setAttribute('type', 'button');
        accordionButton.setAttribute('data-bs-toggle', 'collapse');
        accordionButton.setAttribute('data-bs-target', `#panelsStayOpen-collapse${index + 1}`);
        accordionButton.setAttribute('aria-expanded', primeraSeccion ? 'true' : 'false');
        accordionButton.setAttribute('aria-controls', `panelsStayOpen-collapse${index + 1}`);
        accordionButton.textContent = llave;

        // Agregar el botón al encabezado
        accordionHeader.appendChild(accordionButton);

        // Crear el cuerpo del accordion-item
        const accordionBody = document.createElement('div');
        accordionBody.classList.add('accordion-collapse', 'collapse');
        accordionBody.setAttribute('id', `panelsStayOpen-collapse${index + 1}`);
        accordionBody.setAttribute('aria-labelledby', `panelsStayOpen-heading${index + 1}`);

        // Crear el contenido del cuerpo
        const accordionBodyContent = document.createElement('div');
        accordionBodyContent.classList.add('accordion-body');

        // Llenar el cuerpo con los datos del arreglo
        expresiones[llave].forEach(function (item, itemIndex) {
            const listItem = document.createElement('div');
            const listItem2 = document.createElement('div');
            listItem.textContent = item;
            listItem2.textContent = 'Capacidad óptima de la expresión: ' + medirCapacidad(item, globalThis.datos);
            accordionBodyContent.appendChild(listItem);
            accordionBodyContent.appendChild(listItem2);
        });

        // Agregar el contenido al cuerpo
        accordionBody.appendChild(accordionBodyContent);

        // Agregar el encabezado y el cuerpo al accordion-item
        accordionItem.appendChild(accordionHeader);
        accordionItem.appendChild(accordionBody);

        // Agregar el accordion-item al contenedor del acordeón
        accordionContainer.appendChild(accordionItem);

        primeraSeccion = false;
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const treeItems = document.querySelectorAll('.tree li');

    treeItems.forEach(function (item) {
        const toggle = item.querySelector('.toggle');
        if (toggle) {
            toggle.addEventListener('click', function () {
                item.classList.toggle('expanded');
                item.classList.toggle('collapsed');
            });
        }
    });
});