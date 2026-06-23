# ==============================================================
# get_catalogue.ps1 — Extraction catalogue complet Moto-Profil (SOAP, LECTURE SEULE)
#
# Règle projet : EXTRACTION UNIQUEMENT. Ce script n'appelle QUE des
# fonctions de lecture "Zwroc..." / "Informacja...". Aucune fonction
# "Zamow..." (passage de commande) n'est utilisée.
#
# Usage (depuis le dossier motoprofil/) :
#   .\get_catalogue.ps1 -Fiks "15060" -Motonet "0BHS"   (compte test fourni par l'IT)
#
# Sortie : ../data/catalogue/YYYY-MM-DDTHH-mm-ss/
#   catalogue_pelny.raw.xml      <- réponse SOAP brute (filet de sécurité)
#   catalogue_pelny.csv          <- catalogue complet (données extraites)
#   tecdoc_mapping.txt           <- correspondance MP <-> TecDoc
#   motoprofit.csv               <- programme fidélité
#   livraisons.txt               <- planning livraisons
#   meta.json                    <- stats + horodatage
#
# IMPORTANT : ZwrocCennikDetalOfflinePelny est limité à 1 appel / heure.
# Le script valide d'abord l'autorisation via une fonction NON limitée
# (InformacjaOKontrahencie) ; il n'appelle le catalogue que si l'auth passe.
# ==============================================================

param(
    [Parameter(Mandatory)][string]$Fiks,
    [Parameter(Mandatory)][string]$Motonet,
    [string]$SoapHost    = "https://ws1.moto-profil.pl",   # màj email IT 02/06/2026 (ancienne IP : 195.242.186.3)
    [string]$SoapBackup  = "https://ws2.moto-profil.pl",   # ancienne IP : 195.242.186.16
    [int]   $TimeoutSec  = 180,
    [switch]$Force                                          # bypass garde-fou anti-rappel < 1h
)

$ErrorActionPreference = "Stop"
$NS = "http://moto-profil.pl/"   # namespace SOAP réel (PAS tempuri.org)

# --- Dossier de sortie (horodaté à la seconde) : <projet>/data/catalogue/ ---
$stamp  = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"
$outRoot = Join-Path (Split-Path $PSScriptRoot -Parent) "data/catalogue"
$outDir = Join-Path $outRoot $stamp
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
Write-Host "`nDossier de sortie : $outDir" -ForegroundColor Cyan

