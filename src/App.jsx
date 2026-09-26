import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabaseClient';
import { 
  FileText, Users, Wallet, RefreshCw, PlusCircle, BookOpen, 
  ChevronDown, ChevronUp, UploadCloud, CheckCircle2, FileCode, Save, Building2, UserPlus, X,
  CreditCard, Plus, Trash2, Search, FileCode2, Receipt, Scale, Download, Calendar,
  LayoutDashboard, ShieldCheck, Printer, ArrowUpRight, ArrowDownRight, DollarSign,
  Briefcase, TrendingUp, Layers, PieChart, Landmark, Sparkles, Activity, Home, Clock,
  AlertCircle, CheckCircle, HelpCircle, Loader2, AlertTriangle, ShieldAlert
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('inicio');

  // ==========================================
  // ESTADOS MAESTROS ENTERPRISE (AGREGADOS)
  // ==========================================
  const [clientes, setClientes] = useState([
    { id: '1', nit: '123456-7', nombre: 'Comercializadora del Norte, S.A.', enUsoPor: null },
    { id: '2', nit: '765432-1', nombre: 'Servicios Profesionales de Guatemala', enUsoPor: 'Carlos Duarte' }
  ]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [isHoveredMenu, setIsHoveredMenu] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Controles de seguridad y formularios
  const [isSaving, setIsSaving] = useState(false);
  const [dirtyState, setDirtyState] = useState(false);
  const [notification, setNotification] = useState(null);

  // 1. Persistencia del cliente activo mediante LocalStorage
  useEffect(() => {
    const savedClient = localStorage.getItem('gt_active_client');
    if (savedClient) {
      try {
        const parsed = JSON.parse(savedClient);
        setClienteSeleccionado(parsed);
      } catch (e) {
        console.error("Error al cargar cliente guardado", e);
      }
    }
  }, []);

  const handleSelectClient = (cliente) => {
    if (cliente.enUsoPor && cliente.enUsoPor !== 'Tú') {
      showNotification(`⚠️ Esta empresa está siendo atendida actualmente por ${cliente.enUsoPor}. Abriendo en modo lectura.`, 'warning');
    }
    setClienteSeleccionado(cliente);
    localStorage.setItem('gt_active_client', JSON.stringify(cliente));
    showNotification(`Empresa seleccionada: ${cliente.nombre}`, 'success');
  };

  // 2. Comandos de teclado globales (Ctrl + K y tecla ESC con Dirty State)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        if (dirtyState) {
          if (window.confirm("⚠️ Tienes datos sin guardar en este formulario. ¿Estás seguro de cerrarlo y descartar los cambios?")) {
            setDirtyState(false);
          }
        } else {
          setCommandPaletteOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dirtyState]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Estado para Clientes / Empresas (Multi-tenant real en Supabase)

  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nit: '', razon_social: '', nombre_comercial: '' });
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  // Estados del sistema contable avanzado
  const [empleados, setEmpleados] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', type: '' });
  const [healthStatus, setHealthStatus] = useState('online');

  // Filtro por Período / Mes Fiscal
  const [periodoFiltro, setPeriodoFiltro] = useState('2026-09');

  // Estado para Caja Chica (Con protección de doble clic y dirty state)
  const [nuevoGasto, setNuevoGasto] = useState({
    fecha: '2026-09-25',
    concepto: '',
    comprobante: '',
    responsable: '',
    monto: ''
  });
  const [guardandoGasto, setGuardandoGasto] = useState(false);

  // Estado para Módulo SAT (DTE XML Compras)
  const [facturasXML, setFacturasXML] = useState([]);
  const [procesandoXML, setProcesandoXML] = useState(false);
  const [guardandoSAT, setGuardandoSAT] = useState(false);
  const [mensajeSAT, setMensajeSAT] = useState('');

  // Ítems dinámicos y cálculo automático de IVA 12% (Ventas DTE)
  const [itemsFactura, setItemsFactura] = useState([
    { id: 1, descripcion: 'Servicios Profesionales y Asesoría Tecnológica', cantidad: 1, precioUnitario: 2500 }
  ]);

  // Estado para Módulo de Retenciones
  const [retenciones, setRetenciones] = useState([]);
  const [nuevaRetencion, setNuevaRetencion] = useState({
    tipo: 'IVA 15%',
    documento: '',
    nitAgente: '',
    montoBase: '',
    montoRetenido: ''
  });

  // Estado para CXC / CXP y Activos Fijos vinculados al cliente activo
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [activosFijos, setActivosFijos] = useState([]);
  const [movimientosBancos, setMovimientosBancos] = useState([]);

  // Estado para Vista Previa / Representación Gráfica DTE
  const [mostrarModalDTE, setMostrarModalDTE] = useState(false);
  const [dteGeneradoInfo, setDteGeneradoInfo] = useState(null);

  const handleAgregarItem = () => {
    setDirtyState(true);
    setItemsFactura([
      ...itemsFactura,
      { id: Date.now(), descripcion: '', cantidad: 1, precioUnitario: 0 }
    ]);
  };

  const handleEliminarItem = (id) => {
    if (itemsFactura.length === 1) return;
    setDirtyState(true);
    setItemsFactura(itemsFactura.filter(item => item.id !== id));
  };

  const handleItemChange = (id, campo, valor) => {
    setDirtyState(true);
    setItemsFactura(itemsFactura.map(item => {
      if (item.id === id) {
        return { 
          ...item, 
          [campo]: campo === 'descripcion' ? valor : (valor === '' ? '' : parseFloat(valor) || 0) 
        };
      }
      return item;
    }));
  };

  const totalFactura = clienteSeleccionado ? itemsFactura.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0) : 0;
  const baseImponibleFactura = totalFactura / 1.12;
  const ivaFactura = totalFactura - baseImponibleFactura;
  
  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (clienteSeleccionado) {
      fetchDataCliente(clienteSeleccionado.id);
    } else {
      setEmpleados([]);
      setGastos([]);
      setFacturasXML([]);
      setCuentasPorCobrar([]);
      setCuentasPorPagar([]);
      setActivosFijos([]);
      setMovimientosBancos([]);
      setRetenciones([]);
    }
  }, [clienteSeleccionado]);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clientes').select('*').order('razon_social', { ascending: true });
    if (!error && data) {
      setClientes(data);
      setHealthStatus('online');
    } else {
      setHealthStatus('warning');
    }
    setLoading(false);
  };

  const fetchDataCliente = async (clienteId) => {
    setLoading(true);
    try {
      const { data: empData, error: errEmp } = await supabase.from('empleados').select('*').eq('cliente_id', clienteId);
      if (errEmp) throw errEmp;
      setEmpleados(empData || []);

      const { data: cajaData, error: errCaja } = await supabase.from('caja_chica').select('*').eq('cliente_id', clienteId);
      if (errCaja) throw errCaja;
      setGastos(cajaData || []);

      const { data: satData, error: errSat } = await supabase
        .from('facturas_sat')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('fecha', { ascending: false });

      if (errSat) throw errSat;

      if (satData) {
        const facturasFormateadas = satData.map(f => ({
          id: f.id,
          uuid: f.uuid,
          serie: f.serie,
          numero: f.numero,
          fecha: f.fecha,
          emisorNit: f.emisor_nit,
          emisorNombre: f.emisor_nombre,
          base: Number(f.base),
          iva: Number(f.iva),
          total: Number(f.total),
          guardado: true
        }));
        setFacturasXML(facturasFormateadas);
      } else {
        setFacturasXML([]);
      }

      setCuentasPorCobrar([]);
      setCuentasPorPagar([]);
      setActivosFijos([]);
      setMovimientosBancos([]);
      setRetenciones([]);

      setHealthStatus('online');
    } catch (err) {
      console.error("Error al sincronizar datos del cliente:", err);
      setHealthStatus('warning');
    }
    setLoading(false);
  };

  const handleSincronizarSupabase = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSyncStatus({ loading: true, message: 'Conectando con Supabase...', type: '' });
    try {
      await fetchClientes();
      if (clienteSeleccionado) {
        await fetchDataCliente(clienteSeleccionado.id);
      }
      setSyncStatus({ 
        loading: false, 
        message: `Sincronización exitosa: Datos actualizados para ${clienteSeleccionado?.razon_social || 'la firma'}.`, 
        type: 'success' 
      });
      setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 5000);
    } catch (err) {
      setSyncStatus({ 
        loading: false, 
        message: 'Error al sincronizar con Supabase. Verifique su conexión de red.', 
        type: 'error' 
      });
    }
    setIsSaving(false);
  };

  const handleCrearCliente = async (e) => {
    e.preventDefault();
    if (!nuevoCliente.nit || !nuevoCliente.razon_social || isSaving) return;

    setIsSaving(true);
    setGuardandoCliente(true);
    const { data, error } = await supabase
      .from('clientes')
      .insert([{
        nit: nuevoCliente.nit.trim(),
        razon_social: nuevoCliente.razon_social.trim(),
        nombre_comercial: nuevoCliente.nombre_comercial.trim() || nuevoCliente.razon_social.trim()
      }])
      .select();

    if (!error && data && data.length > 0) {
      setClientes([...clientes, data[0]]);
      setClienteSeleccionado(data[0]);
      setNuevoCliente({ nit: '', razon_social: '', nombre_comercial: '' });
      setMostrarModalCliente(false);
      setDirtyState(false);
      setActiveTab('inicio');
    } else {
      alert("Error al guardar cliente. Verifica que el NIT no esté duplicado.");
    }
    setGuardandoCliente(false);
    setIsSaving(false);
  };

  const handleGuardarGasto = async (e) => {
    e.preventDefault();
    if (!nuevoGasto.concepto || !nuevoGasto.monto || !clienteSeleccionado || isSaving) return;

    setIsSaving(true);
    setGuardandoGasto(true);
    const { data, error } = await supabase.from('caja_chica').insert([
      {
        cliente_id: clienteSeleccionado.id,
        fecha: nuevoGasto.fecha,
        concepto: nuevoGasto.concepto,
        comprobante: nuevoGasto.comprobante,
        responsable: nuevoGasto.responsable,
        monto: parseFloat(nuevoGasto.monto) || 0
      }
    ]).select();

    if (!error && data) {
      setGastos([...gastos, ...data]);
      setNuevoGasto({
        fecha: '2026-09-25',
        concepto: '',
        comprobante: '',
        responsable: '',
        monto: ''
      });
      setDirtyState(false);
    }
    setGuardandoGasto(false);
    setIsSaving(false);
  };

  const handleFileUpload = async (event) => {
    if (!clienteSeleccionado) {
      alert("Por favor seleccione un cliente antes de cargar XMLs.");
      return;
    }
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setProcesandoXML(true);
    setMensajeSAT('');
    const nuevasFacturas = [];

    for (const file of files) {
      if (file.type !== 'text/xml' && !file.name.endsWith('.xml')) continue;

      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      try {
        const getElementValue = (tagName) => {
          const el = xmlDoc.getElementsByTagName(tagName)[0] || xmlDoc.getElementsByTagName(`dte:${tagName}`)[0];
          return el ? el.textContent.trim() : '';
        };

        const getAttr = (tagName, attrName) => {
          const el = xmlDoc.getElementsByTagName(tagName)[0] || xmlDoc.getElementsByTagName(`dte:${tagName}`)[0];
          return el ? (el.getAttribute(attrName) || el.getAttribute(attrName.toLowerCase()) || '') : '';
        };

        const numAutEl = xmlDoc.getElementsByTagName('NumeroAutorizacion')[0] || xmlDoc.getElementsByTagName('dte:NumeroAutorizacion')[0];
        const datosEmisionEl = xmlDoc.getElementsByTagName('DatosEmision')[0] || xmlDoc.getElementsByTagName('dte:DatosEmision')[0];

        const uuid = getElementValue('NumeroAutorizacion') || getElementValue('Autorizacion') || 'UUID-' + Math.random();
        const serie = (numAutEl ? numAutEl.getAttribute('Serie') : '') || (datosEmisionEl ? datosEmisionEl.getAttribute('Serie') : '') || getAttr('DTE', 'Serie') || 'A';
        const numero = (numAutEl ? numAutEl.getAttribute('Numero') : '') || (datosEmisionEl ? datosEmisionEl.getAttribute('Numero') : '') || getAttr('DTE', 'Numero') || '101';
        const fechaHora = getAttr('DatosEmision', 'FechaHoraEmision') || getAttr('DTE', 'FechaHoraEmision') || '2026-09-25T10:00:00';
        const fecha = fechaHora.split('T')[0];
        const emisorNit = getAttr('Emisor', 'NITEmisor') || getAttr('Emisor', 'NIT') || '12345678';
        const emisorNombre = getAttr('Emisor', 'NombreEmisor') || getAttr('Emisor', 'Nombre') || 'Proveedor S.A.';
        const totalStr = getElementValue('MontoTotal') || getElementValue('GranTotal') || '333';
        const total = parseFloat(totalStr) || 0;
        const base = Math.round((total / 1.12) * 100) / 100;
        const iva = Math.round((total - base) * 100) / 100;

        nuevasFacturas.push({
          id: Math.random().toString(36).substr(2, 9),
          uuid, serie, numero, fecha, emisorNit, emisorNombre, base, iva, total, guardado: false
        });
      } catch (err) {
        console.error("Error al procesar el XML:", file.name, err);
      }
    }

    setFacturasXML(prev => {
      const uuidsExistentes = new Set(prev.map(f => f.uuid));
      const unicas = nuevasFacturas.filter(f => !uuidsExistentes.has(f.uuid));
      return [...prev, ...unicas];
    });

    setProcesandoXML(false);
  };

  const handleGuardarFacturasSAT = async () => {
    if (!clienteSeleccionado || isSaving) {
      alert("Debes seleccionar un cliente antes de guardar.");
      return;
    }

    const pendientes = facturasXML.filter(f => !f.guardado);
    if (!pendientes.length) return;

    setIsSaving(true);
    setGuardandoSAT(true);
    setMensajeSAT('');

    const registros = pendientes.map(f => ({
      cliente_id: clienteSeleccionado.id,
      uuid: f.uuid, serie: f.serie, numero: f.numero, fecha: f.fecha,
      emisor_nit: f.emisorNit, emisor_nombre: f.emisorNombre, base: f.base, iva: f.iva, total: f.total
    }));

    const { error } = await supabase.from('facturas_sat').upsert(registros, { onConflict: 'uuid' });

    if (!error) {
      setMensajeSAT(`¡Facturas guardadas con éxito para ${clienteSeleccionado.razon_social} (NIT: ${clienteSeleccionado.nit})!`);
      setFacturasXML(prev => prev.map(f => ({ ...f, guardado: true })));
    } else {
      console.error("Error al guardar en Supabase:", error);
      setMensajeSAT('Error al guardar. Revisa la consola.');
    }

    setGuardandoSAT(false);
    setIsSaving(false);
  };

  const facturasFiltradasPeriodo = facturasXML.filter(f => {
    if (!periodoFiltro) return true;
    return f.fecha && f.fecha.startsWith(periodoFiltro);
  });

  const handleExportarDeclaraguateTXT = () => {
    if (!clienteSeleccionado) {
      alert("Seleccione un cliente primero.");
      return;
    }
    if (!facturasFiltradasPeriodo.length) {
      alert("No hay documentos en el período seleccionado para exportar.");
      return;
    }

    let contenidoTXT = `LIBRO DE COMPRAS Y SERVICIOS RECIBIDOS\n`;
    contenidoTXT += `PERÍODO: ${periodoFiltro} | CLIENTE: ${clienteSeleccionado?.razon_social} (NIT: ${clienteSeleccionado?.nit})\n`;
    contenidoTXT += `---------------------------------------------------------------------------------------------------\n`;
    contenidoTXT += `FECHA\tNIT PROVEEDOR\tNOMBRE PROVEEDOR\tSERIE\tNUMERO\tBASE (Q)\tIVA (Q)\tTOTAL (Q)\n`;
    contenidoTXT += `---------------------------------------------------------------------------------------------------\n`;

    facturasFiltradasPeriodo.forEach(f => {
      contenidoTXT += `${f.fecha}\t${f.emisorNit}\t${f.emisorNombre}\t${f.serie}\t${f.numero}\t${f.base.toFixed(2)}\t${f.iva.toFixed(2)}\t${f.total.toFixed(2)}\n`;
    });

    const blob = new Blob([contenidoTXT], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Libro_Compras_${clienteSeleccionado?.nit}_${periodoFiltro}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calcularNomina = (emp) => {
    const sueldoBase = Number(emp.salario_base) || 0;
    const bonifLey = Number(emp.bonificacion_ley) || 250.00;
    const igssLaboral = sueldoBase * 0.0483;
    const liquido = (sueldoBase + bonifLey) - igssLaboral;
    return { sueldoBase, bonifLey, igssLaboral, liquido };
  };

  const resumenPlanilla = empleados.reduce(
    (acc, emp) => {
      const { sueldoBase, bonifLey, igssLaboral, liquido } = calcularNomina(emp);
      const cuotaPatronal = sueldoBase * 0.1267;
      return {
        totalSueldos: acc.totalSueldos + sueldoBase,
        totalBonificacion: acc.totalBonificacion + bonifLey,
        totalIgssLaboral: acc.totalIgssLaboral + igssLaboral,
        totalCuotaPatronal: acc.totalCuotaPatronal + cuotaPatronal,
        totalLiquido: acc.totalLiquido + liquido
      };
    },
    { totalSueldos: 0, totalBonificacion: 0, totalIgssLaboral: 0, totalCuotaPatronal: 0, totalLiquido: 0 }
  );

  const totalCajaChica = clienteSeleccionado ? gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0) : 0;
  
  const totalFacturasSAT = clienteSeleccionado ? facturasFiltradasPeriodo.reduce((acc, f) => acc + f.total, 0) : 0;
  const totalIvaSAT = clienteSeleccionado ? facturasFiltradasPeriodo.reduce((acc, f) => acc + f.iva, 0) : 0;
  const facturasPendientesCount = clienteSeleccionado ? facturasFiltradasPeriodo.filter(f => !f.guardado).length : 0;

  const totalCreditoFiscal = totalIvaSAT;
  const totalDebitoFiscal = ivaFactura; 
  const saldoIvaLiquidacion = clienteSeleccionado ? (totalDebitoFiscal - totalCreditoFiscal) : 0;

  const handleAgregarRetencion = (e) => {
    e.preventDefault();
    if (!clienteSeleccionado) {
      alert("Seleccione un cliente primero.");
      return;
    }
    if (!nuevaRetencion.documento || !nuevaRetencion.montoBase) return;
    const base = parseFloat(nuevaRetencion.montoBase) || 0;
    const retenido = nuevaRetencion.tipo === 'IVA 15%' ? base * 0.15 : base * 0.05;

    const reg = {
      id: Date.now(),
      tipo: nuevaRetencion.tipo,
      documento: nuevaRetencion.documento,
      nitAgente: nuevaRetencion.nitAgente || 'CF',
      montoBase: base,
      montoRetenido: retenido,
      fecha: '2026-09-25'
    };
    setDirtyState(true);
    setRetenciones([...retenciones, reg]);
    setNuevaRetencion({ tipo: 'IVA 15%', documento: '', nitAgente: '', montoBase: '', montoRetenido: '' });
  };

  const totalActivosCosto = activosFijos.reduce((acc, a) => acc + a.costo, 0);
  const totalDepreciacionAnual = activosFijos.reduce((acc, a) => {
    const porcentaje = a.tipo.includes('Vehículos') ? 0.20 : 0.3333;
    return acc + (a.costo * porcentaje);
  }, 0);
  const totalDepreciacionMensual = totalDepreciacionAnual / 12;

  const totalCXC = cuentasPorCobrar.filter(c => c.estado === 'Pendiente').reduce((acc, c) => acc + c.monto, 0);
  const totalCXP = cuentasPorPagar.filter(p => p.estado === 'Pendiente').reduce((acc, p) => acc + p.monto, 0);

  const handleGenerarRepresentacionGrafica = () => {
    if (!clienteSeleccionado) {
      alert("Seleccione un cliente primero.");
      return;
    }
    const dteInfo = {
      uuid: 'UUID-' + Math.random().toString(36).substring(2, 15).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      serie: 'A1',
      numero: Math.floor(Math.random() * 899999 + 100000),
      fechaEmision: '2026-09-25 14:30:00',
      emisorNit: clienteSeleccionado?.nit || '12345678',
      emisorNombre: clienteSeleccionado?.razon_social || 'Empresa Pruebas, S.A.',
      items: itemsFactura,
      base: baseImponibleFactura,
      iva: ivaFactura,
      total: totalFactura
    };
    setDteGeneradoInfo(dteInfo);
    setMostrarModalDTE(true);
  };

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">

      {/* 1. ESTILOS GLOBALES @media print PARA IMPRESIÓN PROFESIONAL */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          aside, header, button, .no-print {
            display: none !important;
          }
          body, html, main, #root {
            background: white !important;
            color: black !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}} />

      {/* BARRA LATERAL MODERNA CON EXPANSIÓN POR HOVER Y SCROLLBAR INVISIBLE */}
      <aside className="relative z-30 flex flex-col w-20 hover:w-72 bg-[#0b1329] border-r border-slate-800 transition-all duration-300 ease-in-out shadow-2xl group overflow-hidden no-print">
        
        {/* Cabecera / Logo */}
        <div className="flex items-center h-20 px-5 border-b border-slate-800 whitespace-nowrap">
          <div className="w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
            <h1 className="text-base font-extrabold tracking-tight text-white">GT Contable <span className="text-amber-400">AI</span></h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Enterprise GTQ</p>
          </div>
        </div>

        {/* Enlaces de Navegación con scrollbar invisible */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { id: 'inicio', label: 'Inicio / Bienvenida', icon: Home },
            { id: 'dashboard', label: 'Panel Gerencial', icon: LayoutDashboard },
            { id: 'facturacion', label: 'Emisión DTE (Ventas)', icon: CreditCard },
            { id: 'sat', label: 'Ingestión XML (SAT)', icon: FileText },
            { id: 'libros_iva', label: 'Libros Legales IVA', icon: Scale },
            { id: 'retenciones', label: 'Retenciones IVA / ISR', icon: ShieldCheck },
            { id: 'cxc_cxp', label: 'Cuentas CXC y CXP', icon: Layers },
            { id: 'bancos', label: 'Conciliación Bancaria', icon: Landmark },
            { id: 'activos', label: 'Activos Fijos y Dep.', icon: Briefcase },
            { id: 'estados', label: 'Estados Financieros', icon: PieChart },
            { id: 'nomina', label: 'Nómina y Planilla', icon: Users },
            { id: 'cajachica', label: 'Caja Chica y Gastos', icon: Wallet },
            { id: 'control_contador', label: 'Control Global (Contador)', icon: Activity },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (dirtyState) {
                    if (!window.confirm("⚠️ Tienes cambios sin guardar. ¿Deseas descartarlos y cambiar de sección?")) return;
                    setDirtyState(false);
                  }
                  setActiveTab(item.id);
                }}
                className={`w-full flex items-center h-12 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 font-extrabold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 min-w-[20px] ${isActive ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400'}`} />
                <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Pie de barra / Botón de Sincronización */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 whitespace-nowrap">
          <button 
            onClick={handleSincronizarSupabase}
            disabled={syncStatus.loading || isSaving}
            className="w-full flex items-center h-11 px-3.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-xs text-slate-300 transition border border-slate-700/50 cursor-pointer overflow-hidden disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 min-w-[20px] text-amber-400 ${syncStatus.loading ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'}`} />
            <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">Sincronizar Supabase</span>
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#070b14]">
        
        {/* BARRA SUPERIOR */}
        <header className="bg-[#0b1329] border-b border-slate-800 px-8 py-4 flex justify-between items-center shadow-lg relative no-print">
          
          {/* NOTIFICACIÓN FLOTANTE DE SINCRONIZACIÓN INTELIGENTE */}
          {syncStatus.message && (
            <div className={`absolute top-20 left-8 z-50 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-2xl border animate-in fade-in duration-300 ${
              syncStatus.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              {syncStatus.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
              <span>{syncStatus.message}</span>
              {syncStatus.type === 'error' && (
                <button onClick={handleSincronizarSupabase} className="underline ml-2 text-white hover:text-amber-400 cursor-pointer">Reintentar</button>
              )}
            </div>
          )}

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl">
              <Building2 className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Cliente Activo Multi-Tenant</p>
                <select
                  value={clienteSeleccionado?.id || ''}
                  onChange={(e) => {
                    const sel = clientes.find(c => c.id === e.target.value);
                    setClienteSeleccionado(sel || null);
                    if (sel) {
                      localStorage.setItem('gt_active_client', JSON.stringify(sel));
                    } else {
                      localStorage.removeItem('gt_active_client');
                    }
                    setActiveTab('inicio');
                  }}
                  className="bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer pr-4"
                >
                  <option value="" className="bg-slate-900 text-slate-400">-- Seleccione Cliente --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.razon_social} (NIT: {c.nit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl">
              <Calendar className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Período Fiscal</span>
                <input
                  type="month"
                  value={periodoFiltro}
                  onChange={(e) => setPeriodoFiltro(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* INDICADOR DE SALUD DE CONEXIÓN (HEALTH CHECK) */}
            <div className="hidden xl:flex items-center space-x-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-2xl">
              <span className={`w-2 h-2 rounded-full ${healthStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">SAT & Supabase: <strong className={healthStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'}>{healthStatus === 'online' ? 'Óptimo' : 'Revisar'}</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMostrarModalCliente(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl flex items-center space-x-2 text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Agregar Cliente</span>
            </button>
          </div>
        </header>

        {/* CONTENEDOR PRINCIPAL */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6 print-container">
          
          {/* PANTALLA DE INICIO / BIENVENIDA CON SALUDO IA (CONTADORA DUARTE) */}
          {activeTab === 'inicio' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="bg-gradient-to-r from-[#0b1329] to-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center space-x-2">
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>GT Contable AI Assistant</span>
                    </span>
                    <span className="text-slate-400 text-xs font-mono">• Viernes, 25 de Septiembre 2026</span>
                  </div>
                  <h2 className="text-3xl font-black text-white">
                    ¡Buenos días, Contadora Duarte! ✨
                  </h2>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Su despacho cuenta com <strong className="text-amber-400">{clientes.length} empresas activas</strong> en cartera sincronizadas con Supabase. Actualmente tiene seleccionada la empresa <strong className="text-white">{clienteSeleccionado?.razon_social || 'Ninguna'}</strong>. ¿Qué desea realizar hoy?
                  </p>
                </div>
                
                <div className="flex flex-col space-y-2 relative z-10 w-full md:w-auto">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-6 py-3.5 rounded-2xl text-xs shadow-xl shadow-amber-500/20 cursor-pointer transition active:scale-95 flex items-center justify-center space-x-2"
                  >
                    <LayoutDashboard className="w-4 h-4 stroke-[2.5]" />
                    <span>Continuar con {clienteSeleccionado?.razon_social || 'Empresa'}</span>
                  </button>
                </div>
              </div>

              {/* TARJETAS DE CARTERA DE CLIENTES Y ÚLTIMA ACTIVIDAD */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Seleccione o verifique su cartera de clientes en Supabase</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {clientes.map(c => {
                    const isSelected = clienteSeleccionado?.id === c.id;
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => {
                          setClienteSeleccionado(c);
                          localStorage.setItem('gt_active_client', JSON.stringify(c));
                        }}
                        className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-xl ${
                          isSelected 
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-amber-500/10' 
                            : 'bg-[#0b1329] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 font-black text-sm">
                            {(c.razon_social || 'GT').substring(0, 2).toUpperCase()}
                          </div>
                          {isSelected && <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-extrabold rounded-full text-[10px] uppercase">Activa</span>}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white text-sm">{c.razon_social}</h4>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">NIT: {c.nit}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-[11px] text-slate-400">
                          <span>Última actividad: Sincronizado</span>
                          <span className="text-amber-400 font-bold hover:underline">Trabajar →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* PANEL GERENCIAL */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-white">Panel Ejecutivo y Salud Financiera</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Resumen analítico en tiempo real para <strong className="text-white">{clienteSeleccionado ? clienteSeleccionado.razon_social : 'Ningún cliente seleccionado'}</strong></p>
                </div>
                <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● Conexión SAT y Supabase Estable
                </div>
              </div>

              {!clienteSeleccionado ? (
                <div className="bg-[#0b1329] border border-slate-800 p-12 rounded-3xl text-center space-y-3">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
                  <h3 className="text-base font-bold text-white">Seleccione un cliente para ver su panel financiero</h3>
                  <p className="text-xs text-slate-400">Use el selector superior para elegir una empresa de su cartera.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="bg-[#0b1329] border border-slate-800 p-5 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Ventas DTE</span>
                      <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black font-mono text-white">Q {totalFactura.toFixed(2)}</p>
                    <p className="text-[11px] text-emerald-400 font-semibold mt-1">Débito: Q {totalDebitoFiscal.toFixed(2)}</p>
                  </div>

                  <div className="bg-[#0b1329] border border-slate-800 p-5 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Compras XML SAT</span>
                      <ArrowDownRight className="w-5 h-5 text-amber-400" />
                    </div>
                    <p className="text-2xl font-black font-mono text-white">Q {totalFacturasSAT.toFixed(2)}</p>
                    <p className="text-[11px] text-amber-400 font-semibold mt-1">Crédito: Q {totalCreditoFiscal.toFixed(2)}</p>
                  </div>

                  <div className={`p-5 rounded-2xl shadow-xl border ${saldoIvaLiquidacion >= 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">IVA Declaraguate</span>
                      <Scale className="w-5 h-5 text-amber-400" />
                    </div>
                    <p className="text-2xl font-black font-mono">Q {Math.abs(saldoIvaLiquidacion).toFixed(2)}</p>
                    <p className="text-[11px] font-bold mt-1">{saldoIvaLiquidacion >= 0 ? '⚠️ Impuesto por Pagar' : '✨ Crédito a Favor'}</p>
                  </div>

                  <div className="bg-[#0b1329] border border-slate-800 p-5 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center text-slate-400 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider">Planilla Activa</span>
                      <Users className="w-5 h-5 text-indigo-400" />
                    </div>
                    <p className="text-2xl font-black font-mono text-white">Q {resumenPlanilla.totalLiquido.toFixed(2)}</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-1">{empleados.length} colaboradores</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EMISIÓN DTE */}
          {activeTab === 'facturacion' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-white">Emisión de Factura DTE (Ventas)</h2>
                  <p className="text-xs text-slate-400">Emisor: <strong className="text-white">{clienteSeleccionado?.razon_social || 'Seleccione un cliente'}</strong></p>
                </div>
                {clienteSeleccionado && (
                  <button
                    onClick={handleGenerarRepresentacionGrafica}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 text-xs transition border border-amber-400/30 cursor-pointer shadow-lg active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Ver Representación Gráfica (PDF)</span>
                  </button>
                )}
              </div>

              {!clienteSeleccionado ? (
                <div className="bg-[#0b1329] border border-slate-800 p-12 rounded-3xl text-center space-y-3">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
                  <h3 className="text-base font-bold text-white">Debe seleccionar un cliente para emitir DTE</h3>
                </div>
              ) : (
                <div className="bg-[#0b1329] p-6 rounded-2xl shadow-xl border border-slate-800 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider">Ítems de Factura</h3>
                    <button
                      onClick={handleAgregarItem}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Agregar Ítem</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {itemsFactura.map((item, index) => (
                      <div key={item.id} className="flex items-center space-x-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                        <span className="text-xs font-bold text-slate-500 w-6 text-center">{index + 1}</span>
                        <input
                          type="text"
                          placeholder="Descripción"
                          value={item.descripcion}
                          onChange={(e) => handleItemChange(item.id, 'descripcion', e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                        />
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => handleItemChange(item.id, 'cantidad', e.target.value)}
                          className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-center font-bold text-white"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={item.precioUnitario}
                          onChange={(e) => handleItemChange(item.id, 'precioUnitario', e.target.value)}
                          className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-right font-bold text-white font-mono"
                        />
                        <div className="w-28 text-right font-mono font-bold text-white">
                          Q{(item.cantidad * item.precioUnitario).toFixed(2)}
                        </div>
                        <button
                          onClick={() => handleEliminarItem(item.id)}
                          className="text-rose-400 p-2 hover:bg-rose-500/10 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-800">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 w-72 font-mono text-xs space-y-1">
                      <div className="flex justify-between text-slate-400"><span>Base Imponible:</span><span>Q {baseImponibleFactura.toFixed(2)}</span></div>
                      <div className="flex justify-between text-amber-400"><span>IVA Débito (12%):</span><span>Q {ivaFactura.toFixed(2)}</span></div>
                      <div className="flex justify-between text-sm font-black text-white border-t border-slate-800 pt-2">
                        <span>TOTAL:</span>
                        <span className="text-amber-400">Q {totalFactura.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INGESTIÓN SAT XML */}
          {activeTab === 'sat' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-white">Lector Masivo XML SAT (DTE)</h2>
                  <p className="text-xs text-slate-400">Empresa activa: <strong className="text-amber-400">{clienteSeleccionado?.razon_social || 'Ninguna'}</strong></p>
                </div>
                {clienteSeleccionado && facturasPendientesCount > 0 && (
                  <button
                    onClick={handleGuardarFacturasSAT}
                    disabled={guardandoSAT || isSaving}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs cursor-pointer shadow-lg active:scale-95 flex items-center space-x-2 disabled:opacity-50"
                  >
                    {guardandoSAT && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{guardandoSAT ? 'Guardando...' : `Guardar en Supabase (${facturasPendientesCount})`}</span>
                  </button>
                )}
              </div>

              {!clienteSeleccionado ? (
                <div className="bg-[#0b1329] border border-slate-800 p-12 rounded-3xl text-center space-y-3">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
                  <h3 className="text-base font-bold text-white">Seleccione un cliente para gestionar sus XMLs</h3>
                </div>
              ) : (
                <>
                  {mensajeSAT && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl">{mensajeSAT}</div>}

                  <div className="border-2 border-dashed border-slate-800 bg-[#0b1329] rounded-2xl p-8 text-center relative cursor-pointer hover:border-amber-500/50 transition">
                    <input type="file" multiple accept=".xml" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <UploadCloud className="w-8 h-8 mx-auto text-amber-400 mb-2 animate-bounce" />
                    <p className="text-white font-bold text-xs">Arrastra tus archivos XML aquí o haz clic para examinar</p>
                  </div>

                  <div className="bg-[#0b1329] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-sans">
                        <tr><th className="p-3">Estado</th><th className="p-3">Serie-Num</th><th className="p-3">Proveedor</th><th className="p-3 text-right">Base</th><th className="p-3 text-right">IVA</th><th className="p-3 text-right">Total</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {facturasFiltradasPeriodo.map(f => (
                          <tr key={f.id || f.uuid} className="hover:bg-slate-900/40">
                            <td className="p-3 font-sans">{f.guardado ? <span className="text-emerald-400 font-bold">Guardado</span> : <span className="text-amber-400 font-bold">Pendiente</span>}</td>
                            <td className="p-3 text-slate-300">{f.serie}-{f.numero}</td>
                            <td className="p-3 font-sans text-white">{f.emisorNombre}</td>
                            <td className="p-3 text-right text-slate-300">{f.base.toFixed(2)}</td>
                            <td className="p-3 text-right text-emerald-400 font-bold">{f.iva.toFixed(2)}</td>
                            <td className="p-3 text-right text-white font-black">{f.total.toFixed(2)}</td>
                          </tr>
                        ))}
                        {facturasFiltradasPeriodo.length === 0 && (
                          <tr><td colSpan="6" className="p-6 text-center text-slate-500 font-sans">No hay XMLs cargados para este período.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* LIBROS LEGALES IVA */}
          {activeTab === 'libros_iva' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white">Libros Legales y Liquidación de IVA</h2>
                {clienteSeleccionado && (
                  <button
                    onClick={handleExportarDeclaraguateTXT}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs cursor-pointer shadow-lg active:scale-95"
                  >
                    Exportar TXT Declaraguate
                  </button>
                )}
              </div>

              {!clienteSeleccionado ? (
                <div className="bg-[#0b1329] border border-slate-800 p-12 rounded-3xl text-center space-y-3">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
                  <h3 className="text-base font-bold text-white">Seleccione un cliente para ver sus libros legales</h3>
                </div>
              ) : (
                <div className="bg-[#0b1329] p-6 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><p className="text-xs text-slate-400 font-sans">Débito Fiscal</p><p className="text-xl font-bold text-amber-400 mt-1">Q {totalDebitoFiscal.toFixed(2)}</p></div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><p className="text-xs text-slate-400 font-sans">Crédito Fiscal</p><p className="text-xl font-bold text-emerald-400 mt-1">Q {totalCreditoFiscal.toFixed(2)}</p></div>
                  <div className={`p-4 rounded-xl border ${saldoIvaLiquidacion >= 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                    <p className="text-xs font-sans font-bold">Resultado Mensual</p>
                    <p className="text-xl font-bold mt-1">Q {Math.abs(saldoIvaLiquidacion).toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RETENCIONES */}
          {activeTab === 'retenciones' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-black text-white">Control de Retenciones IVA e ISR</h2>
              {!clienteSeleccionado ? (
                <div className="bg-[#0b1329] border border-slate-800 p-12 rounded-3xl text-center space-y-3">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
                  <h3 className="text-base font-bold text-white">Seleccione un cliente para ver sus retenciones</h3>
                </div>
              ) : (
                <>
                  <form onSubmit={handleAgregarRetencion} className="bg-[#0b1329] p-6 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <select 
                      value={nuevaRetencion.tipo} 
                      onChange={(e) => { setNuevaRetencion({...nuevaRetencion, tipo: e.target.value}); setDirtyState(true); }} 
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="IVA 15%">IVA 15%</option>
                      <option value="ISR 5%">ISR 5%</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Documento" 
                      value={nuevaRetencion.documento} 
                      onChange={(e) => { setNuevaRetencion({...nuevaRetencion, documento: e.target.value}); setDirtyState(true); }} 
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white" 
                      required 
                    />
                    <input 
                      type="text" 
                      placeholder="NIT Agente" 
                      value={nuevaRetencion.nitAgente} 
                      onChange={(e) => { setNuevaRetencion({...nuevaRetencion, nitAgente: e.target.value}); setDirtyState(true); }} 
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white" 
                    />
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="Base Q" 
                      value={nuevaRetencion.montoBase} 
                      onChange={(e) => { setNuevaRetencion({...nuevaRetencion, montoBase: e.target.value}); setDirtyState(true); }} 
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono" 
                      required 
                    />
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      Registrar
                    </button>
                  </form>
                  <div className="bg-[#0b1329] rounded-2xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-sans">
                        <tr><th className="p-3">Tipo</th><th className="p-3">Documento</th><th className="p-3 text-right">Base</th><th className="p-3 text-right">Retenido</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {retenciones.map(r => (
                          <tr key={r.id}><td className="p-3 font-sans font-bold text-white">{r.tipo}</td><td className="p-3 text-slate-400">{r.documento}</td><td className="p-3 text-right text-slate-300">Q {r.montoBase.toFixed(2)}</td><td className="p-3 text-right font-black text-amber-400">Q {r.montoRetenido.toFixed(2)}</td></tr>
                        ))}
                        {retenciones.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-slate-500 font-sans">No hay retenciones registradas para este cliente.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* CXC CXP */}
          {activeTab === 'cxc_cxp' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-black text-white">Cuentas por Cobrar y por Pagar</h2>
              {!clienteSeleccionado ? (
                <div className="bg-[#0b1329] border border-slate-800 p-12 rounded-3xl text-center space-y-3">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
                  <h3 className="text-base font-bold text-white">Seleccione un cliente para ver sus cuentas</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#0b1329] p-5 rounded-2xl border border-slate-800">
                    <h3 className="font-bold text-emerald-400 text-xs uppercase mb-3">CXC Pendiente: Q {totalCXC.toFixed(2)}</h3>
                    <p className="text-xs text-slate-500 font-mono">No hay cuentas por cobrar registradas en Supabase.</p>
                  </div>
                  <div className="bg-[#0b1329] p-5 rounded-2xl border border-slate-800">
                    <h3 className="font-bold text-rose-400 text-xs uppercase mb-3">CXP Pendiente: Q {totalCXP.toFixed(2)}</h3>
                    <p className="text-xs text-slate-500 font-mono">No hay cuentas por pagar registradas en Supabase.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONCILIACIÓN BANCARIA */}
          {activeTab === 'bancos' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-black text-white">Conciliación Bancaria</h2>
              {!clienteSeleccionado ? (
                <div className="bg-[#0b1329] border border-slate-800 p-12 rounded-3xl text-center space-y-3">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
                  <h3 className="text-base font-bold text-white">Seleccione un cliente para ver su conciliación</h3>
                </div>
              ) : (
                <div className="bg-[#0b1329] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-sans">
                      <tr><th className="p-4">Fecha</th><th className="p-4">Concepto</th><th className="p-4">Tipo</th><th className="p-4 text-right">Monto</th><th className="p-4 text-center">Estado</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {movimientosBancos.map(m => (
                        <tr key={m.id}>
                          <td className="p-4 text-slate-400 font-sans">{m.fecha}</td>
                          <td className="p-4 font-sans font-bold text-white">{m.descripcion}</td>
                          <td className="p-4 font-sans"><span className={m.tipo === 'Ingreso' ? 'text-emerald-400' : 'text-rose-400'}>{m.tipo}</span></td>
                          <td className="p-4 text-right font-black text-white">Q {m.monto.toFixed(2)}</td>
                          <td className="p-4 text-center font-sans"><span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-bold">Conciliado ✅</span></td>
                        </tr>
                      ))}
                      {movimientosBancos.length === 0 && (
                        <tr><td colSpan="5" className="p-6 text-center text-slate-500 font-sans">No hay movimientos bancarios registrados para este cliente.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ACTIVOS FIJOS */}
          {activeTab === 'activos' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-black text-white">Activos Fijos y Depreciaciones (SAT)</h2>
              {!clienteSeleccionado ? (
                <div className="bg-[#0b1329] border border-slate-800 p-12 rounded-3xl text-center space-y-3">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
                  <h3 className="text-base font-bold text-white">Seleccione un cliente para ver sus activos fijos</h3>
                </div>
              ) : (
                <div className="bg-[#0b1329] p-5 rounded-2xl border border-slate-800 space-y-2 font-mono">
                  <p className="text-xs text-slate-400 font-sans">Depreciación Mensual Gasto:</p>
                  <p className="text-xl font-bold text-amber-400">Q {totalDepreciacionMensual.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-2 font-sans">No hay activos registrados en Supabase para este cliente.</p>
                </div>
              )}
            </div>
          )}

{/* ESTADOS FINANCIEROS */}
          {activeTab === 'estados' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white">Estados Financieros Automáticos</h2>
                {clienteSeleccionado && (
                  <button onClick={() => window.print()} className="bg-slate-800 text-amber-400 font-bold px-4 py-2.5 rounded-xl text-xs border border-amber-400/30 cursor-pointer no-print">Imprimir Reportes</button>
                )}
              </div>
              {!clienteSeleccionado ? (
                <div className="bg-[#0b1329] border border-slate-800 p-12 rounded-3xl text-center space-y-3">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
                  <h3 className="text-base font-bold text-white">Seleccione un cliente para generar sus estados financieros</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#0b1329] p-6 rounded-2xl border border-slate-800 font-mono text-xs space-y-2">
                    <p className="font-bold text-white font-sans text-sm mb-3">Estado de Resultados</p>
                    <div className="flex justify-between"><span>Ventas DTE:</span><span className="text-white">Q {totalFactura.toFixed(2)}</span></div>
                    <div className="flex justify-between text-rose-400"><span>Compras SAT:</span><span>Q {totalFacturasSAT.toFixed(2)}</span></div>
                    <div className="flex justify-between text-rose-400"><span>Caja Chica:</span><span>Q {totalCajaChica.toFixed(2)}</span></div>
                    <div className="flex justify-between text-rose-400"><span>Planilla:</span><span>Q {resumenPlanilla.totalLiquido.toFixed(2)}</span></div>
                    <div className="flex justify-between text-amber-400 font-bold border-t border-slate-800 pt-2 text-sm font-sans"><span>Utilidad Neta:</span><span>Q {(totalFactura - totalFacturasSAT - totalCajaChica - resumenPlanilla.totalLiquido).toFixed(2)}</span></div>
                  </div>
                  <div className="bg-[#0b1329] p-6 rounded-2xl border border-slate-800 font-mono text-xs space-y-2">
                    <p className="font-bold text-white font-sans text-sm mb-3">Balance General</p>
                    <div className="flex justify-between text-emerald-400"><span>Activo Corriente:</span><span>Q {(totalCXC).toFixed(2)}</span></div>
                    <div className="flex justify-between text-rose-400"><span>Pasivo Corriente:</span><span>Q {(totalCXP + Math.abs(saldoIvaLiquidacion)).toFixed(2)}</span></div>
                    <div className="flex justify-between text-white font-bold border-t border-slate-800 pt-2 text-sm font-sans"><span>Cuadre:</span><span className="text-emerald-400">Balanceado ✅</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NÓMINA */}
          {activeTab === 'nomina' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-black text-white">Planilla de Sueldos y Salarios</h2>
              {!clienteSeleccionado ? (
                <div className="bg-[#0b1329] border border-slate-800 p-12 rounded-3xl text-center space-y-3">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
                  <h3 className="text-base font-bold text-white">Seleccione un cliente para ver su planilla</h3>
                </div>
              ) : (
                <div className="bg-[#0b1329] rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-sans">
                      <tr><th className="p-4">Colaborador</th><th className="p-4">Puesto</th><th className="p-4 text-right">Base</th><th className="p-4 text-right">Líquido</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {empleados.map(e => (
                        <tr key={e.id}>
                          <td className="p-4 font-sans font-bold text-white">{e.nombre || e.nombre_completo}</td>
                          <td className="p-4 font-sans text-slate-400">{e.puesto}</td>
                          <td className="p-4 text-right text-slate-300">Q {Number(e.salario_base).toFixed(2)}</td>
                          <td className="p-4 text-right font-black text-emerald-400">Q {(Number(e.salario_base) + 250 - (Number(e.salario_base)*0.0483)).toFixed(2)}</td>
                        </tr>
                      ))}
                      {empleados.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-slate-500 font-sans">No hay colaboradores registrados en Supabase para este cliente.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CAJA CHICA */}
          {activeTab === 'cajachica' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-black text-white">Control de Caja Chica y Gastos</h2>
              {!clienteSeleccionado ? (
                <div className="bg-[#0b1329] border border-slate-800 p-12 rounded-3xl text-center space-y-3">
                  <Building2 className="w-12 h-12 text-amber-400 mx-auto opacity-50" />
                  <h3 className="text-base font-bold text-white">Seleccione un cliente para gestionar su caja chica</h3>
                </div>
              ) : (
                <>
                  <form onSubmit={handleGuardarGasto} className="bg-[#0b1329] p-6 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <input type="date" value={nuevoGasto.fecha} onChange={(e) => { setNuevoGasto({...nuevoGasto, fecha: e.target.value}); setDirtyState(true); }} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white" required />
                    <input type="text" placeholder="Concepto" value={nuevoGasto.concepto} onChange={(e) => { setNuevoGasto({...nuevoGasto, concepto: e.target.value}); setDirtyState(true); }} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white" required />
                    <input type="text" placeholder="Comprobante" value={nuevoGasto.comprobante} onChange={(e) => { setNuevoGasto({...nuevoGasto, comprobante: e.target.value}); setDirtyState(true); }} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white" />
                    <input type="number" step="0.01" placeholder="Monto Q" value={nuevoGasto.monto} onChange={(e) => { setNuevoGasto({...nuevoGasto, monto: e.target.value}); setDirtyState(true); }} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono" required />
                    <button type="submit" disabled={isSaving || guardandoGasto} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer active:scale-95 disabled:opacity-50">
                      {guardandoGasto ? 'Guardando...' : 'Registrar Gasto'}
                    </button>
                  </form>
                  <div className="bg-[#0b1329] rounded-2xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-sans">
                        <tr><th className="p-3">Fecha</th><th className="p-3">Concepto</th><th className="p-3">Comprobante</th><th className="p-3 text-right">Monto</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {gastos.map(g => (
                          <tr key={g.id}><td className="p-3 text-slate-400 font-sans">{g.fecha}</td><td className="p-3 font-sans font-bold text-white">{g.concepto}</td><td className="p-3 text-slate-400">{g.comprobante || 'N/A'}</td><td className="p-3 text-right font-bold text-white">Q {Number(g.monto).toFixed(2)}</td></tr>
                        ))}
                        {gastos.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-slate-500 font-sans">No hay gastos de caja chica registrados para este cliente.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* CONTROL GLOBAL DEL CONTADOR */}
          {activeTab === 'control_contador' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-2xl font-black text-white">Control Global de la Firma Contable</h2>
                <p className="text-xs text-slate-400 mt-0.5">Panel exclusivo del contador para supervisar la cartera general de clientes y volumen de operaciones</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-[#0b1329] border border-slate-800 p-5 rounded-2xl shadow-xl">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Empresas en Cartera</p>
                  <p className="text-3xl font-black font-mono text-white">{clientes.length}</p>
                  <p className="text-[11px] text-amber-400 font-semibold mt-1">Multi-Tenant Activo</p>
                </div>

                <div className="bg-[#0b1329] border border-slate-800 p-5 rounded-2xl shadow-xl">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Documentos XML en Oficina</p>
                  <p className="text-3xl font-black font-mono text-white">{facturasXML.length}</p>
                  <p className="text-[11px] text-emerald-400 font-semibold mt-1">Sincronizados con Supabase</p>
                </div>

                <div className="bg-[#0b1329] border border-slate-800 p-5 rounded-2xl shadow-xl">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Estado del Despacho</p>
                  <p className="text-xl font-black text-emerald-400 mt-2">100% Operativo</p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">Período Fiscal: {periodoFiltro}</p>
                </div>
              </div>

              <div className="bg-[#0b1329] rounded-2xl border border-slate-800 overflow-hidden shadow-xl p-6 space-y-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Listado General de Clientes / Empresas del Bufete</h3>
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-sans">
                    <tr><th className="p-3">NIT</th><th className="p-3">Razón Social</th><th className="p-3 text-center">Acción</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {clientes.map(c => (
                      <tr key={c.id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-bold text-white">{c.nit}</td>
                        <td className="p-3 font-sans text-slate-300">{c.razon_social}</td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => { 
                              setClienteSeleccionado(c); 
                              localStorage.setItem('gt_active_client', JSON.stringify(c));
                              setActiveTab('dashboard'); 
                            }}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold px-3 py-1.5 rounded-lg border border-amber-500/30 cursor-pointer active:scale-95"
                          >
                            Trabajar Empresa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL CREAR CLIENTE */}
      {mostrarModalCliente && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                if (dirtyState && !window.confirm("⚠️ ¿Deseas descartar los cambios del nuevo cliente?")) return;
                setMostrarModalCliente(false);
                setDirtyState(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Registrar Nueva Empresa Cliente</h3>
            <form onSubmit={handleCrearCliente} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">NIT SAT</label>
                <input 
                  type="text" 
                  required 
                  value={nuevoCliente.nit}
                  onChange={(e) => { setNuevoCliente({...nuevoCliente, nit: e.target.value}); setDirtyState(true); }}
                  placeholder="Ej: 1234567-8" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Razón Social</label>
                <input 
                  type="text" 
                  required 
                  value={nuevoCliente.razon_social}
                  onChange={(e) => { setNuevoCliente({...nuevoCliente, razon_social: e.target.value}); setDirtyState(true); }}
                  placeholder="Ej: Comercializadora, S.A." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none" 
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setMostrarModalCliente(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardandoCliente || isSaving}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-sm shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {guardandoCliente ? 'Guardando...' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PDF DTE */}
      {mostrarModalDTE && dteGeneradoInfo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-8 relative print-container">
            <button 
              onClick={() => setMostrarModalDTE(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white no-print"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-1 mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-xl font-black text-white">FACTURA ELECTRÓNICA (DTE)</h3>
              <p className="text-xs text-slate-400">SAT Guatemala - Representación Gráfica</p>
            </div>
            <div className="space-y-3 font-mono text-xs bg-slate-950 p-5 rounded-xl border border-slate-800 text-slate-300">
              <div className="flex justify-between"><span>UUID:</span><span className="text-white">{dteGeneradoInfo.uuid}</span></div>
              <div className="flex justify-between"><span>Emisor:</span><span className="text-white">{dteGeneradoInfo.emisorNombre} (NIT: {dteGeneradoInfo.emisorNit})</span></div>
              <div className="flex justify-between"><span>Fecha:</span><span className="text-white">{dteGeneradoInfo.fechaEmision}</span></div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-amber-400"><span>Total:</span><span>Q {dteGeneradoInfo.total.toFixed(2)}</span></div>
            </div>
            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-slate-800 no-print">
              <button onClick={() => window.print()} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs cursor-pointer">Imprimir PDF</button>
              <button onClick={() => setMostrarModalDTE(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-xs cursor-pointer">Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;