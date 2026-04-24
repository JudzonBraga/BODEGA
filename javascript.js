
        // ==================== CONFIGURACIÓN ====================
        // URL de Google Sheets en formato CSV
        const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmI6QJyvSqq03ugj8etlpOua1za64q3hvCJvNmU7Yp2xPEn0WN0l44Z58CFonkzF5QaiWMjFs3c4OV/pub?gid=0&single=true&output=csv';
        const USERS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmI6QJyvSqq03ugj8etlpOua1za64q3hvCJvNmU7Yp2xPEn0WN0l44Z58CFonkzF5QaiWMjFs3c4OV/pub?gid=134830565&single=true&output=csv';
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbycLlFLCbbhmORVVfNussCoBSZ-HkAGw7yoD3Uc1BJWXl8uwAFt-h0DhwCTM_1zBjvmvg/exec';

        let productos = [];
        let carrito = [];
        let slideIndex = 0;
        let autoInterval;
        let usuarioActual = null;
        let modalEventListenersAttached = false;
        let categoriaActual = '';
        let subcategoriaActual = '';
        let productosFiltrados = [];
        let paginaActual = 1;
        let productosPorPagina = 20;
        let tipoEntregaSeleccionado = null;
        let tiempoRecojoSeleccionado = null;
        let pagoDeliverySeleccionado = null;
        let usuariosDB = [];
        let modoEdicionPerfil = false;
        let perfilVerificado = false;

        // ==================== USUARIOS PREDETERMINADOS (RESPALDO) ====================
        function cargarUsuariosPredeterminados() {
            console.log('📦 Cargando usuarios predeterminados...');
            usuariosDB = [
                {
                    id: 1001,
                    nombre: "Juan Carlos Pérez Gonzales",
                    email: "juan.perez@email.com",
                    telefono: "999888777",
                    direccion: "Av. Larco 1234, Miraflores, Lima",
                    password: "123456",
                    activo: true,
                    rol: "cliente"
                },
                {
                    id: 1002,
                    nombre: "María Elena Rodríguez Castro",
                    email: "maria.rodriguez@email.com",
                    telefono: "988777666",
                    direccion: "Calle Los Pinos 456, San Isidro, Lima",
                    password: "123456",
                    activo: true,
                    rol: "cliente"
                },
                {
                    id: 1003,
                    nombre: "Carlos Alberto Sánchez Torres",
                    email: "carlos.sanchez@email.com",
                    telefono: "977666555",
                    direccion: "Jr. Las Flores 789, Surco, Lima",
                    password: "123456",
                    activo: true,
                    rol: "cliente"
                },
                {
                    id: 1004,
                    nombre: "Ana Lucía Mendoza Flores",
                    email: "ana.mendoza@email.com",
                    telefono: "966555444",
                    direccion: "Av. Primavera 234, San Borja, Lima",
                    password: "123456",
                    activo: true,
                    rol: "cliente"
                },
                {
                    id: 9999,
                    nombre: "Usuario Demo",
                    email: "demo@email.com",
                    telefono: "999999999",
                    direccion: "Av. Larco 1234, Miraflores",
                    password: "123456",
                    activo: true,
                    rol: "cliente"
                }
            ];
            console.log(`✅ ${usuariosDB.length} usuarios predeterminados cargados`);
            console.table(usuariosDB.map(u => ({ email: u.email, password: u.password, nombre: u.nombre })));
        }

        // ==================== FUNCIONES DE GOOGLE SHEETS ====================
        function mostrarLoading(mostrar) {
            const loadingDiv = document.getElementById('loading-overlay');
            if (loadingDiv) loadingDiv.style.display = mostrar ? 'flex' : 'none';
        }

        async function cargarUsuariosDesdeSheet() {
            try {
                console.log('🔄 Intentando cargar usuarios desde Google Sheets...');
                const response = await fetch(USERS_CSV_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const csvText = await response.text();
                const lines = csvText.split('\n');

                let nuevosUsuarios = 0;

                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;

                    // Parsear CSV respetando comillas
                    const fields = [];
                    let current = '';
                    let inQuotes = false;

                    for (let char of lines[i]) {
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            fields.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    fields.push(current.trim());

                    if (fields.length >= 6) {
                        const email = fields[2] ? fields[2].toLowerCase().trim() : '';
                        const existe = usuariosDB.some(u => u.email === email);

                        if (!existe && email && fields[5]) {
                            usuariosDB.push({
                                id: parseInt(fields[0]) || Date.now(),
                                nombre: fields[1] || '',
                                email: email,
                                telefono: fields[3] || '',
                                direccion: fields[4] || '',
                                password: fields[5].trim(),
                                activo: true,
                                rol: 'cliente'
                            });
                            nuevosUsuarios++;
                        }
                    }
                }

                if (nuevosUsuarios > 0) {
                    console.log(`✅ Agregados ${nuevosUsuarios} nuevos usuarios desde Google Sheets`);
                }

            } catch (error) {
                console.warn('⚠️ No se pudo cargar desde Google Sheets:', error.message);
            }
        }

        async function cargarProductosDesdeSheet() {
            try {
                mostrarLoading(true);
                console.log('🔄 Cargando productos desde Google Sheets...');

                const response = await fetch(CSV_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const csvText = await response.text();
                const rows = csvText.split('\n');
                const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

                productos = [];

                for (let i = 1; i < rows.length; i++) {
                    if (!rows[i].trim()) continue;

                    let values = [];
                    let inQuotes = false;
                    let currentValue = '';
                    for (let char of rows[i]) {
                        if (char === '"') inQuotes = !inQuotes;
                        else if (char === ',' && !inQuotes) {
                            values.push(currentValue.trim());
                            currentValue = '';
                        } else currentValue += char;
                    }
                    values.push(currentValue.trim());
                    values = values.map(v => v.replace(/^"|"$/g, ''));

                    const producto = {};
                    headers.forEach((header, idx) => {
                        let val = values[idx] || '';
                        if (header === 'id') val = parseInt(val) || 0;
                        else if (header === 'precio') val = parseFloat(val.replace('S/', '').replace(',', '.')) || 0;
                        else if (header === 'precio_oferta') val = parseFloat(val.replace('S/', '').replace(',', '.')) || 0;
                        else if (header === 'stock') val = parseInt(val) || 0;
                        else if (header === 'tiene_oferta') val = (val === 'Sí' || val === 'true');
                        else if (header === 'destacado') val = (val === 'Sí' || val === 'true');
                        else if (header === 'activo') val = (val !== 'No' && val !== 'false');
                        producto[header] = val;
                    });

                    if (producto.activo !== false && producto.id > 0) productos.push(producto);
                }

                console.log(`✅ ${productos.length} productos cargados`);
                renderizarTodasCategorias();

            } catch (error) {
                console.error('Error cargando productos:', error);
                mostrarToast('⚠️ Error al cargar productos', 'error');
            } finally {
                mostrarLoading(false);
            }
        }

        // ==================== FUNCIONES DE RENDERIZADO ====================
        function renderizarTodasCategorias() {
            const resultadosSection = document.getElementById('resultados-busqueda');
            if (resultadosSection) resultadosSection.style.display = 'none';

            const categorias = document.querySelectorAll('.category');
            categorias.forEach(cat => cat.style.display = 'block');

            const categoriasMap = {
                abarrotes: productos.filter(p => p.categoria === 'abarrotes'),
                frutas: productos.filter(p => p.categoria === 'frutas' || p.categoria === 'verduras'),
                bebidas: productos.filter(p => p.categoria === 'bebidas'),
                lacteos: productos.filter(p => p.categoria === 'lacteos'),
                carnes: productos.filter(p => p.categoria === 'carnes'),
                limpieza: productos.filter(p => p.categoria === 'limpieza'),
                snacks: productos.filter(p => p.categoria === 'snacks'),
                licores: productos.filter(p => p.categoria === 'licores')
            };

            for (const [catId, prods] of Object.entries(categoriasMap)) {
                renderizarCategoria(catId, prods);
            }
        }

        function renderizarCategoria(categoryId, productosCat) {
            const categoryDiv = document.getElementById(categoryId);
            if (!categoryDiv) return;
            const productsGrid = categoryDiv.querySelector('.products-grid');
            if (!productsGrid) return;

            if (productosCat.length === 0) {
                productsGrid.innerHTML = '<div style="text-align:center; padding:40px; grid-column: span 4;">No hay productos disponibles</div>';
                return;
            }

            const productosMostrar = productosCat.slice(0, 4);

            productsGrid.innerHTML = productosMostrar.map(prod => {
                const tieneOferta = prod.tiene_oferta && prod.precio_oferta > 0;
                const precioMostrar = tieneOferta ? prod.precio_oferta : prod.precio;
                const agotado = prod.stock === 0;

                return `
            <div class="product ${agotado ? 'product-agotado' : ''}" style="${agotado ? 'opacity: 0.7; background: #f5f5f5;' : ''}">
                ${agotado ? '<div class="agotado-badge">AGOTADO</div>' : ''}
                <img src="${prod.imagen_url || 'https://images.unsplash.com/photo-1542838132-92c5337a8b8f?w=300&h=280&fit=crop'}" class="product-img" style="${agotado ? 'filter: grayscale(0.5);' : ''}">
                <div class="product-info">
                    <h4 class="product-name">${prod.nombre} ${prod.presentacion}</h4>
                    ${prod.marca ? `<p style="font-size: 12px; color: #64748b;">${prod.marca}</p>` : ''}
                    ${tieneOferta ? `<p style="font-size: 12px; color: #ef4444;"><s>S/ ${prod.precio.toFixed(2)}</s></p>` : ''}
                    <div class="product-price-row">
                        <span class="product-price">S/ ${precioMostrar.toFixed(2)}</span>
                        ${agotado ?
                        `<button class="add-btn" disabled style="background-color: #9ca3af; cursor: not-allowed;">Agotado</button>` :
                        `<button onclick="agregarAlCarrito(${prod.id})" class="add-btn">Agregar</button>`
                    }
                    </div>
                </div>
            </div>
        `;
            }).join('');
        }

        // ==================== FUNCIONES DE BÚSQUEDA ====================
        function buscarProductos() {
            const input = document.getElementById('search-input');
            const termino = input?.value.trim().toLowerCase();

            if (!termino) {
                mostrarTodasCategorias();
                return;
            }

            const resultados = productos.filter(prod =>
                (prod.nombre && prod.nombre.toLowerCase().includes(termino)) ||
                (prod.marca && prod.marca.toLowerCase().includes(termino))
            );

            if (resultados.length === 0) {
                mostrarToast(`🔎 No se encontraron productos para "${termino}"`, 'warning');
            } else {
                mostrarToast(`🔎 Se encontraron ${resultados.length} productos para "${termino}"`, 'success');
            }

            mostrarResultadosBusqueda(resultados, termino);
        }

        function mostrarResultadosBusqueda(resultados, termino) {
            const categorias = document.querySelectorAll('.category');
            categorias.forEach(cat => cat.style.display = 'none');

            let resultadosSection = document.getElementById('resultados-busqueda');
            if (!resultadosSection) {
                resultadosSection = document.createElement('div');
                resultadosSection.id = 'resultados-busqueda';
                resultadosSection.className = 'resultados-busqueda';
                resultadosSection.style.marginBottom = '40px';
                const cintillo = document.querySelector('.cintillo');
                if (cintillo) {
                    cintillo.insertAdjacentElement('afterend', resultadosSection);
                } else {
                    const destacados = document.getElementById('destacados');
                    if (destacados) {
                        destacados.insertAdjacentElement('beforebegin', resultadosSection);
                    }
                }
            }

            function resaltarTexto(texto, busqueda) {
                if (!texto || !busqueda) return texto || '';
                const regex = new RegExp(`(${busqueda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                return texto.replace(regex, `<mark style="background: #fbbf24; color: #1f2937; padding: 0 2px; border-radius: 4px;">$1</mark>`);
            }

            let html = `
        <div style="margin: 3rem 0 2rem 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <h2 style="font-size: 28px; font-weight: 600; color: #1e293b;">
                🔍 Resultados para: "${termino}"
                <span style="font-size: 16px; color: #059669; margin-left: 12px;">${resultados.length} productos</span>
            </h2>
            <button onclick="limpiarBusqueda()" style="background: #f1f5f9; border: none; color: #059669; cursor: pointer; padding: 10px 20px; border-radius: 40px; font-weight: 500;">
                <i class="fas fa-times"></i> Limpiar búsqueda
            </button>
        </div>
        <div class="products-grid" id="resultados-grid" style="margin-bottom: 40px;">
    `;

            if (resultados.length === 0) {
                html += `
            <div style="text-align: center; padding: 60px; background: white; border-radius: 24px; grid-column: span 4;">
                <i class="fas fa-search" style="font-size: 64px; color: #cbd5e1; margin-bottom: 16px; display: block;"></i>
                <h3 style="color: #64748b;">No se encontraron productos</h3>
                <p style="color: #94a3b8; margin-top: 8px;">Intenta con otra palabra clave</p>
                <button onclick="limpiarBusqueda()" class="add-btn" style="margin-top: 20px;">Ver todos los productos</button>
            </div>
        `;
            } else {
                resultados.forEach(prod => {
                    const tieneOferta = prod.tiene_oferta && prod.precio_oferta > 0;
                    const precioMostrar = tieneOferta ? prod.precio_oferta : prod.precio;
                    const agotado = prod.stock === 0;
                    const nombreResaltado = resaltarTexto(prod.nombre, termino);
                    const marcaResaltada = resaltarTexto(prod.marca, termino);

                    html += `
                <div class="product ${agotado ? 'product-agotado' : ''}" style="${agotado ? 'opacity: 0.7; background: #f5f5f5;' : ''}">
                    ${agotado ? '<div class="agotado-badge">AGOTADO</div>' : ''}
                    <img src="${prod.imagen_url || 'https://images.unsplash.com/photo-1542838132-92c5337a8b8f?w=300&h=280&fit=crop'}" class="product-img" style="${agotado ? 'filter: grayscale(0.5);' : ''}">
                    <div class="product-info">
                        <h4 class="product-name">${nombreResaltado} ${prod.presentacion}</h4>
                        ${prod.marca ? `<p style="font-size: 12px; color: #64748b;">${marcaResaltada}</p>` : ''}
                        ${tieneOferta ? `<p style="font-size: 12px; color: #ef4444;"><s>S/ ${prod.precio.toFixed(2)}</s></p>` : ''}
                        <div class="product-price-row">
                            <span class="product-price">S/ ${precioMostrar.toFixed(2)}</span>
                            ${agotado ?
                            `<button class="add-btn" disabled style="background-color: #9ca3af; cursor: not-allowed;">Agotado</button>` :
                            `<button onclick="agregarAlCarrito(${prod.id})" class="add-btn">Agregar</button>`
                        }
                        </div>
                    </div>
                </div>
            `;
                });
            }

            html += `</div>`;
            resultadosSection.innerHTML = html;
            resultadosSection.style.display = 'block';
        }

        function limpiarBusqueda() {
            const input = document.getElementById('search-input');
            if (input) input.value = '';
            const resultadosSection = document.getElementById('resultados-busqueda');
            if (resultadosSection) resultadosSection.style.display = 'none';
            mostrarTodasCategorias();
        }

        function mostrarTodasCategorias() {
            const categorias = document.querySelectorAll('.category');
            categorias.forEach(cat => cat.style.display = 'block');
            const resultadosSection = document.getElementById('resultados-busqueda');
            if (resultadosSection) resultadosSection.style.display = 'none';
        }

        // ==================== FUNCIONES DEL CARRITO ====================
        function agregarAlCarrito(id) {
            const prod = productos.find(p => p.id === id);
            if (!prod) return;
            const precio = (prod.tiene_oferta && prod.precio_oferta > 0) ? prod.precio_oferta : prod.precio;
            const existe = carrito.find(item => item.id === id);
            if (existe) existe.cantidad++;
            else carrito.push({ id, nombre: `${prod.nombre} ${prod.presentacion}`, precio, cantidad: 1 });
            actualizarCarrito();
            mostrarToast(`✅ ${prod.nombre} agregado`);
        }

        function actualizarCarrito() {
            const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
            const cartCount = document.getElementById('cart-count');
            if (cartCount) cartCount.textContent = totalItems;
            if (carrito.length === 0) {
                const modal = document.getElementById('cart-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    mostrarCarrito();
                }
            }
        }

        function mostrarCarrito() {
            const modal = document.getElementById('cart-modal');
    const itemsDiv = document.getElementById('cart-items');
    const totalSpan = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const deliveryOptionsDiv = document.getElementById('deliveryOptions');
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
        document.body.classList.add('modal-open'); // Bloquear body
    }

            const carritoVacio = carrito.length === 0;

            if (carritoVacio) {
                if (deliveryOptionsDiv) deliveryOptionsDiv.style.display = 'none';
                if (checkoutBtn) {
                    checkoutBtn.disabled = true;
                    checkoutBtn.textContent = 'CARRITO VACÍO';
                    checkoutBtn.style.opacity = '0.5';
                    checkoutBtn.style.cursor = 'not-allowed';
                }
                if (itemsDiv) {
                    itemsDiv.innerHTML = `<div class="empty-cart">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>Tu carrito está vacío</p>
                <button onclick="ocultarCarrito()" class="add-btn" style="margin-top: 20px;">Seguir comprando</button>
            </div>`;
                }
                if (totalSpan) totalSpan.textContent = 'S/ 0.00';
                const modalCount = document.getElementById('modal-count');
                if (modalCount) modalCount.textContent = '0';
                tipoEntregaSeleccionado = null;
                tiempoRecojoSeleccionado = null;
                pagoDeliverySeleccionado = null;
                return;
            }

            if (deliveryOptionsDiv) deliveryOptionsDiv.style.display = 'block';
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = 'PAGAR';
                checkoutBtn.style.opacity = '1';
                checkoutBtn.style.cursor = 'pointer';
            }

            tipoEntregaSeleccionado = null;
            tiempoRecojoSeleccionado = null;
            pagoDeliverySeleccionado = null;

            const radios = document.querySelectorAll('input[name="deliveryType"]');
            radios.forEach(radio => radio.checked = false);

            const pickupOptions = document.getElementById('pickupOptions');
            const deliveryOptsDiv = document.getElementById('deliveryOptionsDiv');
            if (pickupOptions) pickupOptions.style.display = 'none';
            if (deliveryOptsDiv) deliveryOptsDiv.style.display = 'none';

            const tiempoSeleccionado = document.getElementById('tiempoSeleccionado');
            const pagoSeleccionado = document.getElementById('pagoSeleccionado');
            if (tiempoSeleccionado) tiempoSeleccionado.innerHTML = '';
            if (pagoSeleccionado) pagoSeleccionado.innerHTML = '';

            document.querySelectorAll('.suboption-btn').forEach(btn => btn.classList.remove('selected'));

            if (!modalEventListenersAttached) {
                attachModalEventListeners();
                modalEventListenersAttached = true;
            }

            let total = 0;
            if (itemsDiv) {
                itemsDiv.innerHTML = carrito.map((item, idx) => {
                    const subtotal = item.precio * item.cantidad;
                    total += subtotal;
                    return `<div class="cart-item" style="display: flex; gap: 16px; padding: 16px 0; border-bottom: 1px solid #e2e8f0;">
                <div style="flex:1;">
                    <h4 style="margin-bottom: 4px;">${item.nombre}</h4>
                    <p style="color:#059669; font-size: 14px;">S/ ${item.precio.toFixed(2)} × ${item.cantidad}</p>
                </div>
                <div style="text-align: right;">
                    <p><strong>S/ ${subtotal.toFixed(2)}</strong></p>
                    <div style="display:flex; gap:12px; margin-top:8px; justify-content: flex-end;">
                        <button onclick="cambiarCantidad(${idx}, -1)" style="width:28px; height:28px; border:1px solid #e2e8f0; border-radius:8px; background:white; cursor:pointer;">-</button>
                        <span style="min-width: 20px; text-align: center;">${item.cantidad}</span>
                        <button onclick="cambiarCantidad(${idx}, 1)" style="width:28px; height:28px; border:1px solid #e2e8f0; border-radius:8px; background:white; cursor:pointer;">+</button>
                        <button onclick="eliminarDelCarrito(${idx})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size: 14px;">Eliminar</button>
                    </div>
                </div>
            </div>`;
                }).join('');
            }

            if (totalSpan) totalSpan.textContent = `S/ ${total.toFixed(2)}`;
            const modalCount = document.getElementById('modal-count');
            if (modalCount) modalCount.textContent = carrito.length;
        }

        function ocultarCarrito() { 
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
        document.body.classList.remove('modal-open'); // Desbloquear body
    }
}
        function cambiarCantidad(idx, cambio) {
            if (!carrito[idx]) return;
            carrito[idx].cantidad += cambio;
            if (carrito[idx].cantidad < 1) {
                eliminarDelCarrito(idx);
                return;
            }
            if (carrito[idx].cantidad > 99) carrito[idx].cantidad = 99;
            mostrarCarrito();
            actualizarCarrito();
        }
        function eliminarDelCarrito(idx) { carrito.splice(idx, 1); actualizarCarrito(); mostrarCarrito(); mostrarToast('🗑️ Producto eliminado del carrito', 'info'); }
        function finalizarCompra() {
            if (carrito.length === 0) {
                mostrarToast('⚠️ Tu carrito está vacío. Agrega productos antes de continuar.', 'warning');
                ocultarCarrito();
                return;
            }

            if (tipoEntregaSeleccionado === 'delivery') {
                if (!usuarioActual) {
                    ocultarCarrito();
                    mostrarToast('⚠️ Debes iniciar sesión para usar delivery', 'warning');
                    setTimeout(() => { mostrarLogin(); }, 1000);
                    return;
                }
            }

            let mensajeWhatsApp = '';
            const telefonoWhatsApp = '51987654321';

            if (tipoEntregaSeleccionado === 'pickup') {
                const tiempoTexto = { '15min': '15 minutos', '30min': '30 minutos', '1h': '1 hora' };
                mensajeWhatsApp = generarMensajeRecojo(tiempoTexto[tiempoRecojoSeleccionado]);
            } else if (tipoEntregaSeleccionado === 'delivery') {
                const pagoTexto = { 'efectivo': 'efectivo contra entrega', 'yape': 'Yape/Plin', 'transferencia': 'transferencia bancaria' };
                mensajeWhatsApp = generarMensajeDelivery(pagoTexto[pagoDeliverySeleccionado]);
            } else {
                mostrarToast('⚠️ Selecciona un método de entrega', 'warning');
                return;
            }

            const urlWhatsApp = `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensajeWhatsApp)}`;
            window.open(urlWhatsApp, '_blank');
            ocultarCarrito();
            carrito = [];
            actualizarCarrito();
            setTimeout(() => { mostrarToast('📱 Redirigiendo a WhatsApp para confirmar tu pedido', 'success'); }, 500);
        }

        function generarMensajeRecojo(tiempo) {
            let mensaje = `🏪 *RECOJO EN TIENDA*\n\nHola, deseo reservar los siguientes productos:\n\n📋 *DETALLE DEL PEDIDO*\n┌─────────────────────────────┐\n`;
            let total = 0;
            carrito.forEach(item => {
                const subtotal = item.precio * item.cantidad;
                total += subtotal;
                mensaje += `│ ${item.nombre.padEnd(25)} │\n│ Cantidad: ${item.cantidad} x S/ ${item.precio.toFixed(2)} = S/ ${subtotal.toFixed(2).padStart(8)} │\n├─────────────────────────────┤\n`;
            });
            mensaje += `│ *TOTAL: S/ ${total.toFixed(2).padStart(24)} │\n└─────────────────────────────┘\n\n⏰ *Tiempo de preparación:* ${tiempo}\n\n¡Gracias por tu compra! 🙌`;
            return mensaje;
        }

        function generarMensajeDelivery(pago) {
            let mensaje = `🚚 *PEDIDO A DOMICILIO*\n\nHola, deseo comprar los siguientes productos:\n\n📋 *DETALLE DEL PEDIDO*\n┌─────────────────────────────────────┐\n`;
            let total = 0;
            carrito.forEach(item => {
                const subtotal = item.precio * item.cantidad;
                total += subtotal;
                const nombreProd = item.nombre.length > 28 ? item.nombre.substring(0, 25) + '...' : item.nombre;
                mensaje += `│ ${nombreProd.padEnd(33)} │\n│ Cantidad: ${item.cantidad} x S/ ${item.precio.toFixed(2)} = S/ ${subtotal.toFixed(2).padStart(8)} │\n├─────────────────────────────────────┤\n`;
            });
            mensaje += `│ *TOTAL: S/ ${total.toFixed(2).padStart(32)} │\n└─────────────────────────────────────┘\n\n`;
            const direccion = usuarioActual?.direccion || 'No especificada';
            mensaje += `📍 *Dirección de entrega:* ${direccion}\n💰 *Método de pago:* ${pago}\n\n¡Gracias por tu compra! 🙌`;
            return mensaje;
        }

        function cerrarSiClickFuera(event) { 
    const modal = document.getElementById('cart-modal');
    const modalContent = document.querySelector('.cart-modal-content'); 
    if (modal && modal.classList.contains('show') && modalContent && 
        (event.target === modal || !modalContent.contains(event.target))) {
        ocultarCarrito(); 
    }
}
function cerrarConEscape(event) { 
    if (event.key === 'Escape') {
        ocultarCarrito(); 
    }
}
        function attachModalEventListeners() { const modal = document.getElementById('cart-modal'); if (modal) modal.addEventListener('click', cerrarSiClickFuera); const modalContent = document.querySelector('.cart-modal-content'); if (modalContent) modalContent.addEventListener('click', e => e.stopPropagation()); document.addEventListener('keydown', cerrarConEscape); }

        // ==================== FUNCIONES DE PERFIL ====================
        async function verMiPerfil() {
            closeDropdown();
            if (!usuarioActual) {
                mostrarToast('👤 Inicia sesión para ver tu perfil', 'warning');
                mostrarLogin();
                return;
            }

            console.log('Usuario actual en perfil:', usuarioActual);
            console.log('Contraseña en usuarioActual:', usuarioActual?.password);

            // Si por alguna razón no tiene contraseña, intentar recuperarla de usuariosDB
            if (!usuarioActual.password) {
                const usuarioEnDB = usuariosDB.find(u => u.id === usuarioActual.id);
                if (usuarioEnDB && usuarioEnDB.password) {
                    usuarioActual.password = usuarioEnDB.password;
                    console.log('Contraseña recuperada de DB:', usuarioActual.password);
                }
            }

            mostrarPerfilModal();
        }

        function mostrarPerfilModal() {
            const modal = document.getElementById('profileModal');
            const container = document.getElementById('perfilDatos');
            if (!modal || !container) return;

            container.innerHTML = `
        <div id="perfilModoVer">
            <div class="profile-field"><label>📛 Nombre completo</label><div class="profile-value">${escapeHtml(usuarioActual.nombre || '')}</div></div>
            <div class="profile-field"><label>📧 Correo electrónico</label><div class="profile-value">${escapeHtml(usuarioActual.email || '')}</div></div>
            <div class="profile-field"><label>📞 Teléfono</label><div class="profile-value">${escapeHtml(usuarioActual.telefono || 'No especificado')}</div></div>
            <div class="profile-field"><label>📍 Dirección</label><div class="profile-value">${escapeHtml(usuarioActual.direccion || 'No especificada')}</div></div>
            <div class="profile-field"><label>🔒 Contraseña</label><div class="profile-value">●●●●●●●●</div></div>
        </div>
        <button class="edit-toggle-btn" onclick="iniciarEdicionPerfil()"><i class="fas fa-edit"></i> Editar información</button>
    `;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

        function iniciarEdicionPerfil() {
            const container = document.getElementById('perfilDatos');
            if (!container) return;
            container.innerHTML = `
        <div class="password-verify-container">
            <label><i class="fas fa-lock"></i> Verifica tu identidad</label>
            <input type="password" id="verifyPassword" placeholder="Ingresa tu contraseña actual">
            <button class="verify-btn" onclick="verificarPasswordParaEditar()"><i class="fas fa-check"></i> Verificar</button>
            <div id="verifyError" style="color: #ef4444; font-size: 12px; margin-top: 8px;"></div>
        </div>
        <button class="edit-toggle-btn" onclick="cerrarPerfilModal()" style="background: #6b7280;"><i class="fas fa-times"></i> Cancelar</button>
    `;
        }

        function verificarPasswordParaEditar() {
            const passwordIngresada = document.getElementById('verifyPassword')?.value;
            const errorDiv = document.getElementById('verifyError');

            if (!passwordIngresada) {
                if (errorDiv) errorDiv.textContent = 'Ingresa tu contraseña';
                return;
            }

            console.log('=== VERIFICACIÓN DE CONTRASEÑA ===');
            console.log('Contraseña ingresada:', passwordIngresada);
            console.log('Contraseña en usuarioActual:', usuarioActual?.password);

            // Comparación local
            if (usuarioActual && passwordIngresada === usuarioActual.password) {
                console.log('✅ Contraseña correcta (verificación local)');

                const container = document.getElementById('perfilDatos');
                if (container) {
                    container.innerHTML = `
                <div class="profile-field"><label>📛 Nombre completo</label><input type="text" id="editNombre" value="${escapeHtml(usuarioActual.nombre || '')}"></div>
                <div class="profile-field"><label>📧 Correo electrónico</label><input type="email" id="editEmail" value="${escapeHtml(usuarioActual.email || '')}"></div>
                <div class="profile-field"><label>📞 Teléfono</label><input type="tel" id="editTelefono" value="${escapeHtml(usuarioActual.telefono || '')}"></div>
                <div class="profile-field"><label>📍 Dirección</label><input type="text" id="editDireccion" value="${escapeHtml(usuarioActual.direccion || '')}"></div>
                <div class="profile-field"><label>🔒 Nueva contraseña (dejar vacío para no cambiar)</label><input type="password" id="editPassword" placeholder="Nueva contraseña"></div>
                <div class="profile-field"><label>🔒 Confirmar nueva contraseña</label><input type="password" id="editConfirmPassword" placeholder="Confirmar nueva contraseña"></div>
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button class="save-btn" onclick="guardarCambiosPerfil()" style="flex:1;"><i class="fas fa-save"></i> Guardar cambios</button>
                    <button class="edit-toggle-btn" onclick="cerrarPerfilModal()" style="flex:1; background: #6b7280; margin:0;"><i class="fas fa-times"></i> Cancelar</button>
                </div>
            `;
                }
                mostrarToast('✅ Verificación exitosa. Puedes editar tus datos.', 'success');
            } else {
                if (errorDiv) errorDiv.textContent = 'Contraseña incorrecta. Intenta nuevamente.';
                mostrarToast('❌ Contraseña incorrecta', 'error');
                console.log('❌ La contraseña no coincide');
                console.log('Esperada:', usuarioActual?.password);
                console.log('Recibida:', passwordIngresada);
            }
        }

        // Función para verificar contraseña en el servidor
        function verificarPasswordEnServidor(userId, password) {
            return new Promise((resolve, reject) => {
                const callbackName = 'jsonp_verify_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const timeoutId = setTimeout(() => {
                    if (window[callbackName]) {
                        delete window[callbackName];
                        reject(new Error('Tiempo de espera agotado'));
                    }
                }, 10000);

                window[callbackName] = function (response) {
                    clearTimeout(timeoutId);
                    delete window[callbackName];
                    if (response && response.success) {
                        resolve(response.valid === true);
                    } else {
                        reject(new Error(response?.message || 'Error en verificación'));
                    }
                };

                const script = document.createElement('script');
                script.src = `${APPS_SCRIPT_URL}?action=verifyPassword&id=${userId}&password=${encodeURIComponent(password)}&callback=${callbackName}`;
                script.onerror = () => {
                    clearTimeout(timeoutId);
                    delete window[callbackName];
                    reject(new Error('Error de conexión con el servidor'));
                };
                document.body.appendChild(script);
            });
        }

        async function guardarCambiosPerfil() {
            const nuevoNombre = document.getElementById('editNombre')?.value.trim();
            const nuevoEmail = document.getElementById('editEmail')?.value.trim();
            const nuevoTelefono = document.getElementById('editTelefono')?.value.trim();
            const nuevaDireccion = document.getElementById('editDireccion')?.value.trim();
            const nuevaPassword = document.getElementById('editPassword')?.value;
            const confirmPassword = document.getElementById('editConfirmPassword')?.value;

            if (!nuevoNombre) {
                mostrarToast('⚠️ El nombre es obligatorio', 'warning');
                return;
            }

            if (nuevaPassword && nuevaPassword !== confirmPassword) {
                mostrarToast('⚠️ Las contraseñas no coinciden', 'warning');
                return;
            }

            mostrarLoading(true);

            try {
                // Actualizar en el servidor
                const resultado = await actualizarUsuarioEnServidor({
                    id: usuarioActual.id,
                    nombre: nuevoNombre,
                    email: nuevoEmail,
                    telefono: nuevoTelefono,
                    direccion: nuevaDireccion,
                    newPassword: nuevaPassword || undefined
                });

                if (resultado.success) {
                    // Actualizar usuario local
                    usuarioActual.nombre = nuevoNombre;
                    usuarioActual.email = nuevoEmail;
                    usuarioActual.telefono = nuevoTelefono;
                    usuarioActual.direccion = nuevaDireccion;
                    if (nuevaPassword) usuarioActual.password = nuevaPassword;
                    usuarioActual.avatar = nuevoNombre.charAt(0).toUpperCase();

                    localStorage.setItem('usuarioActual', JSON.stringify(usuarioActual));
                    sessionStorage.setItem('usuarioActual', JSON.stringify(usuarioActual));
                    actualizarUIUsuario(usuarioActual);

                    // Actualizar en usuariosDB local
                    const userIndex = usuariosDB.findIndex(u => u.id === usuarioActual.id);
                    if (userIndex !== -1) {
                        usuariosDB[userIndex].nombre = nuevoNombre;
                        usuariosDB[userIndex].email = nuevoEmail;
                        usuariosDB[userIndex].telefono = nuevoTelefono;
                        usuariosDB[userIndex].direccion = nuevaDireccion;
                        if (nuevaPassword) usuariosDB[userIndex].password = nuevaPassword;
                    }

                    mostrarToast('✅ Perfil actualizado correctamente', 'success');
                    cerrarPerfilModal();
                } else {
                    mostrarToast(`⚠️ ${resultado.message || 'Error al actualizar'}`, 'error');
                }
            } catch (error) {
                console.error('Error guardando cambios:', error);
                mostrarToast('⚠️ Error al guardar cambios', 'error');
            } finally {
                mostrarLoading(false);
            }
        }

        // Función para actualizar usuario en el servidor
        function actualizarUsuarioEnServidor(datos) {
            return new Promise((resolve, reject) => {
                const callbackName = 'jsonp_update_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const timeoutId = setTimeout(() => {
                    if (window[callbackName]) {
                        delete window[callbackName];
                        reject(new Error('Tiempo de espera agotado'));
                    }
                }, 15000);

                window[callbackName] = function (response) {
                    clearTimeout(timeoutId);
                    delete window[callbackName];
                    resolve(response);
                };

                const params = new URLSearchParams({
                    action: 'updateUser',
                    id: datos.id,
                    nombre: datos.nombre,
                    email: datos.email,
                    telefono: datos.telefono || '',
                    direccion: datos.direccion || '',
                    callback: callbackName
                });

                if (datos.newPassword) {
                    params.append('newPassword', datos.newPassword);
                }

                // También enviar la contraseña actual para verificación
                if (datos.currentPassword) {
                    params.append('currentPassword', datos.currentPassword);
                }

                const script = document.createElement('script');
                script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
                script.onerror = () => {
                    clearTimeout(timeoutId);
                    delete window[callbackName];
                    reject(new Error('Error de conexión con el servidor'));
                };
                document.body.appendChild(script);
            });
        }

        function cerrarPerfilModal() {
            const modal = document.getElementById('profileModal');
            if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
            modoEdicionPerfil = false;
            perfilVerificado = false;
        }

        function verDirecciones() {
            closeDropdown();
            if (usuarioActual) {
                mostrarToast(`📍 Dirección: ${usuarioActual.direccion || 'No especificada'}\n📞 Teléfono: ${usuarioActual.telefono || 'No especificado'}`, 'info');
            } else {
                mostrarToast('👤 Inicia sesión para ver tus direcciones', 'info');
            }
        }

        // ==================== FUNCIONES DE LOGIN ====================
        function mostrarLogin() { const modal = document.getElementById('loginModal'); if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; } }
        function cerrarLoginModal() { const modal = document.getElementById('loginModal'); if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; } }
        function switchLoginTab(tab) { const loginTab = document.getElementById('loginTab'), registerTab = document.getElementById('registerTab'), tabs = document.querySelectorAll('.login-modal .tab'); if (tab === 'login') { loginTab.style.display = 'block'; registerTab.style.display = 'none'; tabs[0].classList.add('active'); tabs[1].classList.remove('active'); } else { loginTab.style.display = 'none'; registerTab.style.display = 'block'; tabs[0].classList.remove('active'); tabs[1].classList.add('active'); } }

        function handleLogin() {
            const email = document.getElementById('loginEmail').value.trim().toLowerCase();
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe')?.checked || false;

            if (!email || !password) {
                mostrarToast('⚠️ Completa todos los campos', 'error');
                return;
            }

            console.log('🔍 Intentando login con:', email);
            console.log('📊 Usuarios disponibles:', usuariosDB.length);

            const usuario = usuariosDB.find(u => u.email === email);

            if (!usuario) {
                mostrarToast(`❌ El correo "${email}" no está registrado`, 'error');
                return;
            }

            console.log('Contraseña ingresada:', password);
            console.log('Contraseña almacenada en DB:', usuario.password);

            if (password === usuario.password) {
                // IMPORTANTE: Incluir la contraseña en usuarioSesion
                const usuarioSesion = {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    telefono: usuario.telefono || '',
                    direccion: usuario.direccion || 'Av. Larco 1234, Miraflores',
                    avatar: usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'U',
                    password: usuario.password  // <--- ESTA LÍNEA ES LA CLAVE
                };

                console.log('Guardando usuario con contraseña:', usuarioSesion.password);

                iniciarSesion(usuarioSesion, rememberMe);
                mostrarToast(`✅ ¡Bienvenido ${usuario.nombre.split(' ')[0]}!`, 'success');
                cerrarLoginModal();
                document.getElementById('loginEmail').value = '';
                document.getElementById('loginPassword').value = '';
            } else {
                mostrarToast('❌ Contraseña incorrecta', 'error');
            }
        }

        async function handleRegister() {
            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim().toLowerCase();
            const phone = document.getElementById('regPhone').value.trim();
            const direccion = document.getElementById('regDireccion').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            const acceptTerms = document.getElementById('acceptTerms').checked;

            // Validaciones
            if (!name || !email || !password) {
                mostrarToast('⚠️ Completa los campos obligatorios', 'error');
                return;
            }
            if (password !== confirmPassword) {
                mostrarToast('⚠️ Las contraseñas no coinciden', 'error');
                return;
            }
            if (!acceptTerms) {
                mostrarToast('⚠️ Acepta los Términos y Condiciones', 'error');
                return;
            }
            if (usuariosDB.some(u => u.email === email)) {
                mostrarToast('⚠️ Este correo ya está registrado', 'error');
                return;
            }

            mostrarLoading(true);

            try {
                // Intentar guardar en Google Sheets vía Apps Script
                const resultado = await registrarUsuarioEnServidor({
                    nombre: name,
                    email: email,
                    telefono: phone || '',
                    direccion: direccion || 'Av. Larco 1234, Miraflores',
                    password: password
                });

                if (resultado.success) {
                    // Usar el ID devuelto por el servidor
                    const nuevoId = resultado.id || (Math.max(...usuariosDB.map(u => u.id), 0) + 1);

                    const nuevoUsuario = {
                        id: nuevoId,
                        nombre: name,
                        email: email,
                        telefono: phone || '',
                        direccion: direccion || 'Av. Larco 1234, Miraflores',
                        password: password,
                        activo: true,
                        rol: 'cliente'
                    };

                    usuariosDB.push(nuevoUsuario);

                    const usuarioSesion = {
                        id: nuevoUsuario.id,
                        nombre: nuevoUsuario.nombre,
                        email: nuevoUsuario.email,
                        telefono: nuevoUsuario.telefono,
                        direccion: nuevoUsuario.direccion,
                        avatar: nuevoUsuario.nombre.charAt(0).toUpperCase(),
                        password: nuevoUsuario.password
                    };

                    iniciarSesion(usuarioSesion, true);
                    mostrarToast(`🎉 ¡Bienvenido ${name}! Tu cuenta ha sido creada`, 'success');
                    cerrarLoginModal();
                } else {
                    mostrarToast(`⚠️ ${resultado.message || 'Error al registrar en el servidor'}`, 'error');
                }
            } catch (error) {
                console.error('Error en registro:', error);
                mostrarToast(`⚠️ Error al registrar: ${error.message}`, 'error');
            } finally {
                mostrarLoading(false);
            }
        }

        // Función para registrar usuario en el servidor
        function registrarUsuarioEnServidor(datos) {
            return new Promise((resolve, reject) => {
                const callbackName = 'jsonp_register_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const timeoutId = setTimeout(() => {
                    if (window[callbackName]) {
                        delete window[callbackName];
                        reject(new Error('Tiempo de espera agotado'));
                    }
                }, 15000);

                window[callbackName] = function (response) {
                    clearTimeout(timeoutId);
                    delete window[callbackName];
                    if (response && response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response?.message || 'Error en el servidor'));
                    }
                };

                const params = new URLSearchParams({
                    action: 'register',
                    nombre: datos.nombre,
                    email: datos.email,
                    telefono: datos.telefono,
                    direccion: datos.direccion,
                    password: datos.password,
                    callback: callbackName
                });

                const script = document.createElement('script');
                script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
                script.onerror = () => {
                    clearTimeout(timeoutId);
                    delete window[callbackName];
                    reject(new Error('Error de conexión con el servidor'));
                };
                document.body.appendChild(script);
            });
        }

        function iniciarSesion(usuario, recordar = false) {
            console.log('Iniciando sesión con usuario:', usuario);
            console.log('Contraseña a guardar:', usuario.password);

            usuarioActual = usuario;

            if (recordar) {
                localStorage.setItem('usuarioActual', JSON.stringify(usuario));
            } else {
                sessionStorage.setItem('usuarioActual', JSON.stringify(usuario));
            }

            actualizarUIUsuario(usuario);

            // Verificar que se guardó correctamente
            console.log('usuarioActual después de guardar:', usuarioActual);
        }

        function actualizarUIUsuario(usuario) {
            const notLoggedIn = document.getElementById('notLoggedIn');
            const loggedIn = document.getElementById('loggedIn');
            const userAvatar = document.getElementById('userAvatar');
            const dropdownUserName = document.getElementById('dropdownUserName');
            const dropdownUserEmail = document.getElementById('dropdownUserEmail');

            if (notLoggedIn && loggedIn) {
                notLoggedIn.style.display = 'none';
                loggedIn.style.display = 'block';
                if (userAvatar) userAvatar.textContent = usuario.avatar || usuario.nombre.charAt(0).toUpperCase();
                if (dropdownUserName) dropdownUserName.textContent = usuario.nombre;
                if (dropdownUserEmail) dropdownUserEmail.textContent = usuario.email;
            }
        }

        function toggleDropdown() { const menu = document.getElementById('userDropdownMenu'); if (menu) menu.classList.toggle('show'); }
        function closeDropdown() { const menu = document.getElementById('userDropdownMenu'); if (menu) menu.classList.remove('show'); }
        function cerrarSesion() {
            usuarioActual = null;
            localStorage.removeItem('usuarioActual');
            sessionStorage.removeItem('usuarioActual');
            const notLoggedIn = document.getElementById('notLoggedIn'), loggedIn = document.getElementById('loggedIn');
            if (notLoggedIn && loggedIn) { notLoggedIn.style.display = 'flex'; loggedIn.style.display = 'none'; }
            closeDropdown();
            mostrarToast('👋 Sesión cerrada', 'info');
        }
        function setupDropdownEvents() {
            const avatar = document.getElementById('userAvatar');
            if (avatar) avatar.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(); });
            document.addEventListener('click', function (e) { const dropdown = document.getElementById('loggedIn'), menu = document.getElementById('userDropdownMenu'); if (dropdown && menu && !dropdown.contains(e.target)) menu.classList.remove('show'); });
        }
        function verificarSesion() {
            const guardado = localStorage.getItem('usuarioActual') || sessionStorage.getItem('usuarioActual');
            if (guardado) {
                const usuario = JSON.parse(guardado);
                actualizarUIUsuario(usuario);
            }
            setupDropdownEvents();
        }

        // ==================== OTRAS FUNCIONES ====================
        function gestionarClicCategoria(categoryId, categoryName) {
            const vistaCompleta = document.getElementById('vistaCategoriaCompleta');
            if (vistaCompleta && vistaCompleta.style.display === 'block') {
                mostrarCategoriaCompleta(categoryId, categoryName);
            } else {
                scrollToCategory(categoryId);
            }
        }

        function scrollToCategory(categoryId) {
            mostrarToast(`📦 Buscando categoría...`, 'info');
            function waitForElementAndScroll(attempts = 0) {
                const element = document.getElementById(categoryId);
                if (element) {
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - 180;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                    element.style.transition = 'all 0.3s ease';
                    element.style.boxShadow = '0 0 0 3px #059669, 0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                    setTimeout(() => { element.style.boxShadow = ''; }, 1500);
                } else if (attempts < 10) { setTimeout(() => waitForElementAndScroll(attempts + 1), 200); }
                else { mostrarToast(`⚠️ Categoría no encontrada`, 'warning'); }
            }
            waitForElementAndScroll();
        }

        function mostrarToast(msg, tipo = 'success') {
            const toast = document.createElement('div');
            toast.className = 'toast';
            if (tipo === 'error') toast.style.background = '#ef4444';
            if (tipo === 'warning') toast.style.background = '#f59e0b';
            toast.innerHTML = `<i class="fa-solid fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${msg}</span>`;
            document.body.appendChild(toast);
            setTimeout(() => { toast.style.transition = 'all 0.4s ease'; toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3000);
        }

        function irSeccion(sec) { const el = document.getElementById(sec); if (el) el.scrollIntoView({ behavior: 'smooth' }); else window.scrollTo({ top: 0, behavior: 'smooth' }); }

        function verCategoria(cat) {
            const categoriaMap = { 'Abarrotes': 'abarrotes', 'Frutas': 'frutas', 'Bebidas': 'bebidas', 'Licores': 'licores', 'Limpieza': 'limpieza', 'Snacks': 'snacks', 'Lacteos': 'lacteos', 'Carnes': 'carnes' };
            const categoriaId = categoriaMap[cat];
            if (categoriaId) { mostrarCategoriaCompleta(categoriaId, cat); }
        }

        // ==================== CARRUSEL ====================
        function initCarousel() {
            const slides = document.querySelectorAll('.slide'), dots = document.getElementById('dots');
            if (!slides.length) return;
            if (dots) {
                dots.innerHTML = '';
                slides.forEach((_, i) => { const dot = document.createElement('button'); dot.className = `dot ${i === 0 ? 'active' : ''}`; dot.onclick = () => goToSlide(i); dots.appendChild(dot); });
            }
            function showSlide(i) { slides.forEach((s, idx) => { if (idx === i) s.classList.add('active'); else s.classList.remove('active'); }); document.querySelectorAll('.dot').forEach((d, idx) => { if (idx === i) d.classList.add('active'); else d.classList.remove('active'); }); slideIndex = i; }
            window.nextSlide = () => showSlide((slideIndex + 1) % slides.length);
            window.prevSlide = () => showSlide((slideIndex - 1 + slides.length) % slides.length);
            window.goToSlide = showSlide;
            showSlide(0);
            autoInterval = setInterval(() => nextSlide(), 5000);
            document.getElementById('banner')?.addEventListener('mouseenter', () => clearInterval(autoInterval));
            document.getElementById('banner')?.addEventListener('mouseleave', () => { autoInterval = setInterval(() => nextSlide(), 5000); });
        }

        // ==================== BÚSQUEDA EN TIEMPO REAL ====================
        let timeoutBusqueda;
        function buscarProductosTiempoReal() {
            const input = document.getElementById('search-input');
            const termino = input?.value.trim().toLowerCase();
            clearTimeout(timeoutBusqueda);
            if (!termino) { mostrarTodasCategorias(); return; }
            timeoutBusqueda = setTimeout(() => {
                const resultados = productos.filter(prod => (prod.nombre && prod.nombre.toLowerCase().includes(termino)) || (prod.marca && prod.marca.toLowerCase().includes(termino)));
                if (resultados.length === 0) { mostrarToast(`🔎 No se encontraron productos para "${termino}"`, 'warning'); }
                mostrarResultadosBusqueda(resultados, termino);
            }, 300);
        }

        // ==================== VISTA DE CATEGORÍA COMPLETA ====================
        function mostrarCategoriaCompleta(categoriaId, categoriaNombre) {
            categoriaActual = categoriaId;
            subcategoriaActual = '';
            paginaActual = 1;
            document.getElementById('destacados').style.display = 'none';
            document.getElementById('vistaCategoriaCompleta').style.display = 'block';
            document.getElementById('categoriaTitulo').textContent = categoriaNombre;
            let productosCategoria;
            if (categoriaId === 'frutas') { productosCategoria = productos.filter(p => p.categoria === 'frutas' || p.categoria === 'verduras'); }
            else { productosCategoria = productos.filter(p => p.categoria === categoriaId); }
            const subcategorias = [...new Set(productosCategoria.map(p => p.subcategoria).filter(s => s))];
            const listaSubcategorias = document.getElementById('listaSubcategorias');
            if (subcategorias.length > 0) {
                listaSubcategorias.innerHTML = `<div class="subcategoria-item ${subcategoriaActual === '' ? 'active' : ''}" onclick="filtrarPorSubcategoria('')">Todos (${productosCategoria.length})</div>${subcategorias.map(sub => `<div class="subcategoria-item ${subcategoriaActual === sub ? 'active' : ''}" onclick="filtrarPorSubcategoria('${sub}')">${sub} (${productosCategoria.filter(p => p.subcategoria === sub).length})</div>`).join('')}`;
            } else { listaSubcategorias.innerHTML = '<p style="color: #64748b;">Sin subcategorías</p>'; }
            aplicarFiltrosYOrden();
        }

        function filtrarPorSubcategoria(subcategoria) {
            subcategoriaActual = subcategoria;
            paginaActual = 1;
            aplicarFiltrosYOrden();
            document.querySelectorAll('.subcategoria-item').forEach(el => { el.classList.remove('active'); if ((subcategoria === '' && el.textContent.includes('Todos')) || (el.textContent.toLowerCase().includes(subcategoria.toLowerCase()))) { el.classList.add('active'); } });
        }

        function aplicarFiltrosYOrden() {
            let filtrados;
            if (categoriaActual === 'frutas') { filtrados = productos.filter(p => p.categoria === 'frutas' || p.categoria === 'verduras'); }
            else { filtrados = productos.filter(p => p.categoria === categoriaActual); }
            if (subcategoriaActual) { filtrados = filtrados.filter(p => p.subcategoria === subcategoriaActual); }
            const orden = document.getElementById('ordenSelect').value;
            switch (orden) {
                case 'precio-asc': filtrados.sort((a, b) => (a.precio_oferta || a.precio) - (b.precio_oferta || b.precio)); break;
                case 'precio-desc': filtrados.sort((a, b) => (b.precio_oferta || b.precio) - (a.precio_oferta || a.precio)); break;
                case 'nombre-asc': filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre)); break;
                case 'nombre-desc': filtrados.sort((a, b) => b.nombre.localeCompare(a.nombre)); break;
                case 'oferta': filtrados.sort((a, b) => (b.tiene_oferta ? 1 : 0) - (a.tiene_oferta ? 1 : 0)); break;
                default: break;
            }
            productosFiltrados = filtrados;
            productosPorPagina = parseInt(document.getElementById('mostrarSelect').value);
            paginaActual = 1;
            renderizarProductosFull();
            renderizarPaginacion();
        }

        function renderizarProductosFull() {
            const start = (paginaActual - 1) * productosPorPagina;
            const end = start + productosPorPagina;
            const productosPagina = productosFiltrados.slice(start, end);
            const container = document.getElementById('productosFullGrid');
            if (productosPagina.length === 0) { container.innerHTML = '<div style="text-align:center; padding:60px; grid-column: span 4;">No hay productos disponibles</div>'; return; }
            container.innerHTML = productosPagina.map(prod => {
                const tieneOferta = prod.tiene_oferta && prod.precio_oferta > 0;
                const precioMostrar = tieneOferta ? prod.precio_oferta : prod.precio;
                const agotado = prod.stock === 0;
                return `<div class="product ${agotado ? 'product-agotado' : ''}" style="${agotado ? 'opacity: 0.7; background: #f5f5f5;' : ''}">
            ${agotado ? '<div class="agotado-badge">AGOTADO</div>' : ''}
            <img src="${prod.imagen_url || 'https://images.unsplash.com/photo-1542838132-92c5337a8b8f?w=300&h=280&fit=crop'}" class="product-img" style="${agotado ? 'filter: grayscale(0.5);' : ''}">
            <div class="product-info">
                <h4 class="product-name">${prod.nombre} ${prod.presentacion}</h4>
                ${prod.marca ? `<p style="font-size: 12px; color: #64748b;">${prod.marca}</p>` : ''}
                ${tieneOferta ? `<p style="font-size: 12px; color: #ef4444;"><s>S/ ${prod.precio.toFixed(2)}</s></p>` : ''}
                <div class="product-price-row">
                    <span class="product-price">S/ ${precioMostrar.toFixed(2)}</span>
                    ${agotado ? `<button class="add-btn" disabled style="background-color: #9ca3af; cursor: not-allowed;">Agotado</button>` : `<button onclick="agregarAlCarrito(${prod.id})" class="add-btn">Agregar</button>`}
                </div>
            </div>
        </div>`;
            }).join('');
        }

        function renderizarPaginacion() {
            const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
            const container = document.getElementById('paginationContainer');
            if (totalPaginas <= 1) { container.innerHTML = ''; return; }
            let html = `<button class="pagination-btn" onclick="cambiarPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
            let startPage = Math.max(1, paginaActual - 2);
            let endPage = Math.min(totalPaginas, startPage + 4);
            if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
            for (let i = startPage; i <= endPage; i++) { html += `<button class="pagination-btn ${i === paginaActual ? 'active' : ''}" onclick="cambiarPagina(${i})">${i}</button>`; }
            html += `<button class="pagination-btn" onclick="cambiarPagina(${paginaActual + 1})" ${paginaActual === totalPaginas ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
            container.innerHTML = html;
        }

        function cambiarPagina(pagina) {
            const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
            if (pagina < 1 || pagina > totalPaginas) return;
            paginaActual = pagina;
            renderizarProductosFull();
            renderizarPaginacion();
            window.scrollTo({ top: document.getElementById('vistaCategoriaCompleta').offsetTop - 100, behavior: 'smooth' });
        }

        function volverADestacados() {
            document.getElementById('destacados').style.display = 'block';
            document.getElementById('vistaCategoriaCompleta').style.display = 'none';
            window.scrollTo({ top: document.getElementById('destacados').offsetTop - 100, behavior: 'smooth' });
        }

        // ==================== FUNCIONES DE ENTREGA ====================
        function cambiarTipoEntrega(tipo) {
            tipoEntregaSeleccionado = tipo;
            const pickupOptions = document.getElementById('pickupOptions');
            const deliveryOptionsDiv = document.getElementById('deliveryOptionsDiv');
            const checkoutBtn = document.getElementById('checkoutBtn');

            tiempoRecojoSeleccionado = null;
            pagoDeliverySeleccionado = null;

            document.querySelectorAll('.suboption-btn').forEach(btn => btn.classList.remove('selected'));
            document.getElementById('tiempoSeleccionado').innerHTML = '';
            document.getElementById('pagoSeleccionado').innerHTML = '';

            if (tipo === 'pickup') {
                pickupOptions.style.display = 'block';
                deliveryOptionsDiv.style.display = 'none';
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = 'RESERVAR COMPRA';
            } else if (tipo === 'delivery') {
                pickupOptions.style.display = 'none';
                deliveryOptionsDiv.style.display = 'block';
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = 'CONFIRMAR DELIVERY';
            }
        }

        function seleccionarTiempoRecojo(tiempo) {
            tiempoRecojoSeleccionado = tiempo;
            const tiempoTexto = { '15min': '15 minutos', '30min': '30 minutos', '1h': '1 hora' };
            document.getElementById('tiempoSeleccionado').innerHTML = `✅ Tiempo seleccionado: ${tiempoTexto[tiempo]}`;
            document.querySelectorAll('#pickupOptions .suboption-btn').forEach(btn => {
                btn.classList.remove('selected');
                if (btn.getAttribute('data-time') === tiempo) { btn.classList.add('selected'); }
            });
            verificarHabilitarBoton();
        }

        function seleccionarPagoDelivery(pago) {
            pagoDeliverySeleccionado = pago;
            const pagoTexto = { 'efectivo': 'Efectivo contra entrega', 'yape': 'Yape / Plin', 'transferencia': 'Transferencia bancaria' };
            document.getElementById('pagoSeleccionado').innerHTML = `✅ Pago seleccionado: ${pagoTexto[pago]}`;
            document.querySelectorAll('#deliveryOptionsDiv .suboption-btn').forEach(btn => {
                btn.classList.remove('selected');
                if (btn.getAttribute('data-payment') === pago) { btn.classList.add('selected'); }
            });
            verificarHabilitarBoton();
        }

        function verificarHabilitarBoton() {
            const checkoutBtn = document.getElementById('checkoutBtn');
            if (tipoEntregaSeleccionado === 'pickup') {
                checkoutBtn.disabled = !tiempoRecojoSeleccionado;
            } else if (tipoEntregaSeleccionado === 'delivery') {
                checkoutBtn.disabled = !pagoDeliverySeleccionado;
            } else {
                checkoutBtn.disabled = true;
            }
        }

        // ==================== EXPOSICIÓN GLOBAL DE FUNCIONES ====================
        window.agregarAlCarrito = agregarAlCarrito;
        window.mostrarCarrito = mostrarCarrito;
        window.ocultarCarrito = ocultarCarrito;
        window.cambiarCantidad = cambiarCantidad;
        window.eliminarDelCarrito = eliminarDelCarrito;
        window.finalizarCompra = finalizarCompra;
        window.mostrarLogin = mostrarLogin;
        window.cerrarLoginModal = cerrarLoginModal;
        window.switchLoginTab = switchLoginTab;
        window.handleLogin = handleLogin;
        window.handleRegister = handleRegister;
        window.cerrarSesion = cerrarSesion;
        window.verMiPerfil = verMiPerfil;
        window.verDirecciones = verDirecciones;
        window.irSeccion = irSeccion;
        window.verCategoria = verCategoria;
        window.scrollToCategory = scrollToCategory;
        window.buscarProductos = buscarProductos;
        window.limpiarBusqueda = limpiarBusqueda;
        window.mostrarTodasCategorias = mostrarTodasCategorias;
        window.buscarProductosTiempoReal = buscarProductosTiempoReal;
        window.gestionarClicCategoria = gestionarClicCategoria;
        window.mostrarCategoriaCompleta = mostrarCategoriaCompleta;
        window.filtrarPorSubcategoria = filtrarPorSubcategoria;
        window.aplicarFiltrosYOrden = aplicarFiltrosYOrden;
        window.cambiarPagina = cambiarPagina;
        window.volverADestacados = volverADestacados;
        window.cambiarTipoEntrega = cambiarTipoEntrega;
        window.seleccionarTiempoRecojo = seleccionarTiempoRecojo;
        window.seleccionarPagoDelivery = seleccionarPagoDelivery;
        window.verificarHabilitarBoton = verificarHabilitarBoton;
        window.iniciarEdicionPerfil = iniciarEdicionPerfil;
        window.verificarPasswordParaEditar = verificarPasswordParaEditar;
        window.guardarCambiosPerfil = guardarCambiosPerfil;
        window.cerrarPerfilModal = cerrarPerfilModal;

        // ==================== INICIALIZACIÓN ====================
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { cerrarLoginModal(); cerrarPerfilModal(); } });
        document.getElementById('loginModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('loginModal')) cerrarLoginModal(); });
        document.getElementById('profileModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('profileModal')) cerrarPerfilModal(); });

        async function iniciarAplicacion() {
            console.log('🚀 Iniciando aplicación...');

            // PRIMERO: Cargar usuarios predeterminados (esto asegura que siempre haya usuarios)
            cargarUsuariosPredeterminados();

            // Intentar cargar usuarios adicionales desde Google Sheets
            await cargarUsuariosDesdeSheet();

            // Cargar productos
            await cargarProductosDesdeSheet();

            // Inicializar componentes
            initCarousel();
            actualizarCarrito();
            verificarSesion();

            console.log('✅ Aplicación iniciada correctamente');
            console.log(`📊 Usuarios disponibles: ${usuariosDB.length}`);
            console.log(`📦 Productos disponibles: ${productos.length}`);

            // Mostrar credenciales en consola para referencia
            console.log('\n🔑 CREDENCIALES DE PRUEBA:');
            usuariosDB.forEach(u => {
                console.log(`   ${u.email} / ${u.password}`);
            });
        }

        // Iniciar la aplicación
        iniciarAplicacion();
    
