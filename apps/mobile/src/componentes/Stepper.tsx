import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { cores } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { Chip } from './Chip';
import { Icone } from './Icone';
import { Texto } from './Texto';

export interface StepperProps {
  valor: number;
  onChange: (valor: number) => void;
  minimo?: number;
  maximo?: number;
  /** Mostra o atalho "+5". */
  atalhoMais5?: boolean;
  /** Nome do que está sendo contado, para o leitor de tela ("Quantidade de arroz"). */
  rotulo?: string;
}

export function Stepper({ valor, onChange, minimo = 0, maximo = Number.MAX_SAFE_INTEGER, atalhoMais5, rotulo = 'Quantidade' }: StepperProps) {
  const mudar = (novo: number) => {
    const limitado = Math.min(maximo, Math.max(minimo, novo));
    if (limitado === valor) return;
    onChange(limitado);
    AccessibilityInfo.announceForAccessibility(`${rotulo}: ${limitado}`);
  };

  return (
    <View style={estilos.linha}>
      <BotaoRedondo icone="menos" rotulo={`Diminuir ${rotulo.toLowerCase()}`} desabilitado={valor <= minimo} onPress={() => mudar(valor - 1)} />
      <Texto estilo="tituloM" numerico style={estilos.numero} accessibilityLabel={`${rotulo}: ${valor}`}>
        {valor}
      </Texto>
      <BotaoRedondo icone="mais" rotulo={`Aumentar ${rotulo.toLowerCase()}`} desabilitado={valor >= maximo} onPress={() => mudar(valor + 1)} />
      {atalhoMais5 ? <Chip rotulo="+5" onPress={() => mudar(valor + 5)} /> : null}
    </View>
  );
}

function BotaoRedondo({
  icone,
  rotulo,
  desabilitado,
  onPress,
}: {
  icone: 'mais' | 'menos';
  rotulo: string;
  desabilitado: boolean;
  onPress: () => void;
}) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado }}
      disabled={desabilitado}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={({ pressed }) => [
        estilos.redondo,
        { backgroundColor: pressed ? cores.surface2 : cores.surface, opacity: desabilitado ? 0.4 : 1 },
        anel,
      ]}
    >
      <Icone nome={icone} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  redondo: { width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  numero: { minWidth: 40, textAlign: 'center' },
});
