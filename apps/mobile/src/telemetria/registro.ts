import { RegistroPiloto, acaoSegura, endpointSeguro, type CamposEvento, type TipoEvento } from './nucleo';

export const DIAGNOSTICO_PILOTO = process.env.EXPO_PUBLIC_AMBIENTE === 'homologacao';
let registro: RegistroPiloto | null = null;
export function definirRegistro(novo: RegistroPiloto): void { if (DIAGNOSTICO_PILOTO) registro = novo; }
export function registrarPiloto(tipo: TipoEvento, campos: CamposEvento = {}): void { if (DIAGNOSTICO_PILOTO) registro?.registrar(tipo, campos); }
export function registrarAcao(rotulo: string): void { registrarPiloto('acao', { acao: acaoSegura(rotulo) }); }
export function registrarHttp(metodo: string, caminho: string, inicio: number, status: number, etapa: CamposEvento['etapa'] = 'pronto'): void {
  registrarPiloto('http', { metodo: ['GET', 'POST', 'PUT', 'DELETE'].includes(metodo) ? metodo as CamposEvento['metodo'] : undefined, endpoint: endpointSeguro(caminho), ms: Math.min(1_000_000, Math.max(0, Date.now() - inicio)), status, etapa });
}
export async function salvarPiloto(): Promise<void> { await registro?.salvar(); }
export function exportarPiloto() { return registro?.exportar() ?? null; }
