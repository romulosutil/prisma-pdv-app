import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { BottomSheet } from '@/componentes/BottomSheet';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';

export interface FolhaDePlanoProps {
  visivel: boolean;
  onFechar: () => void;
  titulo: string;
  texto: string;
  /** Nome do plano que libera o recurso ("Negócio"). */
  planoNome: string;
}

/** Aviso de recurso ou limite do plano: explica, oferece o upgrade e nunca bloqueia nada que já existe. */
export function FolhaDePlano({ visivel, onFechar, titulo, texto, planoNome }: FolhaDePlanoProps) {
  const router = useRouter();
  return (
    <BottomSheet visivel={visivel} onFechar={onFechar} titulo={titulo}>
      <Texto estilo="corpoL" cor={cores.ink2}>
        {texto}
      </Texto>
      <View style={{ gap: 8, marginTop: 8 }}>
        <Botao
          rotulo={`Conhecer o ${planoNome}`}
          onPress={() => {
            onFechar();
            router.push('/ajustes/assinatura');
          }}
        />
        <Botao rotulo="Agora não" variante="terciario" onPress={onFechar} />
      </View>
    </BottomSheet>
  );
}
