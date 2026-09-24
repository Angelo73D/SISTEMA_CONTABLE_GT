import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { FileText, Users, Wallet, RefreshCw, PlusCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('nomina');
  const [empleados, setEmpleados] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para el formulario de Caja Chica
  const [nuevoGasto, setNuevoGasto] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    comprobante: '',
    responsable: '',
    monto: ''
  });
  const [guardandoGasto, setGuardandoGasto] = useState(false);

  // Cargar datos reales desde Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Obtener empleados
    const { data: empData, error: empError } = await supabase.from('empleados').select('*');
    if (!empError) setEmpleados(empData || []);

    // Obtener gastos de caja chica
    const { data: cajaData, error: cajaError } = await supabase.from('caja_chica').select('*');
    if (!cajaError) setGastos(cajaData || []);

    setLoading(false);
  };

  // Guardar nuevo gasto en Supabase
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
    } else {
      console.error("Error al guardar gasto:", error);
    }

    setGuardandoGasto(false);
  };

  // Cálculo de planilla según leyes de Guatemala (IGSS Laboral 4.83% + Bonificación Ley Q250.00)
  const calcularNomina = (emp) => {
    const sueldoBase = Number(emp.salario_base) || 0;
    const bonifLey = Number(emp.bonificacion_ley) || 250.00;
    const igssLaboral = sueldoBase * 0.0483;
    const liquido = (sueldoBase + bonifLey) - igssLaboral;
    return { sueldoBase, bonifLey, igssLaboral, liquido };
  };

  // Total acumulado en Caja Chica
  const totalCajaChica = gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

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
            onClick={fetchData}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sincronizar Supabase</span>
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* MÓDULO 1: NÓMINA GUATEMALA */}
        {activeTab === 'nomina' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Planilla de Sueldos y Salarios</h2>
              <p className="text-sm text-slate-500">Cálculos automáticos con IGSS Laboral (4.83%) y Bonificación Incentivo</p>
            </div>

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
                      <td colSpan="6" className="p-6 text-center text-slate-400">No hay empleados registrados en Supabase.</td>
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
                <p className="text-sm text-slate-500">Registro de gastos menores y comprobantes de pago</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-right">
                <p className="text-xs text-amber-800 font-medium">Total Gastos Registrados</p>
                <p className="text-xl font-bold font-mono text-amber-950">Q {totalCajaChica.toFixed(2)}</p>
              </div>
            </div>

            {/* Formulario de registro de gastos */}
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
                  placeholder="Ej. Compra de suministros"
                  value={nuevoGasto.concepto}
                  onChange={(e) => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Comprobante (Factura/Recibo)</label>
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

            {/* Tabla de Gastos */}
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

        {/* MÓDULO 3: INGESTIÓN SAT */}
        {activeTab === 'sat' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Lector Masivo de XML de la SAT (DTE)</h2>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center bg-white shadow-sm">
              <p className="text-slate-600 font-medium">Arrastra tus archivos XML de Facturas Electrónicas aquí</p>
              <p className="text-xs text-slate-400 mt-1">Extrae automáticamente UUID, Serie, NIT, Base e IVA 12%</p>
              <button className="mt-4 bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
                Seleccionar Archivos XML
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}