# --- Sélection hôte SOAP (test HTTP réel du WSDL, pas juste TCP) ---
function Test-SoapHost([string]$base) {
    try {
        $r = Invoke-WebRequest -Uri "$base/MotoBiznesWS/WSMotoOferta.asmx?wsdl" `
            -Method GET -SkipCertificateCheck -TimeoutSec 15
        return ($r.StatusCode -eq 200)
    } catch { return $false }
}

$soapUrl = $null
Write-Host "Test connectivité SOAP..." -NoNewline
if (Test-SoapHost $SoapHost) {
    $soapUrl = $SoapHost;  Write-Host " Primaire OK ($SoapHost)" -ForegroundColor Green
} elseif (Test-SoapHost $SoapBackup) {
    $soapUrl = $SoapBackup; Write-Host " Secours OK ($SoapBackup)" -ForegroundColor Yellow
} else {
    Write-Host " ECHEC" -ForegroundColor Red
    Write-Error "Aucun serveur SOAP joignable (ws1/ws2.moto-profil.pl)."
    exit 1
}

$wsOferta = "$soapUrl/MotoBiznesWS/WSMotoOferta.asmx"
$wsKlient = "$soapUrl/MotoBiznesWS/WSMotoKlient.asmx"

# --- Helper POST SOAP générique ---
function Invoke-Soap {
    param([string]$Url, [string]$Method, [string]$Body, [string]$Label)
    Write-Host "  -> $Label..." -NoNewline
    $t0 = Get-Date
    try {
        $r = Invoke-WebRequest -Uri $Url -Method POST `
            -ContentType "text/xml; charset=utf-8" `
            -Headers @{ "SOAPAction" = "`"$NS$Method`"" } `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($Body)) `
            -SkipCertificateCheck -TimeoutSec $TimeoutSec
        $ms = [int]((Get-Date) - $t0).TotalMilliseconds
        Write-Host " OK ($($r.Content.Length) octets, ${ms}ms)" -ForegroundColor Green
        return $r.Content
    } catch {
        Write-Host " ERREUR : $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# --- Construit une enveloppe SOAP (params = hashtable ordonnée) ---
function New-SoapBody([string]$Method, [hashtable]$Params) {
    $inner = ($Params.GetEnumerator() | ForEach-Object { "<$($_.Key)>$($_.Value)</$($_.Key)>" }) -join ""
    @"
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <$Method xmlns="$NS">$inner</$Method>
  </soap:Body>
</soap:Envelope>
"@
}

# --- Extrait le contenu du tag *Result (décodé HTML) ---
function Get-SoapResult([string]$xml) {
    if (-not $xml) { return $null }
    if ($xml -match '(?s)<[^>]*Result[^>]*>(.*?)<\/[^>]*Result>') {
        Add-Type -AssemblyName System.Web -ErrorAction SilentlyContinue
        return [System.Web.HttpUtility]::HtmlDecode($Matches[1])
    }
    return $xml
}

# --- Écrit 1 ligne par <string> (réponses CSV-en-liste). Streaming XmlReader
#     pour supporter les réponses volumineuses (catalogue ~140 Mo).
#     Repli : si aucun <string>, écrit le contenu *Result découpé par newline.
#     Retourne le nombre de lignes écrites. ---
function Export-SoapLines([string]$rawXml, [string]$outPath) {
    if (-not $rawXml) { return 0 }
    $settings = [System.Xml.XmlReaderSettings]::new()
    $settings.IgnoreWhitespace = $true
    $reader = [System.Xml.XmlReader]::Create([System.IO.StringReader]::new($rawXml), $settings)
    $sw = [System.IO.StreamWriter]::new($outPath, $false, [System.Text.Encoding]::UTF8)
    $n = 0
    try {
        while ($reader.Read()) {
            if ($reader.NodeType -eq [System.Xml.XmlNodeType]::Element -and $reader.LocalName -eq 'string') {
                $sw.WriteLine($reader.ReadElementContentAsString())   # décode les entités XML
                $n++
            }
        }
    } finally { $reader.Dispose(); $sw.Dispose() }
    if ($n -eq 0) {
        # Pas de <string> : repli sur le contenu *Result découpé par newline
        $body = (Get-SoapResult $rawXml)
        if ($body -and $body.Trim().Length -gt 0) {
            $lines = $body -split "`r?`n" | Where-Object { $_ -match '\S' }
            ($lines -join "`n") | Set-Content -Path $outPath -Encoding UTF8
            $n = $lines.Count
        }
    }
    return $n
}

$meta = [ordered]@{ stamp = $stamp; fiks = $Fiks; motonet = $Motonet; host = $soapUrl; appels = @() }

# ==============================================================
# 0. VALIDATION AUTORISATION (NON limité) — avant tout
# ==============================================================
Write-Host "`n[0] Validation autorisation (InformacjaOKontrahencie)..." -ForegroundColor Cyan
# NB: sur WSMotoKlient cette méthode attend 'nr_motonet'
$bodyAuth = New-SoapBody "InformacjaOKontrahencie" ([ordered]@{ fiks = $Fiks; nr_motonet = $Motonet })
$rAuth = Invoke-Soap $wsKlient "InformacjaOKontrahencie" $bodyAuth "Auth"
$auth  = Get-SoapResult $rAuth
Write-Host "     Réponse : $auth"
if (-not $auth -or $auth -match 'Bł..d autoryzacji|autoryzacji') {
    Write-Host "`n  AUTORISATION REFUSEE — le couple Fiks/motonet n'est pas valide ou l'accès WS n'est pas activé." -ForegroundColor Red
    Write-Host "  Le catalogue (limité 1/h) N'A PAS été appelé. Aucun quota gaspillé." -ForegroundColor Yellow
    $meta.auth = $auth; $meta | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $outDir "meta.json") -Encoding UTF8
    exit 2
}
Write-Host "     Autorisation OK (devise/compte reconnu)." -ForegroundColor Green
$meta.auth = $auth

# --- Garde-fou anti-rappel catalogue < 1h ---
if (-not $Force) {
    $last = Get-ChildItem -Path $outRoot -Recurse -Filter "catalogue_pelny.csv" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($last -and ((Get-Date) - $last.LastWriteTime).TotalMinutes -lt 60) {
        $age = [int]((Get-Date) - $last.LastWriteTime).TotalMinutes
        Write-Host "`n  GARDE-FOU : un catalogue a été extrait il y a $age min (< 60). Limite API 1/h." -ForegroundColor Yellow
        Write-Host "  Dernier fichier : $($last.FullName)" -ForegroundColor Yellow
        Write-Host "  Relancer avec -Force pour passer outre." -ForegroundColor Yellow
        exit 3
    }
}

# ==============================================================
# 1. CATALOGUE COMPLET — ZwrocCennikDetalOfflinePelny  [1/heure]
# ==============================================================
Write-Host "`n[1/4] Catalogue complet (ZwrocCennikDetalOfflinePelny) [LIMITE 1/h]..." -ForegroundColor Cyan
$body1 = New-SoapBody "ZwrocCennikDetalOfflinePelny" ([ordered]@{ fiks = $Fiks; motonet = $Motonet })
$r1 = Invoke-Soap $wsOferta "ZwrocCennikDetalOfflinePelny" $body1 "Catalogue"
if ($r1) {
    # FILET DE SECURITE : sauvegarde brute AVANT tout parsing
    $rawPath = Join-Path $outDir "catalogue_pelny.raw.xml"
    $r1 | Set-Content -Path $rawPath -Encoding UTF8
    Write-Host "     XML brut sauvegardé → catalogue_pelny.raw.xml ($($r1.Length) octets)" -ForegroundColor Green
}
$path1 = Join-Path $outDir "catalogue_pelny.csv"
$n1 = Export-SoapLines $r1 $path1
if ($n1 -gt 0) {
    Write-Host "     $n1 lignes → catalogue_pelny.csv" -ForegroundColor Green
    $meta.appels += @{ endpoint = "ZwrocCennikDetalOfflinePelny"; lignes = $n1; fichier = "catalogue_pelny.csv" }
} else {
    Write-Host "     Catalogue vide ou non extractible — voir catalogue_pelny.raw.xml" -ForegroundColor Yellow
}

# ==============================================================
# 2. MAPPING TECDOC — zwrocListeArtykulowMPTD  [sans limite]
# ==============================================================
Write-Host "`n[2/4] Mapping TecDoc (zwrocListeArtykulowMPTD)..." -ForegroundColor Cyan
$body2 = New-SoapBody "zwrocListeArtykulowMPTD" ([ordered]@{ fiks = $Fiks; motonet = $Motonet })
$r2 = Invoke-Soap $wsOferta "zwrocListeArtykulowMPTD" $body2 "Mapping TecDoc"
$n2 = Export-SoapLines $r2 (Join-Path $outDir "tecdoc_mapping.txt")
if ($n2 -gt 0) {
    Write-Host "     $n2 correspondances → tecdoc_mapping.txt"
    $meta.appels += @{ endpoint = "zwrocListeArtykulowMPTD"; lignes = $n2; fichier = "tecdoc_mapping.txt" }
}

# ==============================================================
# 3. PROGRAMME FIDELITE — ZwrocArtykulyProgramuMotoProfitCsv  [sans limite]
# ==============================================================
Write-Host "`n[3/4] Programme fidélité (ZwrocArtykulyProgramuMotoProfitCsv)..." -ForegroundColor Cyan
$body3 = New-SoapBody "ZwrocArtykulyProgramuMotoProfitCsv" ([ordered]@{ fiks = $Fiks; motonet = $Motonet })
$r3 = Invoke-Soap $wsOferta "ZwrocArtykulyProgramuMotoProfitCsv" $body3 "MotoProfit"
$n3 = Export-SoapLines $r3 (Join-Path $outDir "motoprofit.csv")
if ($n3 -gt 0) {
    Write-Host "     $n3 articles MotoProfit → motoprofit.csv"
    $meta.appels += @{ endpoint = "ZwrocArtykulyProgramuMotoProfitCsv"; lignes = $n3; fichier = "motoprofit.csv" }
}

# ==============================================================
# 4. PLANNING LIVRAISONS — ZwrocDostawyKontrahenta  [sans limite]
# ==============================================================
Write-Host "`n[4/4] Planning livraisons (ZwrocDostawyKontrahenta)..." -ForegroundColor Cyan
$body4 = New-SoapBody "ZwrocDostawyKontrahenta" ([ordered]@{ fiks = $Fiks; motonet = $Motonet })
$r4 = Invoke-Soap $wsKlient "ZwrocDostawyKontrahenta" $body4 "Livraisons"
$n4 = Export-SoapLines $r4 (Join-Path $outDir "livraisons.txt")
if ($n4 -gt 0) {
    Write-Host "     $n4 créneaux → livraisons.txt"
    $meta.appels += @{ endpoint = "ZwrocDostawyKontrahenta"; lignes = $n4; fichier = "livraisons.txt" }
}

# ==============================================================
# META — Résumé
# ==============================================================
$meta.fin = (Get-Date -Format "o")
$meta | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $outDir "meta.json") -Encoding UTF8

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "EXTRACTION TERMINÉE" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Get-ChildItem $outDir | Select-Object Name, @{N='Ko';E={[Math]::Round($_.Length/1KB,1)}} | Format-Table -AutoSize
Write-Host "Prochaine extraction catalogue possible : dans 1 heure (limite API)" -ForegroundColor Yellow
