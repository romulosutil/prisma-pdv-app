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
  iniciarAssinaturaPlay,
  playBillingDisponivel,
  restaurarComprasPlay,
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
  it('injeta com.android.billingclient:billing:7.1.1 no build.gradle de forma idempotente', () => {
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
    expect(modSrc).toContain('PendingPurchasesParams.newBuilder()');
    expect(modSrc).toContain('BillingClient.ProductType.SUBS');
    expect(modSrc).toContain('setObfuscatedAccountId');
  });

  it('app.json declara o plugin, regras ProGuard da Play Billing e versão 0.1.21 (22)', () => {
    expect(typeof plugin).toBe('function');
    expect(appJson.expo.version).toBe('0.1.21');
    expect(appJson.expo.android.versionCode).toBe(22);
    expect(appJson.expo.plugins).toContain('./config/withPdvPlayBilling');

    const buildProps = appJson.expo.plugins.find(
      (p: unknown) => Array.isArray(p) && p[0] === 'expo-build-properties',
    );
    expect(buildProps?.[1]?.android?.extraProguardRules).toContain('com.android.billingclient.**');
    expect(buildProps?.[1]?.android?.extraProguardRules).toContain('br.com.pdv.mobile.billing.**');
  });

  it('playBilling.ts usa NativeModules.PdvPlayBilling automaticamente no Android sem injeção manual', async () => {
    expect(playBillingDisponivel()).toBe(false);

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
    rnMock.NativeModules.PdvPlayBilling = { comprarAssinatura, consultarComprasAssinatura };

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

    rnMock.Platform.OS = 'ios';
    expect(playBillingDisponivel()).toBe(false);
  });
});
