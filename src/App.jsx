import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabaseClient';
import { 
  FileText, Users, Wallet, RefreshCw, PlusCircle, BookOpen, 
  ChevronDown, ChevronUp, UploadCloud, CheckCircle2, FileCode, Save, Building2, UserPlus, X,
  CreditCard, Plus, Trash2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('sat');
  
  // Estado para Clientes / Empresas (Multi-tenant)
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nit: '', razon_social: '', nombre_comercial: '' });
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  // Estados del sistema contable
  const [empleados, setEmpleados] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarAsiento, setMostrarAsiento] = useState(false);

  // Estado para Caja Chica
  const [nuevoGasto, setNuevoGasto] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    comprobante: '',
    responsable: '',
    monto: ''
  });
  const [guardandoGasto, setGuardandoGasto] = useState(false);

  // Estado para Módulo SAT (DTE XML)
  const [facturasXML, setFacturasXML] = useState([]);
  const [procesandoXML, setProcesandoXML] = useState(false);
  const [guardandoSAT, setGuardandoSAT] = useState(false);
  const [mensajeSAT, setMensajeSAT] = useState('');

  // Ítems dinámicos y cálculo automático de IVA 12% (SAT Guatemala)
  const [itemsFactura, setItemsFactura] = useState([
    { id: 1, descripcion: 'Servicios Contables y Fiscales', cantidad: 1, precioUnitario: 1000 }
  ]);

  const handleAgregarItem = () => {
    setItemsFactura([
      ...itemsFactura,
      { id: Date.now(), descripcion: '', cantidad: 1, precioUnitario: 0 }
    ]);
  };

  const handleEliminarItem = (id) => {
    if (itemsFactura.length === 1) return; // Mantiene al menos 1 ítem activo
    setItemsFactura(itemsFactura.filter(item => item.id !== id));
  };

  const handleItemChange = (id, campo, valor) => {
    setItemsFactura(itemsFactura.map(item => {
      if (item.id === id) {
        return { 
          ...item, 
          [campo]: campo === 'descripcion' ? valor : (valor === '' ? 0 : parseFloat(valor) || 0) 
        };
      }
      return item;
    }));
  };

  // Cálculos automáticos de la SAT (IVA 12%)
  const totalFactura = itemsFactura.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
  const baseImponibleFactura = totalFactura / 1.12;
  const ivaFactura = totalFactura - baseImponibleFactura;
  
  // 1. Cargar Clientes al iniciar
  useEffect(() => {
    fetchClientes();
  }, []);

  // 2. Cargar datos del cliente seleccionado cuando cambia el selector
  useEffect(() => {
    if (clienteSeleccionado) {
      fetchDataCliente(clienteSeleccionado.id);
    }
  }, [clienteSeleccionado]);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clientes').select('*').order('razon_social', { ascending: true });
    if (!error && data && data.length > 0) {
      setClientes(data);
      setClienteSeleccionado(data[0]);
    } else {
      setLoading(false);
    }
  };

  const fetchDataCliente = async (clienteId) => {
    setLoading(true);
    
    // Cargar Empleados del cliente
    const { data: empData } = await supabase.from('empleados').select('*');
    if (empData) setEmpleados(empData);

    // Cargar Gastos de Caja Chica
    const { data: cajaData } = await supabase.from('caja_chica').select('*');
    if (cajaData) setGastos(cajaData);

    // Cargar Facturas SAT filtradas por cliente_id
    const { data: satData } = await supabase
      .from('facturas_sat')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });

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

    setLoading(false);
  };

  // Crear nuevo cliente en Supabase
  const handleCrearCliente = async (e) => {
    e.preventDefault();
    if (!nuevoCliente.nit || !nuevoCliente.razon_social) return;

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
    } else {
      alert("Error al guardar cliente. Verifica que el NIT no esté duplicado.");
    }
    setGuardandoCliente(false);
  };

  // Guardar gasto de caja chica
  const handleGuardarGasto = async (e) => {
    e.preventDefault();
    if (!nuevoGasto.concepto || !nuevoGasto.monto) return;

    setGuardandoGasto(true);
    const { data, error } = await supabase.from('caja_chica').insert([
      {
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
        fecha: new Date().toISOString().split('T')[0],
        concepto: '',
        comprobante: '',
        responsable: '',
        monto: ''
      });
    }
    setGuardandoGasto(false);
  };

  // PARSER ROBUSTO DE ARCHIVOS XML DE LA SAT (FEL)
  const handleFileUpload = async (event) => {
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

        const uuid = getElementValue('NumeroAutorizacion') || getElementValue('Autorizacion') || 'N/A';
        
        const serie = (numAutEl ? numAutEl.getAttribute('Serie') : '') || 
                      (datosEmisionEl ? datosEmisionEl.getAttribute('Serie') : '') || 
                      getAttr('DTE', 'Serie') || 'N/A';

        const numero = (numAutEl ? numAutEl.getAttribute('Numero') : '') || 
                       (datosEmisionEl ? datosEmisionEl.getAttribute('Numero') : '') || 
                       getAttr('DTE', 'Numero') || 'N/A';

        const fechaHora = getAttr('DatosEmision', 'FechaHoraEmision') || getAttr('DTE', 'FechaHoraEmision') || new Date().toISOString();
        const fecha = fechaHora.split('T')[0];

        const emisorNit = getAttr('Emisor', 'NITEmisor') || getAttr('Emisor', 'NIT') || 'N/A';
        const emisorNombre = getAttr('Emisor', 'NombreEmisor') || getAttr('Emisor', 'Nombre') || 'Proveedor Desconocido';

        const totalStr = getElementValue('MontoTotal') || getElementValue('GranTotal') || '0';
        const total = parseFloat(totalStr) || 0;
        
        const base = Math.round((total / 1.12) * 100) / 100;
        const iva = Math.round((total - base) * 100) / 100;

        nuevasFacturas.push({
          id: Math.random().toString(36).substr(2, 9),
          uuid,
          serie,
          numero,
          fecha,
          emisorNit,
          emisorNombre,
          base,
          iva,
          total,
          guardado: false
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

  // Guardar facturas asignadas al cliente seleccionado en Supabase
  const handleGuardarFacturasSAT = async () => {
    if (!clienteSeleccionado) {
      alert("Debes seleccionar o crear un cliente antes de guardar.");
      return;
    }

    const pendientes = facturasXML.filter(f => !f.guardado);
    if (!pendientes.length) return;

    setGuardandoSAT(true);
    setMensajeSAT('');

    const registros = pendientes.map(f => ({
      cliente_id: clienteSeleccionado.id,
      uuid: f.uuid,
      serie: f.serie,
      numero: f.numero,
      fecha: f.fecha,
      emisor_nit: f.emisorNit,
      emisor_nombre: f.emisorNombre,
      base: f.base,
      iva: f.iva,
      total: f.total
    }));

    const { error } = await supabase.from('facturas_sat').upsert(registros, { onConflict: 'uuid' });

    if (!error) {
      setMensajeSAT(`¡Facturas guardadas con éxito para ${clienteSeleccionado.razon_social}!`);
      setFacturasXML(prev => prev.map(f => ({ ...f, guardado: true })));
    } else {
      console.error("Error al guardar en Supabase:", error);
      setMensajeSAT('Error al guardar. Revisa la consola o los permisos de Supabase.');
    }

    setGuardandoSAT(false);
  };

  // Cálculos de Nómina
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

  const totalDebe = resumenPlanilla.totalSueldos + resumenPlanilla.totalBonificacion + resumenPlanilla.totalCuotaPatronal;
  const totalHaber = resumenPlanilla.totalIgssLaboral + resumenPlanilla.totalCuotaPatronal + resumenPlanilla.totalLiquido;

  // Totales
  const totalCajaChica = gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  const totalFacturasSAT = facturasXML.reduce((acc, f) => acc + f.total, 0);
  const totalIvaSAT = facturasXML.reduce((acc, f) => acc + f.iva, 0);
  const facturasPendientesCount = facturasXML.filter(f => !f.guardado).length;

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* Barra Lateral */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-xl font-bold text-amber-400">GT Contable AI</h1>
          <p className="text-xs text-slate-400 mt-1">Guatemala • Quetzales (GTQ)</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('facturacion')}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition ${
              activeTab === 'facturacion' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span>Emisión DTE / Ventas</span>
          </button>
          <button
            onClick={() => setActiveTab('nomina')}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition ${
              activeTab === 'nomina' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Nómina y Planillas</span>
          </button>
          <button
            onClick={() => setActiveTab('cajachica')}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition ${
              activeTab === 'cajachica' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span>Caja Chica y Gastos</span>
          </button>
          <button
            onClick={() => setActiveTab('sat')}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition ${
              activeTab === 'sat' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Ingestión SAT (XML)</span>
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => clienteSeleccionado && fetchDataCliente(clienteSeleccionado.id)}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sincronizar Supabase</span>
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* BARRA SUPERIOR (TOPBAR): SELECTOR GLOBAL DE CLIENTE */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-4">
            <Building2 className="w-6 h-6 text-amber-500" />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Cliente / Empresa Activa</p>
              <select
                value={clienteSeleccionado?.id || ''}
                onChange={(e) => {
                  const sel = clientes.find(c => c.id === e.target.value);
                  setClienteSeleccionado(sel);
                }}
                className="bg-slate-50 border border-slate-300 font-bold text-slate-800 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.razon_social} (NIT: {c.nit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => setMostrarModalCliente(true)}
            className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 text-xs transition shadow-md"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Agregar Cliente</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          
          {/* MÓDULO: EMISIÓN DTE / FACTURACIÓN (SAT GUATEMALA) */}
          {activeTab === 'facturacion' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Emisión de Factura DTE (Ventas)</h2>
                  <p className="text-sm text-slate-500">
                    Emisor: <strong className="text-slate-800">{clienteSeleccionado?.razon_social}</strong> (NIT: {clienteSeleccionado?.nit})
                  </p>
                </div>
                <div className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-300">
                  ● Conexión Certificador SAT: Activa
                </div>
              </div>

              {/* Formulario / Lista Dinámica de Ítems */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h3 className="font-bold text-slate-800 text-base">Detalle de Productos / Servicios</h3>
                  <button
                    onClick={handleAgregarItem}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Agregar Ítem</span>
                  </button>
                </div>

                {/* Tabla de Ítems */}
                <div className="space-y-3">
                  {itemsFactura.map((item, index) => (
                    <div key={item.id} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <span className="text-xs font-bold text-slate-400 w-6 text-center">{index + 1}</span>
                      <input
                        type="text"
                        placeholder="Descripción del producto o servicio"
                        value={item.descripcion}
                        onChange={(e) => handleItemChange(item.id, 'descripcion', e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="w-24">
                        <label className="text-[10px] text-slate-400 font-semibold uppercase block">Cant.</label>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleItemChange(item.id, 'cantidad', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm text-center font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="w-32">
                        <label className="text-[10px] text-slate-400 font-semibold uppercase block">Precio Unit. (Q)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precioUnitario}
                          onChange={(e) => handleItemChange(item.id, 'precioUnitario', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm text-right font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="w-32 text-right">
                        <label className="text-[10px] text-slate-400 font-semibold uppercase block">Subtotal (Q)</label>
                        <span className="text-sm font-bold text-slate-800">
                          Q{(item.cantidad * item.precioUnitario).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleEliminarItem(item.id)}
                        disabled={itemsFactura.length === 1}
                        className={`p-2 rounded-lg transition ${
                          itemsFactura.length === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Resumen de Totales e IVA 12% SAT */}
                <div className="border-t border-slate-100 pt-4 flex justify-end">
                  <div className="w-72 space-y-2 bg-slate-900 text-white p-4 rounded-xl shadow-md">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Base Imponible (Neto):</span>
                      <span className="font-semibold">Q{baseImponibleFactura.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-amber-400 font-medium">
                      <span>IVA Débito Fiscal (12%):</span>
                      <span className="font-semibold">Q{ivaFactura.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-slate-700 pt-2 flex justify-between text-base font-bold text-white">
                      <span>Total DTE:</span>
                      <span className="text-amber-400">Q{totalFactura.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 1: NÓMINA GUATEMALA */}
          {activeTab === 'nomina' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Planilla de Sueldos y Salarios</h2>
                  <p className="text-sm text-slate-500">
                    Empresa: <strong className="text-slate-800">{clienteSeleccionado?.razon_social}</strong> (NIT: {clienteSeleccionado?.nit})
                  </p>
                </div>
                <button
                  onClick={() => setMostrarAsiento(!mostrarAsiento)}
                  className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-400/30 font-semibold px-4 py-2.5 rounded-lg flex items-center space-x-2 text-sm shadow-sm transition"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{mostrarAsiento ? 'Ocultar Asiento Contable' : 'Generar Asiento (Libro Diario)'}</span>
                  {mostrarAsiento ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* ASIENTO CONTABLE */}
              {mostrarAsiento && (
                <div className="bg-slate-900 text-white rounded-xl shadow-lg p-6 border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-amber-400 text-base">Partida N° X — Libro Diario (Sueldos del Mes)</h3>
                      <p className="text-xs text-slate-400">Registro de sueldos, bonificaciones y cargas patronales</p>
                    </div>
                    <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/20">
                      Cuadrado / Balanceado
                    </span>
                  </div>

                  <table className="w-full text-sm font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-left text-xs uppercase">
                        <th className="py-2">Código / Cuentas Contables</th>
                        <th className="py-2 text-right">Debe (Q)</th>
                        <th className="py-2 text-right">Haber (Q)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300">
                      <tr>
                        <td className="py-2.5">Sueldos y Salarios (Gasto)</td>
                        <td className="py-2.5 text-right font-bold text-slate-100">{resumenPlanilla.totalSueldos.toFixed(2)}</td>
                        <td className="py-2.5 text-right text-slate-600">—</td>
                      </tr>
                      <tr>
                        <td className="py-2.5">Bonificación Incentivo Decreto 37-2001 (Gasto)</td>
                        <td className="py-2.5 text-right font-bold text-slate-100">{resumenPlanilla.totalBonificacion.toFixed(2)}</td>
                        <td className="py-2.5 text-right text-slate-600">—</td>
                      </tr>
                      <tr>
                        <td className="py-2.5">Cuotas Patronales IGSS / IRTRA / INTECAP (12.67%)</td>
                        <td className="py-2.5 text-right font-bold text-slate-100">{resumenPlanilla.totalCuotaPatronal.toFixed(2)}</td>
                        <td className="py-2.5 text-right text-slate-600">—</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pl-6 text-slate-400">a Retenciones IGSS Laboral por Pagar (4.83%)</td>
                        <td className="py-2.5 text-right text-slate-600">—</td>
                        <td className="py-2.5 text-right text-emerald-400">{resumenPlanilla.totalIgssLaboral.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pl-6 text-slate-400">a Cuotas Patronales por Pagar (12.67%)</td>
                        <td className="py-2.5 text-right text-slate-600">—</td>
                        <td className="py-2.5 text-right text-emerald-400">{resumenPlanilla.totalCuotaPatronal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pl-6 text-slate-400">a Bancos / Sueldos por Pagar (Líquido)</td>
                        <td className="py-2.5 text-right text-slate-600">—</td>
                        <td className="py-2.5 text-right text-emerald-400">{resumenPlanilla.totalLiquido.toFixed(2)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-700 font-bold text-amber-400 text-sm">
                        <td className="py-3 uppercase font-sans">Sumas Iguales</td>
                        <td className="py-3 text-right">Q {totalDebe.toFixed(2)}</td>
                        <td className="py-3 text-right">Q {totalHaber.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* TABLA DE PLANILLA */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-4">Empleado / DPI</th>
                      <th className="p-4">Puesto</th>
                      <th className="p-4">Salario Base</th>
                      <th className="p-4">Bonif. Ley (Q250)</th>
                      <th className="p-4">IGSS Laboral (4.83%)</th>
                      <th className="p-4">Líquido a Recibir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {empleados.map((emp) => {
                      const { sueldoBase, bonifLey, igssLaboral, liquido } = calcularNomina(emp);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="p-4">
                            <div className="font-semibold text-slate-900">{emp.nombre || emp.nombre_completo}</div>
                            {emp.dpi && <div className="text-xs text-slate-400">DPI: {emp.dpi}</div>}
                          </td>
                          <td className="p-4 text-slate-600">{emp.puesto}</td>
                          <td className="p-4 font-mono">Q {sueldoBase.toFixed(2)}</td>
                          <td className="p-4 font-mono text-emerald-600">+ Q {bonifLey.toFixed(2)}</td>
                          <td className="p-4 font-mono text-rose-600">- Q {igssLaboral.toFixed(2)}</td>
                          <td className="p-4 font-mono font-bold text-slate-900">Q {liquido.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {empleados.length === 0 && !loading && (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-slate-400">No hay empleados registrados para este cliente.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MÓDULO 2: CAJA CHICA */}
          {activeTab === 'cajachica' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Control de Caja Chica</h2>
                  <p className="text-sm text-slate-500">
                    Cliente: <strong className="text-slate-800">{clienteSeleccionado?.razon_social}</strong>
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-right">
                  <p className="text-xs text-amber-800 font-medium">Total Gastos Registrados</p>
                  <p className="text-xl font-bold font-mono text-amber-950">Q {totalCajaChica.toFixed(2)}</p>
                </div>
              </div>

              {/* Formulario */}
              <form onSubmit={handleGuardarGasto} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={nuevoGasto.fecha}
                    onChange={(e) => setNuevoGasto({ ...nuevoGasto, fecha: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Concepto / Descripción</label>
                  <input
                    type="text"
                    placeholder="Ej. Suministros de oficina"
                    value={nuevoGasto.concepto}
                    onChange={(e) => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Comprobante</label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-1029"
                    value={nuevoGasto.comprobante}
                    onChange={(e) => setNuevoGasto({ ...nuevoGasto, comprobante: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Responsable</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={nuevoGasto.responsable}
                    onChange={(e) => setNuevoGasto({ ...nuevoGasto, responsable: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Monto (Q)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={nuevoGasto.monto}
                      onChange={(e) => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={guardandoGasto}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 rounded-lg flex items-center justify-center transition disabled:opacity-50"
                    >
                      <PlusCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </form>

              {/* Tabla */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Concepto</th>
                      <th className="p-4">Comprobante</th>
                      <th className="p-4">Responsable</th>
                      <th className="p-4">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gastos.map((gasto) => (
                      <tr key={gasto.id} className="hover:bg-slate-50">
                        <td className="p-4 text-slate-500">{gasto.fecha}</td>
                        <td className="p-4 font-semibold text-slate-900">{gasto.concepto}</td>
                        <td className="p-4 text-slate-600">{gasto.comprobante || 'N/A'}</td>
                        <td className="p-4 text-slate-600">{gasto.responsable || 'N/A'}</td>
                        <td className="p-4 font-mono font-bold text-slate-900">Q {Number(gasto.monto).toFixed(2)}</td>
                      </tr>
                    ))}
                    {gastos.length === 0 && !loading && (
                      <tr>
                        <td colSpan="5" className="p-6 text-center text-slate-400">No hay registros de gastos.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MÓDULO 3: INGESTIÓN SAT (XML) */}
          {activeTab === 'sat' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Lector Masivo de XML de la SAT (DTE)</h2>
                  <p className="text-sm text-slate-500">
                    Asignado a: <strong className="text-slate-800">{clienteSeleccionado?.razon_social}</strong> (NIT: {clienteSeleccionado?.nit})
                  </p>
                </div>
                <div className="flex space-x-3 items-center">
                  <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-right shadow-sm">
                    <p className="text-xs text-slate-500 font-medium">Crédito Fiscal (IVA 12%)</p>
                    <p className="text-xl font-bold font-mono text-emerald-600">Q {totalIvaSAT.toFixed(2)}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-right">
                    <p className="text-xs text-amber-800 font-medium">Total Facturas</p>
                    <p className="text-xl font-bold font-mono text-amber-950">Q {totalFacturasSAT.toFixed(2)}</p>
                  </div>
                  {facturasPendientesCount > 0 && (
                    <button
                      onClick={handleGuardarFacturasSAT}
                      disabled={guardandoSAT}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3.5 rounded-xl flex items-center space-x-2 text-sm shadow-sm transition disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{guardandoSAT ? 'Guardando...' : `Guardar en Supabase (${facturasPendientesCount})`}</span>
                    </button>
                  )}
                </div>
              </div>

              {mensajeSAT && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{mensajeSAT}</span>
                </div>
              )}

              {/* Carga de Archivos */}
              <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 bg-white rounded-xl p-8 text-center transition cursor-pointer relative shadow-sm">
                <input
                  type="file"
                  multiple
                  accept=".xml"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 bg-amber-100 rounded-full text-amber-700">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-slate-700 font-semibold">Arrastra tus archivos XML aquí o haz clic para examinar</p>
                    <p className="text-xs text-slate-400 mt-1">Soporta múltiples archivos de Facturas Electrónicas DTE de la SAT</p>
                  </div>
                  {procesandoXML && (
                    <div className="flex items-center space-x-2 text-amber-600 text-xs font-semibold">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Procesando estructura XML de la SAT...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabla de Facturas */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-4">Estado</th>
                      <th className="p-4">Fecha / Serie-Número</th>
                      <th className="p-4">Emisor (Proveedor)</th>
                      <th className="p-4">NIT</th>
                      <th className="p-4 text-right">Base Imp. (Q)</th>
                      <th className="p-4 text-right">IVA 12% (Q)</th>
                      <th className="p-4 text-right">Total Factura (Q)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facturasXML.map((fac) => (
                      <tr key={fac.id || fac.uuid} className="hover:bg-slate-50">
                        <td className="p-4">
                          {fac.guardado ? (
                            <span className="inline-flex items-center text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Guardado
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-200">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-900">{fac.fecha}</div>
                          <div className="text-xs font-mono text-slate-500">{fac.serie} - {fac.numero}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-800">{fac.emisorNombre}</div>
                          <div className="text-xs text-slate-400 font-mono truncate max-w-xs" title={fac.uuid}>UUID: {fac.uuid}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-600">{fac.emisorNit}</td>
                        <td className="p-4 font-mono text-right text-slate-700">Q {fac.base.toFixed(2)}</td>
                        <td className="p-4 font-mono text-right text-emerald-600 font-semibold">+ Q {fac.iva.toFixed(2)}</td>
                        <td className="p-4 font-mono text-right font-bold text-slate-900">Q {fac.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    {facturasXML.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-400">
                          <FileCode className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          No hay facturas registradas para este cliente aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL FLOTANTE ULTRA-LIGERO (ESTILO DRIBBLE / SIN FONDO NEGRO) */}
      {mostrarModalCliente && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            // Fondo translúcido mínimo con desenfoque de cristal
            backgroundColor: 'rgba(15, 23, 42, 0.35)', 
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 999999,
            pointerEvents: 'auto'
          }}
          onClick={(e) => {
            // Cierra el modal si se da clic fuera de la tarjeta
            if (e.target === e.currentTarget) setMostrarModalCliente(false);
          }}
        >
          {/* Tarjeta Flotante / Pop-up con sombra Dribbble */}
          <div 
            className="relative w-full max-w-lg rounded-3xl p-8 transition-all animate-in fade-in zoom-in-95 duration-200"
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              // Sombra flotante profunda de alta definición
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.65), 0 18px 36px -18px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
              color: '#ffffff'
            }}
          >
            {/* Botón flotante para cerrar (X arriba a la derecha) */}
            <button
              type="button"
              onClick={() => setMostrarModalCliente(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-2xl transition-all"
              style={{ cursor: 'pointer', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(30, 41, 59, 0.8)' }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera del Formulario Flotante */}
            <div className="flex flex-col items-start space-y-2 pb-5 border-b border-slate-800/80 pr-10">
              <div 
                className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center space-x-2"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}
              >
                <Building2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Datos de Facturación</span>
              </div>
              <h3 className="text-2xl font-extrabold text-white tracking-tight">
                Nuevo Cliente Fiscal
              </h3>
              <p className="text-xs text-slate-400">
                Registra el NIT para vinculación automática con facturación DTE.
              </p>
            </div>

            {/* Campos del Formulario */}
            <form onSubmit={handleCrearCliente} className="mt-6 space-y-4">
              
              {/* Campo 1: NIT */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  NIT del Cliente <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. 12345678 o CF"
                  value={nuevoCliente.nit}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, nit: e.target.value })}
                  className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono transition-all"
                  style={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.7)', 
                    color: '#ffffff', 
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                  required
                />
              </div>

              {/* Campo 2: Razón Social */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Razón Social (Nombre Fiscal) <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Comercial El Sol, S.A."
                  value={nuevoCliente.razon_social}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, razon_social: e.target.value })}
                  className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                  style={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.7)', 
                    color: '#ffffff', 
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                  required
                />
              </div>

              {/* Campo 3: Nombre Comercial */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre Comercial <span className="text-slate-500">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Tienda El Sol"
                  value={nuevoCliente.nombre_comercial}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre_comercial: e.target.value })}
                  className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                  style={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.7)', 
                    color: '#ffffff', 
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setMostrarModalCliente(false)}
                  className="w-1/3 font-medium py-3 rounded-xl text-sm transition-all border hover:bg-slate-800"
                  style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', color: '#cbd5e1', borderColor: 'rgba(255, 255, 255, 0.1)', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoCliente}
                  className="w-2/3 font-bold py-3 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center space-x-2 hover:brightness-110 active:scale-[0.98]"
                  style={{ 
                    backgroundColor: '#f59e0b', 
                    color: '#0f172a', 
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px -4px rgba(245, 158, 11, 0.4)'
                  }}
                >
                  {guardandoCliente ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <span>Guardar Cliente</span>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}