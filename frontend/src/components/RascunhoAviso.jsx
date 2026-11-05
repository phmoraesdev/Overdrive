function RascunhoAviso({ onDescartar }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <span>Recuperamos um rascunho não salvo.</span>
      <button
        type="button"
        onClick={onDescartar}
        className="font-medium underline hover:no-underline"
      >
        Descartar rascunho
      </button>
    </div>
  );
}

export default RascunhoAviso;
