<template>
  <span style="display:inline-flex;align-items:center;vertical-align:middle;margin-left:5px">
    <button
      type="button"
      @click.stop="toggle"
      :ref="el => (btnEl = el)"
      style="width:14px;height:14px;border-radius:50%;border:1px solid #3f3f46;background:transparent;color:#52525b;cursor:pointer;font-size:9px;font-weight:700;line-height:1;padding:0;display:inline-flex;align-items:center;justify-content:center;transition:border-color 0.15s,color 0.15s;flex-shrink:0"
      @mouseenter="e => { e.currentTarget.style.borderColor='#10b981'; e.currentTarget.style.color='#10b981' }"
      @mouseleave="e => { e.currentTarget.style.borderColor='#3f3f46'; e.currentTarget.style.color='#52525b' }"
      :aria-label="`Info sur le champ ${field}`"
    >i</button>

    <Teleport to="body">
      <Transition name="fi-fade">
        <div
          v-if="visible"
          ref="popEl"
          :style="popStyle"
          style="position:fixed;z-index:9999;width:320px;background:#1c1c1f;border:1px solid #27272a;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.6);padding:0;overflow:hidden;font-size:12px"
          @click.stop
        >
          <!-- Header -->
          <div style="background:#111113;border-bottom:1px solid #27272a;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="display:flex;align-items:center;gap:7px;min-width:0">
              <span
                :style="{ background: SOURCE_COLORS[meta.source] ?? '#3f3f46' }"
                style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;color:#fff;white-space:nowrap;flex-shrink:0"
              >{{ SOURCE_LABELS[meta.source] ?? meta.source }}</span>
              <code style="font-size:11px;color:#10b981;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ field }}</code>
            </div>
            <button @click="visible=false" style="background:transparent;border:none;color:#71717a;cursor:pointer;padding:0;font-size:14px;flex-shrink:0">×</button>
          </div>

          <!-- Body -->
          <div style="padding:12px;display:flex;flex-direction:column;gap:10px">

            <!-- Description -->
            <p style="margin:0;color:#a1a1aa;line-height:1.5">{{ meta.description }}</p>

            <!-- Technique / source -->
            <div style="display:flex;flex-direction:column;gap:6px">
              <div v-if="meta.csvCol !== undefined" style="display:flex;justify-content:space-between">
                <span style="color:#52525b">Colonne CSV</span>
                <code style="color:#fafafa">{{ meta.csvCol }} — {{ meta.csvHeader }}</code>
              </div>
              <div v-if="meta.apiField" style="display:flex;justify-content:space-between">
                <span style="color:#52525b">Champ API</span>
                <code style="color:#60a5fa">{{ meta.apiField }}</code>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:#52525b">Type</span>
                <code style="color:#a78bfa">{{ meta.type }}</code>
              </div>
              <div v-if="meta.example !== undefined" style="display:flex;justify-content:space-between;gap:8px">
                <span style="color:#52525b;flex-shrink:0">Exemple</span>
                <code style="color:#fb923c;word-break:break-all;text-align:right">{{ meta.example }}</code>
              </div>
              <div v-if="meta.unit" style="display:flex;justify-content:space-between">
                <span style="color:#52525b">Unité</span>
                <code style="color:#fafafa">{{ meta.unit }}</code>
              </div>
              <div v-if="meta.endpoint" style="display:flex;justify-content:space-between">
                <span style="color:#52525b">Endpoint</span>
                <code style="color:#2dd4bf;font-size:10px">{{ meta.endpoint }}</code>
              </div>
            </div>

            <!-- Audiences -->
            <div style="display:flex;flex-direction:column;gap:5px;border-top:1px solid #27272a;padding-top:10px">
              <div v-if="meta.dev" style="display:flex;gap:6px;align-items:flex-start">
                <span style="flex-shrink:0;font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(96,165,250,.15);color:#60a5fa;margin-top:1px">DEV</span>
                <span style="color:#71717a;line-height:1.4">{{ meta.dev }}</span>
              </div>
              <div v-if="meta.functional" style="display:flex;gap:6px;align-items:flex-start">
                <span style="flex-shrink:0;font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(167,139,250,.15);color:#a78bfa;margin-top:1px">FONC</span>
                <span style="color:#71717a;line-height:1.4">{{ meta.functional }}</span>
              </div>
              <div v-if="meta.analyst" style="display:flex;gap:6px;align-items:flex-start">
                <span style="flex-shrink:0;font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(251,191,36,.12);color:#fbbf24;margin-top:1px">DATA</span>
                <span style="color:#71717a;line-height:1.4">{{ meta.analyst }}</span>
              </div>
            </div>

            <div v-if="meta.odoo" style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:6px;padding:8px 10px;font-size:11px;color:#6ee7b7">
              <strong style="color:#10b981">Odoo :</strong> {{ meta.odoo }}
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({ field: { type: String, required: true } })

