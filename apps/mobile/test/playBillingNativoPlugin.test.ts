import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const rnMock = vi.hoisted(() => ({
  Platform: { OS: 'android' as string },
  NativeModules: {} as Record<string, unknown>,
  Linking: { openURL: vi.fn() },
}));

vi.mock('react-native', () => rnMock);

import {
  consultarOfertaPlay,
  descreverOfertaPlay,
  formatarDuracaoOfertaPlay,
  formatarPeriodoCobrancaPlay,
  iniciarAssinaturaPlay,
  playBillingDisponivel,
  restaurarComprasPlay,
  type OfertaAssinaturaPlay,
} from '@/servicos/playBilling';

const require = createRequire(import.meta.url);
const plugin = require('../config/withPdvPlayBilling.js');
const appJson = require('../app.json');

const BUILD_GRADLE_FIXTURE = `
android {
    namespace 'br.com.pdv.mobile'
}

dependencies {
    implementation("com.facebook.react:react-android")
}
`;

const MAIN_APPLICATION_FIXTURE = `package br.com.pdv.mobile

import android.app.Application
import com.facebook.react.PackageList

class MainApplication : Application() {
  override val reactHost = ExpoReactHostFactory.getDefaultReactHost(
    context = applicationContext,
    packageList =
      PackageList(this).packages.apply {
        // add(MyReactNativePackage())
      }
  )
}
`;

const pastasCriadas: string[] = [];

