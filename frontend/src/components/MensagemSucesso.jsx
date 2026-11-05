function MensagemSucesso({ mensagem }) {
  if (!mensagem) return null;
  return (
    <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
      {mensagem}
    </p>
  );
}

export default MensagemSucesso;