const visible = ref(false)
const btnEl = ref(null)
const popEl = ref(null)
const popStyle = ref({})

const SOURCE_COLORS = { csv: '#059669', api: '#2563eb', local: '#7c3aed', computed: '#b45309' }
const SOURCE_LABELS = { csv: 'CSV', api: 'API ProfiAuto', local: 'LOCAL', computed: 'CALCULÉ' }

const FIELDS = {
  motonet:                { source:'csv',  csvCol:1,  csvHeader:'Motonet number',                type:'string',  example:'ABS0215Q',         description:'Identifiant unique article dans le système Moto-Profil. Clé primaire du catalogue PB Offer.', dev:'Clé de jointure entre CSV et API ProfiAuto. Toujours uppercase, max 20 chars. Utiliser pour le lookup byMotonet (O(1)).', functional:'Référence interne Moto-Profil à utiliser dans les commandes et imports Odoo.', analyst:'Cardinalité = 1 (unique). Clé dédupliquée au chargement CSV. Index principal.', odoo:"Référence interne (Internal Reference) sur la fiche produit." },
  manufacturer:           { source:'csv',  csvCol:2,  csvHeader:'Manufacturer',                  type:'string',  example:'ABS',              description:'Marque fabricant de la pièce. Correspond au fournisseur TecDoc.', dev:'Index byBrand en Map<string,Article[]>. Sensible à la casse — toujours tel quel depuis le CSV.', functional:'Marque affichée sur le site e-commerce. À mapper avec les marques Odoo/Shopify.', analyst:'831 valeurs distinctes dans le catalogue. Distribution très longue traîne.', odoo:'Fournisseur (Vendor) ou Marque (Brand) sur la fiche produit.' },
  tecDocArtNr:            { source:'csv',  csvCol:3,  csvHeader:'TecDoc ArtNr',                  type:'string',  example:'0 215 Q',          description:'Numéro article TecDoc, format OEM fabricant normalisé par TecDoc.', dev:'Peut contenir des espaces. Ne pas utiliser comme clé — utiliser motonet.', functional:'Ref. catalogue technique TecDoc pour le matching avec AutoData / HaynesPro.', analyst:'Peut être vide (articles sans fiche TecDoc). Doublons possibles entre marques.' },
  name:                   { source:'csv',  csvCol:4,  csvHeader:'Parts name',                    type:'string',  example:'Plaquettes de frein', description:'Nom commercial de la pièce en polonais / anglais selon la marque.', dev:'Champ principal pour la recherche full-text. Indexé dans searchItems().', functional:"Nom affiché dans le catalogue. Traduire en français pour l'UI client.", analyst:'Longueur moyenne 25 chars. Parfois contient des informations de placement (avant/arrière).' },
  original:               { source:'csv',  csvCol:5,  csvHeader:'Original number (OEM)',         type:'string',  example:'A 004 420 07 20',   description:'Référence OEM (constructeur) de la pièce d\'origine remplacée.', dev:'Champ de recherche cross-référence. Peut contenir espaces, tirets. Indexé dans searchItems().', functional:"Permet au client de vérifier que la pièce remplace bien sa référence d'origine.", analyst:'Taux de remplissage ~85%. Permet la déduplication multi-fournisseurs.' },
  priceNet:               { source:'csv',  csvCol:6,  csvHeader:'Purchase nett price',           type:'float',   example:12.45,              description:'Prix achat HT (hors TVA, hors remise) en PLN ou EUR selon contrat.', unit:'€ (converti depuis PLN)', dev:'Virgule décimale CSV → convertie en point pour parseFloat. 0 si non renseigné.', functional:'Prix de revient avant remise contractuelle. Marge = priceRetail - priceNet.', analyst:'Distribution bimodale : petites pièces <10€ et grosses pièces >200€. Ne jamais utiliser tel quel pour le calcul de rentabilité (appliquer discountGroup).', odoo:"Prix d'achat (PO price) sur la liste tarifaire fournisseur." },
  prefix:                 { source:'csv',  csvCol:7,  csvHeader:'Prefix',                        type:'string',  example:'ABS',              description:"Préfixe du code article (généralement = code marque). Avec index forme le code catalogue complet.", dev:'prefix + index = référence catalogue complète. Ex: "ABS" + "0215Q" = "ABS0215Q" = motonet.', functional:'Permet le filtrage par famille de produit au niveau catalogue.', analyst:'Toujours cohérent avec manufacturer. Cardinalité ~400 valeurs.' },
  index:                  { source:'csv',  csvCol:8,  csvHeader:'Index',                         type:'string',  example:'0215Q',            description:'Suffixe numérique/alphanumérique de la référence catalogue.', dev:'Voir prefix. Combinaison prefix+index = motonet dans 95% des cas.', functional:'Numéro de série dans la gamme du fabricant.', analyst:'' },
  suppliersRef:           { source:'csv',  csvCol:9,  csvHeader:"Supplier's number",             type:'string',  example:'0986478105',       description:'Référence interne du fournisseur (Moto-Profil), différente du motonet.', dev:'Champ informatif uniquement — ne pas utiliser comme clé.', functional:'Référence Moto-Profil pour le service achat lors des commandes.', analyst:'' },
  deposit:                { source:'csv',  csvCol:10, csvHeader:'Deposit',                       type:'float',   example:0,                  description:'Montant de consigne (emballage, noyau) facturé avec la pièce, remboursable au retour.', unit:'€', dev:'Ajouter au priceNet pour calculer le coût total facturé. Souvent 0.', functional:"Consigne retournable : batteries, alternateurs, disques d'embrayage.", analyst:'Non nul pour ~3% des articles. Segments concernés: électrique, accumulateurs.' },
  bail:                   { source:'csv',  csvCol:11, csvHeader:'Bail',                          type:'float',   example:0,                  description:'Caution / dépôt complémentaire (bail). Distinct de la consigne.', unit:'€', dev:'Rarement non-nul. Ignorable dans la plupart des flux.', functional:'Montant complémentaire parfois requis sur pièces haute valeur.', analyst:'' },
  customCode:             { source:'csv',  csvCol:12, csvHeader:'Custom code',                   type:'string',  example:'8708300091',       description:'Code douanier (nomenclature combinée NC/HS) pour les déclarations import/export.', dev:'Format HS-8 ou HS-10. Obligatoire pour les expéditions hors UE.', functional:"Requis pour les factures d'exportation et les formulaires douaniers.", analyst:'Source de compliance réglementaire. À croiser avec la base TARIC.' },
  barcode:                { source:'csv',  csvCol:13, csvHeader:'Barcode (EAN)',                 type:'string',  example:'4260285231053',    description:'Code EAN-13 ou EAN-8 du produit pour la lecture scanner en entrepôt.', dev:'Champ de recherche indexé dans searchItems(). Peut être vide (~15% des articles).', functional:"Code-barres imprimé sur l'emballage. Essentiel pour la réception et l'expédition.", analyst:'Taux de remplissage ~85%. Clé de rapprochement avec les marketplaces (Amazon, Cdiscount).', odoo:'Code-barres (Barcode) sur la fiche produit.' },
  weight:                 { source:'csv',  csvCol:14, csvHeader:'Weight',                        type:'float',   example:0.345,              unit:'kg', description:'Poids brut de la pièce en kg (avec emballage).', dev:'Virgule décimale CSV. Utilisé pour le calcul des frais de port.', functional:'Affiché sur la fiche produit. Requis pour les règles de transport (>30kg = palette).', analyst:'Distribution log-normale. Outliers à >10kg nécessitent validation.', odoo:'Poids (Weight) sur la fiche produit logistique.' },
  minQty:                 { source:'csv',  csvCol:15, csvHeader:'Sales quantity (min order)',    type:'float',   example:1,                  description:'Quantité minimum de commande (conditionnement). Ex: 2 = vendu par paire.', dev:'Entier en pratique mais stocké float. Utiliser Math.ceil() pour les calculs de panier.', functional:"Contrainte panier : impossible de commander 1 si minQty=2. Affiché 'vendu par 2'.", analyst:'~20% des articles ont minQty>1. Surtout: filtres (2), plaquettes (set de 4).' },
  description:            { source:'csv',  csvCol:16, csvHeader:'Article description',           type:'string',  example:'Frein avant, 2 pcs', description:'Description textuelle complémentaire, souvent le placement ou contenu du kit.', dev:'Champ indexé dans searchItems(). Souvent vide pour les articles simples.', functional:"Apparaît dans la description Odoo/e-commerce. À enrichir si vide.", analyst:'Taux de remplissage ~40%. Longueur max observée: 255 chars.' },
  stockChorzow:           { source:'csv',  csvCol:17, csvHeader:'Stock availability – Chorzów', type:'int',     example:15,                 description:'Quantité en stock dans l\'entrepôt principal de Chorzów (Pologne).', dev:'Parsé en int. Valeur 0 = rupture. Filtre principal "inStock".', functional:"Stock physique disponible pour expédition J+1. C'est le stock à afficher en priorité.", analyst:'Snapshot quotidien du CSV. Volatile — peut changer en 24h. Distribution très concentrée: 80% des articles ont stock=0.', odoo:"Quantité disponible (On Hand) — synchroniser via le flux EDI ou import manuel." },
  discount:               { source:'csv',  csvCol:18, csvHeader:'Percent discount',             type:'float',   example:25.5,               unit:'%', description:'Remise en % applicable sur le prix net catalogue selon le contrat client.', dev:'Nombre entre 0 et 100. Prix final = priceNet * (1 - discount/100).', functional:'Remise contractuelle négociée avec Moto-Profil. Varie par groupe produit.', analyst:'Distribution: 0%, 15%, 20%, 25%, 30% sont les valeurs les plus fréquentes.' },
  discountGroup:          { source:'csv',  csvCol:19, csvHeader:'Discount group name',          type:'string',  example:'FREIN',            description:'Groupe tarifaire auquel appartient l\'article, déterminant la remise applicable.', dev:'Clé de segmentation tarifaire. Index byDiscountGroup. ~50 valeurs distinctes.', functional:'Chaque groupe a des conditions tarifaires différentes dans le contrat Moto-Profil.', analyst:'Variable de segmentation essentielle pour les analyses de rentabilité par catégorie produit.' },
  priceRetail:            { source:'csv',  csvCol:20, csvHeader:'Nett retail price',            type:'float',   example:18.90,              unit:'€', description:'Prix public HT recommandé par Moto-Profil pour la revente au détail.', dev:'Prix affiché dans le catalogue B2C. Distinct de priceNet (prix achat).', functional:'PVTTC = priceRetail * (1 + vatRate/100). Marge brute = priceRetail - priceNet.', analyst:'Ratio priceRetail/priceNet = coefficient multiplicateur (~1.4 à 2.5 selon segment).', odoo:'Prix de vente (Sales Price) sur la liste tarifaire client.' },
  unit:                   { source:'csv',  csvCol:21, csvHeader:'Unit of measure',              type:'string',  example:'PCS',              description:"Unité de mesure de l'article (PCS=pièce, SET=jeu, L=litre, KG=kilogramme).", dev:"Valeurs possibles: PCS, SET, L, KG, M. Utiliser pour l'affichage 'Prix / unité'.", functional:"Conditionne l'affichage du prix et du panier. SET = plusieurs pièces dans le lot.", analyst:"Distribution: PCS ~92%, SET ~6%, autres ~2%." },
  nonReturnable:          { source:'csv',  csvCol:22, csvHeader:'Non-returnable',               type:'boolean', example:false,              description:'Si true, la pièce ne peut pas être retournée une fois commandée (liquides, joints, etc.).', dev:"CSV: '1' = true. Afficher un avertissement dans le panier et sur la fiche produit.", functional:"IMPORTANT: Filtres, liquides, joints d'étanchéité sont souvent non-retournables.", analyst:'~8% des articles sont non-retournables. Segment: consommables, filtres à huile.' },
  attributes:             { source:'csv',  csvCol:23, csvHeader:'List of attributes',           type:'string',  example:'Diamètre:280mm;Épaisseur:22mm', description:'Attributs techniques de la pièce sous forme clé:valeur séparés par point-virgule.', dev:'Parsable: split(";").map(a=>a.split(":")) → [{name,value}]. Utilisé dans la recherche full-text.', functional:'Caractéristiques techniques affichées sur la fiche produit (dimensions, matière, etc.).', analyst:'Taux de remplissage ~60%. Format non normalisé — nettoyage requis pour indexation TecDoc.' },
  mpSuperior:             { source:'csv',  csvCol:24, csvHeader:'MP superior attribute',        type:'string',  example:'SUSPENSION',       description:'Catégorie supérieure Moto-Profil dans la hiérarchie produit interne.', dev:'Hiérarchie: mpSuperior > mpSubaltern > temotFam > temotCat. Non normalisée TecDoc.', functional:'Famille produit pour navigation catalogue interne Moto-Profil.', analyst:'' },
  mpSubaltern:            { source:'csv',  csvCol:25, csvHeader:'MP subaltern attribute',       type:'string',  example:'AMORTISSEURS',     description:'Sous-catégorie Moto-Profil (niveau 2 de la hiérarchie interne).', dev:'Voir mpSuperior.', functional:'Sous-famille pour les filtres catalogue.', analyst:'' },
  temotFam:               { source:'csv',  csvCol:26, csvHeader:'Temot FAM attribute',          type:'string',  example:'FREINAGE',         description:'Famille Temot (association distributeurs auto européens) — classification standardisée niveau 1.', dev:'Plus fiable que mpSuperior/mpSubaltern pour la classification produit. ~60 valeurs.', functional:'Famille produit pour les rapports de vente et le merchandising.', analyst:'Variable de segmentation tier-1 pour les analyses cross-marque.' },
  temotCat:               { source:'csv',  csvCol:27, csvHeader:'Temot CAT attribute',          type:'string',  example:'PLAQUETTES DE FREIN', description:'Catégorie Temot niveau 2. C\'est la classification produit principale utilisée dans l\'app.', dev:'Index byCategory. ~300 valeurs. Clé pour le filtrage catalogue.', functional:"Catégorie affichée dans le menu de navigation. Source pour les rapports par type de pièce.", analyst:'Granularité optimale pour l\'analyse de portefeuille produit. Variable la plus utilisée en BI.' },
  replacementPrefix:      { source:'csv',  csvCol:28, csvHeader:'Replacement prefix',           type:'string',  example:'LKQ',              description:'Préfixe de l\'article de remplacement recommandé (successeur).', dev:'replacementPrefix + replacementIndex = motonet du successeur. Lookup via byMotonet.', functional:"Article de remplacement en cas de rupture définitive. À proposer automatiquement au client.", analyst:'' },
  replacementIndex:       { source:'csv',  csvCol:29, csvHeader:'Replacement index',            type:'string',  example:'5Q0698451N',       description:'Index de l\'article de remplacement recommandé.', dev:'Voir replacementPrefix.', functional:'', analyst:'' },
  listAlternatives:       { source:'csv',  csvCol:30, csvHeader:'List of alternatives',         type:'string',  example:'MANN;BOSCH;HELLA',  description:'Liste textuelle des marques proposant un équivalent (alternatives cross-référence).', dev:'Champ texte brut. Les motonets alternatifs sont dans alternatives[] (col 31-50).', functional:"Permet de proposer des alternatives si l'article est en rupture ou trop cher.", analyst:'Taux de remplissage ~30%. Indicateur de la compétitivité du segment.' },
  alternatives:           { source:'csv',  csvCol:'31-50', csvHeader:'Alternative 1–20',        type:'string[]',example:['MANN0001','BOF5432'], description:'Tableau des motonets alternatifs (jusqu\'à 20), directement lookupables dans le catalogue.', dev:'Champ dénormalisé: CSV col 31 à 50, filtré des valeurs vides. Chaque valeur = motonet direct.', functional:'Articles équivalents fonctionnels d\'autres marques. Afficher au client avec leur prix.', analyst:'Densité du graphe de substitution produit. Moyen de clusterisation par référence OEM.' },
  priceGrossRetail:       { source:'csv',  csvCol:51, csvHeader:'Gross retail price',           type:'float',   example:23.25,              unit:'€', description:'Prix public TTC (avec TVA). priceGrossRetail = priceRetail * (1 + vatRate/100).', dev:'Cohérence: priceGrossRetail / priceRetail ≈ 1 + vatRate/100. Vérifier lors des imports.', functional:'Prix affiché au consommateur final (TTC). À utiliser en B2C.', analyst:'Calculé — utiliser priceRetail + vatRate pour les analyses de marge.' },
  priceGrossPurchase:     { source:'csv',  csvCol:52, csvHeader:'Gross purchase price',        type:'float',   example:15.31,              unit:'€', description:'Prix achat TTC (priceNet + TVA). Utilisé pour les déclarations TVA.', dev:'priceGrossPurchase = priceNet * (1 + vatRate/100).', functional:'Prix de revient toutes taxes pour les calculs de TVA déductible.', analyst:'' },
  tecDocHerNr:            { source:'csv',  csvCol:53, csvHeader:'TecDoc HerNr',                type:'string',  example:'12',               description:'Numéro fournisseur TecDoc (HerNr = Herstellernummer). Identifie le fabricant dans la BDD TecDoc.', dev:'Clé de jointure avec la base TecDoc (API TecDoc Data Server). Int sous forme string.', functional:'Permet l\'intégration avec les logiciels garages (HaynesPro, AutoData, Qmotive).', analyst:'~800 valeurs. À croiser avec le référentiel TecDoc pour l\'enrichissement de données.' },
  genericId:              { source:'csv',  csvCol:54, csvHeader:'Article generic id',           type:'string',  example:'1438',             description:'Identifiant générique TecDoc (GenArtNr) — type de pièce normalisé (ex: 1438 = plaquettes de frein AV).', dev:'Voir aussi tecDocGenArtNr. Clé pour le matching TecDoc Article → Application.', functional:'Permet de trouver toutes les pièces du même type fonctionnel indépendamment de la marque.', analyst:'~2000 valeurs. Pivot essentiel pour les analyses de part de marché par type de pièce.' },
  stockHub:               { source:'csv',  csvCol:55, csvHeader:'Stock availability – HUB',    type:'int',     example:3,                  description:'Quantité disponible dans l\'entrepôt HUB (secondaire). Livraison souvent +1j vs Chorzów.', dev:'Additionner stockChorzow + stockHub pour le stock total disponible.', functional:'Stock HUB: livraison J+2. À afficher si stock Chorzów épuisé.', analyst:'Stock HUB complémentaire: ~15% des articles en rupture Chorzów ont du stock HUB.' },
  discountId:             { source:'csv',  csvCol:56, csvHeader:'Discount Id',                 type:'string',  example:'GRP_FREIN_STD',    description:'Identifiant interne du groupe de remise (plus précis que discountGroup).', dev:'Clé de lookup dans les tables de remise contractuelles Moto-Profil. Distinct de discountGroup.', functional:'Référence contrat pour le calcul automatique de remise dans les ERP.', odoo:'À mapper avec les Pricelists Odoo.' },
  vatRate:                { source:'csv',  csvCol:57, csvHeader:'VAT rate',                    type:'float',   example:23,                 unit:'%', description:'Taux de TVA applicable (23% = taux standard polonais, peut varier selon pays de livraison).', dev:'Taux polonais par défaut. En France: 20%. Attention aux règles TVA intracommunautaire.', functional:'IMPORTANT: Le taux CSV est polonais. Recalculer avec la TVA locale (France=20%).', analyst:'Distribution: 23% (~94%), 8% (~5%), 5% (<1%). Segment alimentaire/médicaments.' },
  tecDocGenArtNr:         { source:'csv',  csvCol:58, csvHeader:'TecDoc GenArtNr',             type:'string',  example:'1438',             description:'Numéro article générique TecDoc (GenArtNr). Identique à genericId dans la plupart des cas.', dev:'Peut différer de genericId dans certains cas. Utiliser tecDocGenArtNr pour les appels API TecDoc.', functional:'', analyst:'' },
  productGroupCode:       { source:'csv',  csvCol:59, csvHeader:'Product group code',          type:'string',  example:'PGC001',           description:'Code groupe produit interne Moto-Profil pour la classification logistique.', dev:'Utilisé pour les règles de picking et de conditionnement en entrepôt.', functional:'Classification logistique interne — non visible client.', analyst:'' },
  splitPayroll:           { source:'csv',  csvCol:60, csvHeader:'Split payroll required',      type:'boolean', example:false,              description:'Si true, la TVA doit être versée directement au fisc (mécanisme polonais de paiement fractionné).', dev:"Obligation légale polonaise (MPP). Requis pour les transactions >15 000 PLN. Affecte le flux de paiement API Stripe/Odoo.", functional:"IMPORTANT pour la comptabilité: nécessite un compte TVA dédié côté acheteur en Pologne.", analyst:'~5% des articles. Segment: pièces haute valeur (moteurs, boîtes de vitesse).' },
  countryCode:            { source:'csv',  csvCol:61, csvHeader:'Country code',                type:'string',  example:'PL',               description:'Pays d\'origine de la pièce (code ISO 3166-1 alpha-2).', dev:'Requis sur les factures douanières et documents DHL/FedEx hors UE.', functional:'Pays de fabrication — peut être affiché sur la fiche produit (Made in…).', analyst:'Distribution: PL ~45%, DE ~20%, CN ~15%, autres ~20%.' },
  tecDocManufacturer:     { source:'csv',  csvCol:63, csvHeader:'TecDoc Manufacturer',         type:'string',  example:'ATE',              description:'Nom fabricant tel qu\'enregistré dans la base TecDoc (peut différer du champ manufacturer).', dev:'Utiliser pour les appels API TecDoc (recherche par fabricant normalisé).', functional:'Nom officiel TecDoc pour l\'intégration avec les outils de recherche véhicule.', analyst:'' },
  elId:                   { source:'api',  apiField:'elId',       endpoint:'GetArticleDetailsForList', type:'int',     example:4782156,  description:'Identifiant interne ProfiAuto de l\'article. Clé requise pour l\'appel GetGraphics.', dev:'REQUIS pour charger les images. Obtenu via POST /Offer/GetArticleDetailsForList. Stocker en cache.', functional:'Identifiant technique interne — non affiché client.', analyst:'Stable dans le temps. Clé de jointure avec le portail ProfiAuto.' },
  photoGuid:              { source:'api',  apiField:'photoGuid',  endpoint:'GetArticleDetailsForList', type:'string',  example:'a1b2c3d4-...', description:'GUID de l\'image principale de l\'article sur le CDN ProfiAuto.', dev:'URL CDN: https://cdn.profiauto.com/Image/{photoGuid}. Format JPEG ~1280×850px. Public, sans anti-hotlink.', functional:'Image principale affichée dans les listings catalogue.', analyst:'Taux de remplissage API ~70%. Articles sans image = placeholder pi-car.', odoo:'URL image principale à importer sur la fiche produit Odoo.' },
  isImage:                { source:'api',  apiField:'isImage',    endpoint:'GetArticleDetailsForList', type:'boolean', example:true,     description:'Indique si au moins une image est disponible via GetGraphics pour cet article.', dev:'Toujours appeler getGraphics(elId) si isImage=true. Peut avoir plusieurs images (jusqu\'à 5+).', functional:'Badge "avec image" dans le listing. À utiliser pour filtrer les articles enrichis.', analyst:'Taux ~65%. Corrélé positivement avec le prix et le volume de ventes.' },
  isPdf:                  { source:'api',  apiField:'isPdf',      endpoint:'GetArticleDetailsForList', type:'boolean', example:false,    description:'Indique si un document PDF (fiche technique, instructions montage) est disponible.', dev:'URL PDF non fournie directement — à récupérer via un appel API dédié non documenté.', functional:'Badge "notice disponible" sur la fiche produit. Rassure l\'installateur.', analyst:'Taux ~30%. Concentré sur les pièces techniques complexes (kits d\'embrayage, etc.).' },
  onStock:                { source:'api',  apiField:'onStock',    endpoint:'GetArticleDetailsForList', type:'int',     example:12,       description:'Stock disponible temps réel selon l\'API ProfiAuto (différent du CSV qui est J-1).', dev:'Plus fiable que stockChorzow du CSV qui est un snapshot. Mais nécessite un appel API par article.', functional:'Stock temps réel — à afficher en priorité sur la fiche produit.', analyst:'Diverge du CSV dans ~20% des cas. Utiliser pour les décisions d\'achat critiques.' },
  gtuCode:                { source:'api',  apiField:'gtuCode',    endpoint:'GetArticleDetailsForList', type:'string',  example:'GTU_13', description:'Code GTU (Groupe de Taxe Unifié) polonais pour la déclaration JPK_VAT (fichier fiscal).', dev:'Requis dans les factures électroniques polonaises (KSeF) depuis 2024.', functional:'IMPORTANT légal: à inclure dans les exports comptables Odoo vers la Pologne.', analyst:'~15 codes GTU distincts. Requis pour les analyses de conformité fiscale.' },
  parameters:             { source:'api',  apiField:'parameters', endpoint:'GetArticleDetailsForList', type:'object[]', example:[{name:'Diamètre',value:'280mm'}], description:'Caractéristiques techniques enrichies (API) sous forme [{name, value}].', dev:'Plus structuré que le champ CSV attributes. Utiliser pour les filtres dynamiques et la fiche technique.', functional:'Données techniques TecDoc: dimensions, matière, couples de serrage.', analyst:'Densité variable: 0 à 30+ attributs. Utile pour le matching de compatibilité.' },
}

const meta = computed(() => FIELDS[props.field] ?? {
  source: 'csv',
  description: `Champ "${props.field}" — métadonnée non documentée.`,
  type: 'string',
})

function toggle(e) {
  visible.value = !visible.value
  if (visible.value) nextTick(() => position(e))
}

function position(e) {
  if (!btnEl.value || !popEl.value) return
  const btn = btnEl.value.getBoundingClientRect()
  const pop = popEl.value.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  let top = btn.bottom + 6
  let left = btn.left - 10
  if (left + pop.width > vw - 12) left = vw - pop.width - 12
  if (left < 8) left = 8
  if (top + pop.height > vh - 12) top = btn.top - pop.height - 6
  popStyle.value = { top: top + 'px', left: left + 'px' }
}

function onOutside(e) {
  if (!visible.value) return
  if (popEl.value?.contains(e.target) || btnEl.value?.contains(e.target)) return
  visible.value = false
}

onMounted(() => document.addEventListener('mousedown', onOutside, true))
onBeforeUnmount(() => document.removeEventListener('mousedown', onOutside, true))
</script>

<style scoped>
.fi-fade-enter-active, .fi-fade-leave-active { transition: opacity 0.12s, transform 0.12s; }
.fi-fade-enter-from, .fi-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
