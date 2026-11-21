const fs = require('node:fs');
const path = require('node:path');
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');

const BILLING_DEPENDENCY = 'implementation("com.android.billingclient:billing:7.1.1")';
const BILLING_PERMISSION = 'com.android.vending.BILLING';
const PACKAGE_CALL = 'add(br.com.pdv.mobile.billing.PdvPlayBillingPackage())';

const PDV_PLAY_BILLING_PACKAGE_KT = `package br.com.pdv.mobile.billing

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class PdvPlayBillingPackage : ReactPackage {
  @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(PdvPlayBillingModule(reactContext))
  }

  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<ViewManager<in Nothing, in Nothing>> {
    return emptyList()
  }
}
`;

const PDV_PLAY_BILLING_MODULE_KT = `package br.com.pdv.mobile.billing

import android.app.Activity
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = PdvPlayBillingModule.NAME)
class PdvPlayBillingModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), PurchasesUpdatedListener {

  companion object {
    const val NAME = "PdvPlayBilling"
  }

  private val lock = Any()
  private var billingClient: BillingClient? = null
  private var conectando = false
  private val aguardandoConexao = mutableListOf<Pair<() -> Unit, (String, String) -> Unit>>()
  private var compraPendente: Promise? = null
  private var skuCompraPendente: String? = null

  override fun getName(): String = NAME

  private fun obterOuCriarCliente(): BillingClient {
    synchronized(lock) {
      val existente = billingClient
      if (existente != null) return existente
      val novo = BillingClient.newBuilder(reactApplicationContext)
        .setListener(this)
        .enablePendingPurchases(
          PendingPurchasesParams.newBuilder()
            .enableOneTimeProducts()
            .build(),
        )
        .build()
      billingClient = novo
      return novo
    }
  }

  private fun conectar(onPronto: (BillingClient) -> Unit, onErro: (String, String) -> Unit) {
    val cliente = obterOuCriarCliente()
    val iniciarAgora: Boolean
    synchronized(lock) {
      if (cliente.isReady) {
        iniciarAgora = false
      } else {
        aguardandoConexao.add(Pair({ onPronto(cliente) }, onErro))
        if (conectando) {
          return
        }
        conectando = true
        iniciarAgora = true
      }
    }
    if (!iniciarAgora) {
      onPronto(cliente)
      return
    }
    try {
      cliente.startConnection(object : BillingClientStateListener {
        override fun onBillingSetupFinished(billingResult: BillingResult) {
          val pendentes: List<Pair<() -> Unit, (String, String) -> Unit>>
          synchronized(lock) {
            conectando = false
            pendentes = aguardandoConexao.toList()
            aguardandoConexao.clear()
          }
          if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            for ((pronto, _) in pendentes) pronto()
          } else {
            val msg = billingResult.debugMessage.ifBlank {
              "Google Play Billing indisponível (código \${billingResult.responseCode})."
            }
            for ((_, erro) in pendentes) erro("E_BILLING_UNAVAILABLE", msg)
          }
        }

        override fun onBillingServiceDisconnected() {
          val pendentes: List<Pair<() -> Unit, (String, String) -> Unit>>
          synchronized(lock) {
            if (!conectando) return
            conectando = false
            pendentes = aguardandoConexao.toList()
            aguardandoConexao.clear()
          }
          for ((_, erro) in pendentes) {
            erro("E_BILLING_DISCONNECTED", "Conexão com a Google Play Store encerrada.")
          }
        }
      })
    } catch (e: Throwable) {
      val pendentes: List<Pair<() -> Unit, (String, String) -> Unit>>
      synchronized(lock) {
        conectando = false
        pendentes = aguardandoConexao.toList()
        aguardandoConexao.clear()
      }
      val msg = e.message?.ifBlank { null } ?: "Falha ao conectar com a Google Play Billing."
      for ((_, erro) in pendentes) erro("E_BILLING_UNAVAILABLE", msg)
    }
  }

  private fun limparCompraERejeitar(codigo: String, mensagem: String) {
    val promise = synchronized(lock) {
      val p = compraPendente
      compraPendente = null
      skuCompraPendente = null
      p
    }
    promise?.reject(codigo, mensagem)
  }

  @ReactMethod
  fun comprarAssinatura(sku: String, obfAccountId: String?, promise: Promise) {
    val skuLimpo = sku.trim()
    if (skuLimpo.isEmpty()) {
      promise.reject("E_INVALID_SKU", "Produto de assinatura inválido.")
      return
    }
    val activityInicial: Activity? = reactApplicationContext.currentActivity
    if (activityInicial == null || activityInicial.isFinishing || activityInicial.isDestroyed) {
      promise.reject("E_NO_ACTIVITY", "Tela do aplicativo indisponível para iniciar a assinatura.")
      return
    }
    val ocupado = synchronized(lock) {
      if (compraPendente != null) {
        true
      } else {
        compraPendente = promise
        skuCompraPendente = skuLimpo
        false
      }
    }
    if (ocupado) {
      promise.reject("E_BILLING_BUSY", "Já existe uma assinatura em andamento na Google Play.")
      return
    }

    conectar(
      onPronto = { cliente ->
        val produto = QueryProductDetailsParams.Product.newBuilder()
          .setProductId(skuLimpo)
          .setProductType(BillingClient.ProductType.SUBS)
          .build()
        val params = QueryProductDetailsParams.newBuilder()
          .setProductList(listOf(produto))
          .build()
        cliente.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
          if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            val msg = billingResult.debugMessage.ifBlank {
              "Não foi possível consultar o plano na Google Play (código \${billingResult.responseCode})."
            }
            limparCompraERejeitar("E_BILLING_ERROR", msg)
            return@queryProductDetailsAsync
          }
          val detalhes = productDetailsList.firstOrNull { it.productId == skuLimpo }
            ?: productDetailsList.firstOrNull()
          if (detalhes == null) {
            limparCompraERejeitar("E_PRODUCT_NOT_FOUND", "Plano '\$skuLimpo' não encontrado na Google Play.")
            return@queryProductDetailsAsync
          }
          val ofertas = detalhes.subscriptionOfferDetails
          val oferta = ofertas?.firstOrNull { !it.offerId.isNullOrBlank() } ?: ofertas?.firstOrNull()
          val offerToken = oferta?.offerToken
          if (offerToken.isNullOrBlank()) {
            limparCompraERejeitar("E_NO_OFFER", "Nenhuma oferta ativa encontrada para o plano '\$skuLimpo'.")
            return@queryProductDetailsAsync
          }
          val activityAtual = reactApplicationContext.currentActivity
          if (activityAtual == null || activityAtual.isFinishing || activityAtual.isDestroyed) {
            limparCompraERejeitar("E_NO_ACTIVITY", "Tela do aplicativo indisponível para abrir a Google Play.")
            return@queryProductDetailsAsync
          }
          val productFlowParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(detalhes)
            .setOfferToken(offerToken)
            .build()
          val flowBuilder = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productFlowParams))
          if (!obfAccountId.isNullOrBlank()) {
            flowBuilder.setObfuscatedAccountId(obfAccountId.trim().take(64))
          }
          activityAtual.runOnUiThread {
            val emCurso = synchronized(lock) { compraPendente != null }
            if (!emCurso) return@runOnUiThread
            try {
              val launchResult = cliente.launchBillingFlow(activityAtual, flowBuilder.build())
              if (launchResult.responseCode != BillingClient.BillingResponseCode.OK) {
                val msg = launchResult.debugMessage.ifBlank {
                  "Não foi possível abrir o pagamento da Google Play (código \${launchResult.responseCode})."
                }
                val codigoErro = if (launchResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
                  "E_BILLING_CANCELED"
                } else {
                  "E_BILLING_ERROR"
                }
                limparCompraERejeitar(codigoErro, msg)
              }
            } catch (e: Throwable) {
              limparCompraERejeitar("E_BILLING_ERROR", e.message?.ifBlank { null } ?: "Falha ao abrir o pagamento da Google Play.")
            }
          }
        }
      },
      onErro = { codigo, mensagem ->
        limparCompraERejeitar(codigo, mensagem)
      },
    )
  }

  @ReactMethod
  fun consultarComprasAssinatura(sku: String, promise: Promise) {
    val filtroSku = sku.trim()
    conectar(
      onPronto = { cliente ->
        val params = QueryPurchasesParams.newBuilder()
          .setProductType(BillingClient.ProductType.SUBS)
          .build()
        cliente.queryPurchasesAsync(params) { billingResult, purchases ->
          if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            val msg = billingResult.debugMessage.ifBlank {
              "Não foi possível consultar assinaturas na Google Play (código \${billingResult.responseCode})."
            }
            promise.reject("E_BILLING_ERROR", msg)
            return@queryPurchasesAsync
          }
          val lista = Arguments.createArray()
          val packageName = reactApplicationContext.packageName
          for (compra in purchases) {
            if (compra.purchaseState != Purchase.PurchaseState.PURCHASED) continue
            if (filtroSku.isNotEmpty() && !compra.products.contains(filtroSku)) continue
            val productId = if (filtroSku.isNotEmpty() && compra.products.contains(filtroSku)) {
              filtroSku
            } else {
              compra.products.firstOrNull()
            }
            if (productId.isNullOrBlank() || compra.purchaseToken.isBlank()) continue
            val mapa = Arguments.createMap().apply {
              putString("purchaseToken", compra.purchaseToken)
              putString("productId", productId)
              putString("packageName", packageName)
            }
            lista.pushMap(mapa)
          }
          promise.resolve(lista)
        }
      },
      onErro = { codigo, mensagem ->
        promise.reject(codigo, mensagem)
      },
    )
  }

  override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
    val (promise, skuEsperado) = synchronized(lock) {
      val p = compraPendente
      val s = skuCompraPendente
      if (p != null) {
        compraPendente = null
        skuCompraPendente = null
      }
      Pair(p, s)
    }
    if (promise == null) return

    when (billingResult.responseCode) {
      BillingClient.BillingResponseCode.OK -> {
        val compra = purchases
          ?.firstOrNull { skuEsperado == null || it.products.contains(skuEsperado) }
          ?: purchases?.firstOrNull()
        if (compra == null) {
          promise.reject("E_BILLING_ERROR", "A Google Play não retornou os dados da assinatura.")
          return
        }
        when (compra.purchaseState) {
          Purchase.PurchaseState.PURCHASED -> {
            val productId = if (skuEsperado != null && compra.products.contains(skuEsperado)) {
              skuEsperado
            } else {
              compra.products.firstOrNull() ?: skuEsperado ?: ""
            }
            val mapa = Arguments.createMap().apply {
              putString("purchaseToken", compra.purchaseToken)
              putString("productId", productId)
              putString("packageName", reactApplicationContext.packageName)
            }
            promise.resolve(mapa)
          }
          Purchase.PurchaseState.PENDING -> {
            promise.reject("E_BILLING_PENDING", "Pagamento pendente de confirmação na Google Play.")
          }
          else -> {
            promise.reject("E_BILLING_ERROR", "Assinatura ainda não confirmada pela Google Play.")
          }
        }
      }
      BillingClient.BillingResponseCode.USER_CANCELED -> {
        promise.reject("E_BILLING_CANCELED", "Assinatura cancelada na Google Play.")
      }
      else -> {
        val msg = billingResult.debugMessage.ifBlank {
          "Erro na Google Play Billing (código \${billingResult.responseCode})."
        }
        promise.reject("E_BILLING_ERROR", msg)
      }
    }
  }

  override fun invalidate() {
    val (promiseCompra, pendentesConexao, cliente) = synchronized(lock) {
      val p = compraPendente
      compraPendente = null
      skuCompraPendente = null
      val pend = aguardandoConexao.toList()
      aguardandoConexao.clear()
      conectando = false
      val c = billingClient
      billingClient = null
      Triple(p, pend, c)
    }
    promiseCompra?.reject("E_BILLING_INVALIDATED", "Módulo de assinatura encerrado.")
    for ((_, erro) in pendentesConexao) {
      erro("E_BILLING_INVALIDATED", "Módulo de assinatura encerrado.")
    }
    try {
      cliente?.endConnection()
    } catch (_: Throwable) {
      // Ignorar erro ao encerrar conexão no teardown
    }
    super.invalidate()
  }
}
`;

