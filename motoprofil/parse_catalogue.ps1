# ==============================================================
# parse_catalogue.ps1 — Reconstruit le CSV depuis un XML SOAP brut
#
# Le résultat de ZwrocCennikDetalOfflinePelny (et zwrocListeArtykulowMPTD)
# est une suite de <string>ligne CSV</string> SANS saut de ligne.
# Ce script lit le XML en streaming (XmlReader, faible mémoire) et écrit
# une ligne CSV par élément <string>.
#
# Usage :
#   .\parse_catalogue.ps1 -RawXml "output\...\catalogue_pelny.raw.xml" -Out "output\...\catalogue_pelny.csv"
# ==============================================================
param(
    [Parameter(Mandatory)][string]$RawXml,
    [Parameter(Mandatory)][string]$Out
)
$ErrorActionPreference = "Stop"

if (-not (Test-Path $RawXml)) { Write-Error "Introuvable : $RawXml" }

$settings = [System.Xml.XmlReaderSettings]::new()
$settings.IgnoreWhitespace = $true
$reader = [System.Xml.XmlReader]::Create((Resolve-Path $RawXml), $settings)

$sw = [System.IO.StreamWriter]::new($Out, $false, [System.Text.Encoding]::UTF8)
$count = 0
try {
    while ($reader.Read()) {
        if ($reader.NodeType -eq [System.Xml.XmlNodeType]::Element -and $reader.LocalName -eq 'string') {
            $line = $reader.ReadElementContentAsString()   # décode les entités XML
            $sw.WriteLine($line)
            $count++
            if ($count % 100000 -eq 0) { Write-Host "  $count lignes..." -ForegroundColor DarkGray }
        }
    }
} finally {
    $reader.Dispose()
    $sw.Dispose()
}
Write-Host "OK → $count lignes écrites dans $Out" -ForegroundColor Green