afterEach(() => {
  rnMock.Platform.OS = 'android';
  rnMock.NativeModules = {};
  while (pastasCriadas.length > 0) {
    const dir = pastasCriadas.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Config plugin e ponte nativa PdvPlayBilling', () => {
  it('injeta com.android.billingclient:billing:8.3.0 no build.gradle de forma idempotente', () => {
    const umaVez = plugin.adicionarDependenciaGradle(BUILD_GRADLE_FIXTURE);
    expect(umaVez).toContain(plugin.BILLING_DEPENDENCY);
    const duasVezes = plugin.adicionarDependenciaGradle(umaVez);
    expect(duasVezes).toBe(umaVez);
    expect(duasVezes.split('com.android.billingclient:billing').length).toBe(2);

    const versaoAntiga = BUILD_GRADLE_FIXTURE.replace(
      'implementation("com.facebook.react:react-android")',
      'implementation("com.android.billingclient:billing:6.2.1")\n    implementation("com.facebook.react:react-android")',
    );
    const atualizada = plugin.adicionarDependenciaGradle(versaoAntiga);
    expect(atualizada).toContain(plugin.BILLING_DEPENDENCY);
    expect(atualizada).not.toContain('6.2.1');

    expect(() => plugin.adicionarDependenciaGradle('android {}')).toThrow('dependencies');
  });

  it('adiciona permissão com.android.vending.BILLING ao AndroidManifest de forma idempotente', () => {
    const manifest: any = { manifest: { 'uses-permission': [{ $: { 'android:name': 'android.permission.INTERNET' } }] } };
    plugin.adicionarPermissaoBilling(manifest);
    plugin.adicionarPermissaoBilling(manifest);
    const nomes = manifest.manifest['uses-permission'].map((p: any) => p.$['android:name']);
    expect(nomes).toEqual(['android.permission.INTERNET', 'com.android.vending.BILLING']);

    const semArray: any = { manifest: {} };
    plugin.adicionarPermissaoBilling(semArray);
    expect(semArray.manifest['uses-permission']).toEqual([{ $: { 'android:name': 'com.android.vending.BILLING' } }]);
  });

  it('registra PdvPlayBillingPackage no MainApplication.kt de forma idempotente', () => {
    const umaVez = plugin.adicionarPackageMainApplication(MAIN_APPLICATION_FIXTURE);
    expect(umaVez).toContain(plugin.PACKAGE_CALL);
    const duasVezes = plugin.adicionarPackageMainApplication(umaVez);
    expect(duasVezes).toBe(umaVez);
    expect(() => plugin.adicionarPackageMainApplication('class MainApplication {}')).toThrow('PackageList');
  });

  it('gera arquivos Kotlin PdvPlayBillingPackage e PdvPlayBillingModule no pacote fixo', () => {
    const androidRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pdv-billing-plugin-'));
    pastasCriadas.push(androidRoot);

    const primeira = plugin.garantirFontesKotlin(androidRoot);
    const segunda = plugin.garantirFontesKotlin(androidRoot);
    expect(primeira.arquivoPackage).toBe(segunda.arquivoPackage);
    expect(primeira.arquivoModule).toBe(segunda.arquivoModule);

    const pkgSrc = fs.readFileSync(primeira.arquivoPackage, 'utf8');
    const modSrc = fs.readFileSync(primeira.arquivoModule, 'utf8');
    expect(pkgSrc).toContain('package br.com.pdv.mobile.billing');
    expect(pkgSrc).toContain('class PdvPlayBillingPackage : ReactPackage');
    expect(pkgSrc).toContain('PdvPlayBillingModule(reactContext)');

    expect(modSrc).toContain('package br.com.pdv.mobile.billing');
    expect(modSrc).toContain('@ReactModule(name = PdvPlayBillingModule.NAME)');
    expect(modSrc).toContain('const val NAME = "PdvPlayBilling"');
    expect(modSrc).toContain('fun comprarAssinatura(sku: String, obfAccountId: String?, promise: Promise)');
    expect(modSrc).toContain('fun consultarComprasAssinatura(sku: String, promise: Promise)');
    expect(modSrc).toContain('fun consultarOfertaAssinatura(sku: String, promise: Promise)');
    expect(modSrc).toContain('private fun selecionarOferta(');
    expect(modSrc).toContain('ProductDetails.RecurrenceMode.INFINITE_RECURRING');
    expect(modSrc).toContain('PendingPurchasesParams.newBuilder()');
    expect(modSrc).toContain('queryProductDetailsResult.productDetailsList');
    expect(modSrc).toContain('BillingClient.ProductType.SUBS');
    expect(modSrc).toContain('setObfuscatedAccountId');
  });

  it('app.json declara o plugin, regras ProGuard da Play Billing e versão 0.1.23 (24)', () => {
    expect(typeof plugin).toBe('function');
    expect(appJson.expo.version).toBe('0.1.23');
    expect(appJson.expo.android.versionCode).toBe(24);
    expect(appJson.expo.plugins).toContain('./config/withPdvPlayBilling');

    const buildProps = appJson.expo.plugins.find(
      (p: unknown) => Array.isArray(p) && p[0] === 'expo-build-properties',
    );
    expect(buildProps?.[1]?.android?.extraProguardRules).toContain('com.android.billingclient.**');
    expect(buildProps?.[1]?.android?.extraProguardRules).toContain('br.com.pdv.mobile.billing.**');
  });

  it('playBilling.ts usa NativeModules.PdvPlayBilling automaticamente no Android sem injeção manual', async () => {
    expect(playBillingDisponivel()).toBe(false);

    const ofertaReal: OfertaAssinaturaPlay = {
      productId: 'prisma_pro_mensal',
      titulo: 'Prisma Pro Mensal',
      basePlanId: 'mensal',
      offerId: 'gratis-7d',
      offerToken: 'tok-oferta-1',
      precoFormatado: 'R$ 54,90',
      precoMicros: 54_900_000,
      moeda: 'BRL',
      periodoCobranca: 'P1M',
      temTesteGratis: true,
      periodoTesteGratis: 'P7D',
      ciclosTesteGratis: 1,
      precoIntrodutorioFormatado: null,
      periodoIntrodutorio: null,
      ciclosIntrodutorio: 0,
    };
    const comprarAssinatura = vi.fn().mockResolvedValue({
      purchaseToken: 'tok-nativo-123456',
      productId: 'prisma_pro_mensal',
      packageName: 'br.com.pdv.mobile',
    });
    const consultarComprasAssinatura = vi.fn().mockResolvedValue([
      {
        purchaseToken: 'tok-nativo-123456',
        productId: 'prisma_pro_mensal',
        packageName: 'br.com.pdv.mobile',
      },
    ]);
    const consultarOfertaAssinatura = vi.fn().mockResolvedValue(ofertaReal);
    rnMock.NativeModules.PdvPlayBilling = {
      comprarAssinatura,
      consultarComprasAssinatura,
      consultarOfertaAssinatura,
    };

    expect(playBillingDisponivel()).toBe(true);
    await expect(
      iniciarAssinaturaPlay({
        packageName: 'br.com.pdv.mobile',
        sku: 'prisma_pro_mensal',
        contaId: 'conta-1',
      }),
    ).resolves.toMatchObject({ purchaseToken: 'tok-nativo-123456' });
    expect(comprarAssinatura).toHaveBeenCalledWith('prisma_pro_mensal', 'conta-1');

    await expect(
      restaurarComprasPlay({ packageName: 'br.com.pdv.mobile', sku: 'prisma_pro_mensal' }),
    ).resolves.toMatchObject({ purchaseToken: 'tok-nativo-123456' });
    expect(consultarComprasAssinatura).toHaveBeenCalledWith('prisma_pro_mensal');

    await expect(consultarOfertaPlay({ sku: 'prisma_pro_mensal' })).resolves.toEqual(ofertaReal);
    expect(consultarOfertaAssinatura).toHaveBeenCalledWith('prisma_pro_mensal');

    consultarOfertaAssinatura.mockRejectedValueOnce(new Error('offline'));
    await expect(consultarOfertaPlay({ sku: 'prisma_pro_mensal' })).resolves.toBeNull();

    rnMock.Platform.OS = 'ios';
    expect(playBillingDisponivel()).toBe(false);
    await expect(consultarOfertaPlay({ sku: 'prisma_pro_mensal' })).resolves.toBeNull();
  });

  it('formata períodos e descreve ofertas reais da Google Play sem prometer teste grátis inexistente', () => {
    expect(formatarPeriodoCobrancaPlay('P1M')).toBe('mês');
    expect(formatarPeriodoCobrancaPlay('P3M')).toBe('3 meses');
    expect(formatarPeriodoCobrancaPlay('P1Y')).toBe('ano');
    expect(formatarPeriodoCobrancaPlay('P1W')).toBe('semana');
    expect(formatarDuracaoOfertaPlay('P7D', 1)).toBe('7 dias');
    expect(formatarDuracaoOfertaPlay('P1W', 1)).toBe('7 dias');
    expect(formatarDuracaoOfertaPlay('P1M', 3)).toBe('3 meses');
    expect(formatarDuracaoOfertaPlay(null, 1)).toBeNull();

    const ofertaBase: OfertaAssinaturaPlay = {
      productId: 'prisma_pro_mensal',
      titulo: 'Pro',
      basePlanId: 'mensal',
      offerId: null,
      offerToken: 'tok',
      precoFormatado: 'R$ 59,90',
      precoMicros: 59_900_000,
      moeda: 'BRL',
      periodoCobranca: 'P1M',
      temTesteGratis: false,
      periodoTesteGratis: null,
      ciclosTesteGratis: 0,
      precoIntrodutorioFormatado: null,
      periodoIntrodutorio: null,
      ciclosIntrodutorio: 0,
    };

    const comTrial = descreverOfertaPlay({
      ...ofertaBase,
      offerId: 'trial-7d',
      temTesteGratis: true,
      periodoTesteGratis: 'P7D',
      ciclosTesteGratis: 1,
    }, 4990);
    expect(comTrial.precoFormatado).toBe('R$ 59,90');
    expect(comTrial.rotuloBotaoOnboarding).toBe('Começar 7 dias grátis na Google Play');
    expect(comTrial.rotuloBotaoAssinatura).toBe('Assinar Pro (7 dias grátis)');
    expect(comTrial.notaCobranca).toContain('7 dias grátis');
    expect(comTrial.notaCobranca).toContain('R$ 59,90 por mês');

    const comIntro = descreverOfertaPlay({
      ...ofertaBase,
      offerId: 'intro-3m',
      precoIntrodutorioFormatado: 'R$ 19,90',
      periodoIntrodutorio: 'P1M',
      ciclosIntrodutorio: 3,
    }, 4990);
    expect(comIntro.detalheOferta).toBe('R$ 19,90 por 3 meses, depois R$ 59,90/mês');
    expect(comIntro.rotuloBotaoOnboarding).toContain('R$ 19,90');
    expect(comIntro.notaCobranca).toContain('R$ 19,90 por 3 meses');
    expect(comIntro.notaCobranca).toContain('R$ 59,90 por mês');
    expect(comIntro.notaCobranca).not.toContain('grátis');

    const semOfertaPromocional = descreverOfertaPlay(ofertaBase, 4990);
    expect(semOfertaPromocional.detalheOferta).toBeNull();
    expect(semOfertaPromocional.rotuloBotaoOnboarding).toBe('Assinar Pro na Google Play (R$ 59,90/mês)');
    expect(semOfertaPromocional.notaCobranca).toContain('R$ 59,90 por mês');
    expect(semOfertaPromocional.notaCobranca).not.toContain('grátis');

    const fallback = descreverOfertaPlay(null, 4990);
    expect(fallback.precoFormatado).toBe('R$ 49,90');
    expect(fallback.notaCobranca).toContain('Cobrança de referência');
    expect(fallback.notaCobranca).not.toContain('grátis');
  });
});
