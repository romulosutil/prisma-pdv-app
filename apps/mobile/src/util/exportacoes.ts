import { Directory, File, Paths } from 'expo-file-system';
import { novoId } from './ids';

/** O arquivo precisa sobreviver ao chooser para o destinatário ler content://. */
export const PRAZO_EXPORTACAO_MS = 60 * 60 * 1000;
const PREFIXOS_LEGADOS = ['pdv-relatorio', 'pdv-vendas', 'pdv-dados-confirmados', 'pdv-diagnostico', 'pdv-pendencias'];
export function limparExportacoesExpiradas(agora = Date.now()): void {
  const pasta = new Directory(Paths.cache, 'pdv-exportacoes');
  if (pasta.exists) for (const item of pasta.list()) {
    if (!(item instanceof File)) continue;
    const em = Number(item.name.split('-')[0]);
    if (Number.isFinite(em) && agora - em >= PRAZO_EXPORTACAO_MS) item.delete();
  }
  for (const item of new Directory(Paths.cache).list()) {
    if (item instanceof File && PREFIXOS_LEGADOS.some(p => item.name.startsWith(p)) && /\.(json|csv)$/.test(item.name)) {
      const em = item.lastModified;
      if (typeof em === 'number' && agora - em >= PRAZO_EXPORTACAO_MS) item.delete();
    }
  }
}
export function criarExportacaoTemporaria(nome: string, conteudo: string): File {
  limparExportacoesExpiradas();
  const pasta = new Directory(Paths.cache, 'pdv-exportacoes');
  pasta.create({ idempotent: true, intermediates: true });
  const seguro = nome.replace(/[^a-zA-Z0-9._-]/g, '_');
  const arquivo = new File(pasta, `${Date.now()}-${novoId()}-${seguro}`);
  arquivo.create();
  try { arquivo.write(conteudo); }
  catch (erro) { if (arquivo.exists) arquivo.delete(); throw erro; }
  return arquivo;
}
