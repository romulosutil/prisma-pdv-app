import { forwardRef, useEffect, useId, useState } from 'react';
import { AccessibilityInfo, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { cores, raio, texto } from '@/tema';
import { Texto } from './Texto';

export interface CampoProps
  extends Pick<
    TextInputProps,
    | 'value'
    | 'onChangeText'
    | 'placeholder'
    | 'keyboardType'
    | 'autoCapitalize'
    | 'autoComplete'
    | 'autoCorrect'
    | 'textContentType'
    | 'secureTextEntry'
    | 'maxLength'
    | 'returnKeyType'
    | 'onSubmitEditing'
    | 'onBlur'
    | 'editable'
    | 'testID'
  > {
  rotulo: string;
  erro?: string | null;
  /** Texto de apoio abaixo do campo (some quando há erro). */
  ajuda?: string;
  /** Conteúdo à direita dentro da caixa (ex.: bandeira do cartão). */
  adorno?: React.ReactNode;
}

export const Campo = forwardRef<TextInputInstance, CampoProps>(function Campo(
  { rotulo, erro, ajuda, adorno, onBlur, editable = true, ...entrada },
  ref,
) {
  const [focado, setFocado] = useState(false);
  const idRotulo = useId();

  useEffect(() => {
    if (erro) AccessibilityInfo.announceForAccessibility(`${rotulo}: ${erro}`);
  }, [erro, rotulo]);

  const corAnel = erro ? cores.pitanga : focado ? cores.anil : 'transparent';

  return (
    <View style={estilos.grupo}>
      <Texto nativeID={idRotulo} estilo="label" cor={cores.ink2}>
        {rotulo}
      </Texto>
      <View style={[estilos.caixa, { borderColor: corAnel }, !editable && estilos.desabilitado]}>
        <TextInput
          ref={ref}
          {...entrada}
          editable={editable}
          accessibilityLabel={rotulo}
          accessibilityHint={erro ?? ajuda}
          aria-labelledby={idRotulo}
          aria-invalid={Boolean(erro)}
          placeholderTextColor={cores.ink3}
          selectionColor={cores.anil}
          onFocus={() => setFocado(true)}
          onBlur={(e) => {
            setFocado(false);
            onBlur?.(e);
          }}
          style={[texto.corpoL, estilos.entrada]}
        />
        {adorno}
      </View>
      {erro ? (
        <Texto estilo="legenda" cor={cores.pitanga} accessibilityLiveRegion="polite" role="alert">
          {erro}
        </Texto>
      ) : ajuda ? (
        <Texto estilo="legenda" cor={cores.ink3}>
          {ajuda}
        </Texto>
      ) : null}
    </View>
  );
});

const estilos = StyleSheet.create({
  grupo: { gap: 8 },
  caixa: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: raio.md,
    borderWidth: 2,
    backgroundColor: cores.surface,
  },
  desabilitado: { opacity: 0.5 },
  entrada: { flex: 1, minHeight: 52, color: cores.ink, fontFamily: texto.corpoMedio.fontFamily, outlineWidth: 0 },
});
