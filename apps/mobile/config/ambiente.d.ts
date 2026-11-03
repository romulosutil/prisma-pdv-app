export interface AmbienteApp { ambiente: 'demo' | 'homologacao' | 'producao'; modo: 'demo' | 'http'; urlApi: string | undefined }
export function resolverAmbiente(opcoes: { ambiente?: string; urlApi?: string; ferramentasTeste: boolean; desenvolvimento: boolean }): AmbienteApp;
