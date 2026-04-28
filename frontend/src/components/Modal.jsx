// ============================================================
// COMPONENTE: MODAL REUTILIZABLE (BOTTOM SHEET)
// ============================================================

// 1 - IMPORTO REACT Y EL ÍCONO DE CIERRE:
import { useEffect } from 'react';
import { X } from 'lucide-react';

// 2 - DEFINO EL COMPONENTE:
export default function Modal({ isOpen, onClose, title, children }) {

  // 3 - CIERRO EL MODAL AL PRESIONAR ESC:
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // 4 - SI NO ESTÁ ABIERTO NO RENDERIZO NADA:
  if (!isOpen) return null;

  // 5 - RENDERIZO EL MODAL:
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        {/* INDICADOR DE ARRASTRE */}
        <div className="modal-handle"></div>

        {/* CABECERA CON TÍTULO Y BOTÓN CERRAR */}
        <div className="flex items-center justify-between mb-16">
          <h2 className="modal-title" style={{ marginBottom: 0 }}>{title}</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        {children}
      </div>
    </div>
  );
}