function adicionarDependenciaGradle(contents) {
  if (contents.includes(BILLING_DEPENDENCY)) return contents;
  if (/implementation\((['"])com\.android\.billingclient:billing:[^'"]+\1\)/.test(contents)) {
    return contents.replace(/implementation\((['"])com\.android\.billingclient:billing:[^'"]+\1\)/, BILLING_DEPENDENCY);
  }
  const match = contents.match(/^(dependencies\s*\{\s*\r?\n)/m);
  if (!match) {
    throw new Error('android/app/build.gradle sem bloco dependencies esperado para injetar billingclient.');
  }
  return contents.replace(match[0], `${match[0]}    ${BILLING_DEPENDENCY}\n`);
}

function adicionarPermissaoBilling(androidManifest) {
  if (!Array.isArray(androidManifest.manifest['uses-permission'])) {
    androidManifest.manifest['uses-permission'] = [];
  }
  const permissoes = androidManifest.manifest['uses-permission'];
  if (!AndroidConfig.Permissions.isPermissionAlreadyRequested(BILLING_PERMISSION, permissoes)) {
    AndroidConfig.Permissions.addPermissionToManifest(BILLING_PERMISSION, permissoes);
  }
  return androidManifest;
}

function adicionarPackageMainApplication(contents) {
  if (contents.includes(PACKAGE_CALL)) return contents;
  const match = contents.match(/PackageList\(this\)\.packages\.apply\s*\{/);
  if (!match) {
    throw new Error('MainApplication.kt sem bloco PackageList(this).packages.apply esperado.');
  }
  return contents.replace(match[0], `${match[0]}\n          ${PACKAGE_CALL}`);
}

function garantirFontesKotlin(platformProjectRoot) {
  const pastaBilling = path.join(
    platformProjectRoot,
    'app',
    'src',
    'main',
    'java',
    'br',
    'com',
    'pdv',
    'mobile',
    'billing',
  );
  fs.mkdirSync(pastaBilling, { recursive: true });
  const arquivoPackage = path.join(pastaBilling, 'PdvPlayBillingPackage.kt');
  const arquivoModule = path.join(pastaBilling, 'PdvPlayBillingModule.kt');
  fs.writeFileSync(arquivoPackage, PDV_PLAY_BILLING_PACKAGE_KT, 'utf8');
  fs.writeFileSync(arquivoModule, PDV_PLAY_BILLING_MODULE_KT, 'utf8');
  return { pastaBilling, arquivoPackage, arquivoModule };
}

function withPdvPlayBillingBase(config) {
  config = withAppBuildGradle(config, (c) => {
    c.modResults.contents = adicionarDependenciaGradle(c.modResults.contents);
    return c;
  });

  config = withAndroidManifest(config, (c) => {
    c.modResults = adicionarPermissaoBilling(c.modResults);
    return c;
  });

  config = withMainApplication(config, (c) => {
    c.modResults.contents = adicionarPackageMainApplication(c.modResults.contents);
    return c;
  });

  config = withDangerousMod(config, [
    'android',
    async (c) => {
      garantirFontesKotlin(c.modRequest.platformProjectRoot);
      return c;
    },
  ]);

  return config;
}

const withPdvPlayBilling = createRunOncePlugin(withPdvPlayBillingBase, 'pdv-play-billing', '1.0.0');

Object.assign(withPdvPlayBilling, {
  BILLING_DEPENDENCY,
  BILLING_PERMISSION,
  PACKAGE_CALL,
  PDV_PLAY_BILLING_PACKAGE_KT,
  PDV_PLAY_BILLING_MODULE_KT,
  adicionarDependenciaGradle,
  adicionarPermissaoBilling,
  adicionarPackageMainApplication,
  garantirFontesKotlin,
});

module.exports = withPdvPlayBilling;
