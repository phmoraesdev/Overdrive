function ErroCampo({ id, mensagem }) {
  if (!mensagem) return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-600" role="alert">
      {mensagem}
    </p>
  );
}

export default ErroCampo;
