param(
  [int]$Port = 47831,
  [string]$ProjectDirectory = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = "Stop"

function Read-EnvValue([string]$Name) {
  $envFile = Join-Path $ProjectDirectory ".env"
  if (-not (Test-Path $envFile)) { return "" }
  $line = Get-Content $envFile | Where-Object { $_ -match "^$([regex]::Escape($Name))=" } | Select-Object -Last 1
  if (-not $line) { return "" }
  return ($line -split "=", 2)[1].Trim().Trim('"')
}


try {
  Add-Type -AssemblyName System.Text.Encoding.CodePages -ErrorAction SilentlyContinue
  [System.Text.Encoding]::RegisterProvider([System.Text.CodePagesEncodingProvider]::Instance)
} catch {
  # Windows PowerShell/.NET Framework already includes Thai code page 874.
}
if (-not ([System.Management.Automation.PSTypeName]'KuMedThaiCard').Type) {
  Add-Type -TypeDefinition @'
using System;
using System.Linq;
using System.Text;
using System.Runtime.InteropServices;

public sealed class KuMedCardResult {
  public string citizenId { get; set; }
  public string title { get; set; }
  public string firstName { get; set; }
  public string lastName { get; set; }
  public string birthDate { get; set; }
  public string gender { get; set; }
  public string homeAddress { get; set; }
  public string readerName { get; set; }
}

public static class KuMedThaiCard {
  const uint ScopeUser=0, ShareShared=2, ProtocolT0=1, ProtocolT1=2, LeaveCard=0;
  [StructLayout(LayoutKind.Sequential)] struct IoRequest { public uint protocol; public uint length; }
  [DllImport("winscard.dll")] static extern int SCardEstablishContext(uint scope, IntPtr r1, IntPtr r2, out IntPtr context);
  [DllImport("winscard.dll", CharSet=CharSet.Unicode)] static extern int SCardListReaders(IntPtr context, string groups, char[] readers, ref int length);
  [DllImport("winscard.dll", CharSet=CharSet.Unicode)] static extern int SCardConnect(IntPtr context, string reader, uint share, uint protocols, out IntPtr card, out uint activeProtocol);
  [DllImport("winscard.dll")] static extern int SCardTransmit(IntPtr card, ref IoRequest sendPci, byte[] send, int sendLength, IntPtr recvPci, byte[] receive, ref int receiveLength);
  [DllImport("winscard.dll")] static extern int SCardDisconnect(IntPtr card, uint disposition);
  [DllImport("winscard.dll")] static extern int SCardReleaseContext(IntPtr context);

  static void Ok(int code, string action) { if(code != 0) throw new InvalidOperationException(action + " failed (PC/SC 0x" + code.ToString("X8") + ")"); }
  static byte[] Transmit(IntPtr card, uint protocol, byte[] command) {
    var io = new IoRequest { protocol=protocol, length=(uint)Marshal.SizeOf(typeof(IoRequest)) };
    var receive = new byte[512]; int length=receive.Length;
    Ok(SCardTransmit(card, ref io, command, command.Length, IntPtr.Zero, receive, ref length), "Card command");
    return receive.Take(length).ToArray();
  }
  static byte[] Payload(byte[] response) {
    if(response.Length < 2) throw new InvalidOperationException("Card returned an incomplete response");
    byte sw1=response[response.Length-2], sw2=response[response.Length-1];
    if(sw1 != 0x90 || sw2 != 0x00) throw new InvalidOperationException("Card rejected command (" + sw1.ToString("X2") + sw2.ToString("X2") + ")");
    return response.Take(response.Length-2).ToArray();
  }
  static byte[] ReadField(IntPtr card, uint protocol, int offset, int length) {
    var request = new byte[] { 0x80,0xB0,(byte)(offset>>8),(byte)offset,0x02,0x00,(byte)length };
    var first=Transmit(card,protocol,request);
    int expected=length;
    if(first.Length>=2 && first[first.Length-2]==0x61) expected=first[first.Length-1]==0?256:first[first.Length-1];
    return Payload(Transmit(card,protocol,new byte[]{0x00,0xC0,0x00,0x00,(byte)expected}));
  }
  static string Decode(byte[] bytes) {
    return Encoding.GetEncoding(874).GetString(bytes.Where(b=>b!=0 && b!=255).ToArray()).Trim(' ','#','\0');
  }
  static string Date(string raw) {
    var digits=new string(raw.Where(Char.IsDigit).ToArray()); if(digits.Length<8) return "";
    int year=int.Parse(digits.Substring(0,4)); if(year>2400) year-=543;
    return year.ToString("0000")+"-"+digits.Substring(4,2)+"-"+digits.Substring(6,2);
  }
  public static KuMedCardResult Read() {
    IntPtr context=IntPtr.Zero,card=IntPtr.Zero;
    try {
      Ok(SCardEstablishContext(ScopeUser,IntPtr.Zero,IntPtr.Zero,out context),"Smart Card service");
      int size=0; int code=SCardListReaders(context,null,null,ref size); Ok(code,"List readers");
      var buffer=new char[size]; Ok(SCardListReaders(context,null,buffer,ref size),"List readers");
      string reader=new string(buffer).Split('\0').FirstOrDefault(v=>!String.IsNullOrWhiteSpace(v));
      if(String.IsNullOrEmpty(reader)) throw new InvalidOperationException("No smart card reader was found");
      uint protocol; Ok(SCardConnect(context,reader,ShareShared,ProtocolT0|ProtocolT1,out card,out protocol),"Connect to card");
      var selected=Transmit(card,protocol,new byte[]{0x00,0xA4,0x04,0x00,0x08,0xA0,0x00,0x00,0x00,0x54,0x48,0x00,0x01});
      if(selected.Length<2) throw new InvalidOperationException("Thai ID application did not respond");
      if(selected[selected.Length-2]==0x61) Payload(Transmit(card,protocol,new byte[]{0x00,0xC0,0x00,0x00,selected[selected.Length-1]}));
      else Payload(selected);
      string cid=Decode(ReadField(card,protocol,0x0004,13));
      string name=Decode(ReadField(card,protocol,0x0011,100));
      string[] parts=name.Split(new[]{'#'},StringSplitOptions.RemoveEmptyEntries).Select(v=>v.Trim()).Where(v=>v.Length>0).ToArray();
      string rawGender=Decode(ReadField(card,protocol,0x00E1,1));
      return new KuMedCardResult { citizenId=cid, title=parts.Length>0?parts[0]:"", firstName=parts.Length>1?parts[1]:"", lastName=parts.Length>2?parts[parts.Length-1]:"", birthDate=Date(Decode(ReadField(card,protocol,0x00D9,8))), gender=rawGender=="1"?"ชาย":rawGender=="2"?"หญิง":"อื่น ๆ", homeAddress=Decode(ReadField(card,protocol,0x1579,100)).Replace('#',' ').Replace("  "," "), readerName=reader };
    } finally { if(card!=IntPtr.Zero) SCardDisconnect(card,LeaveCard); if(context!=IntPtr.Zero) SCardReleaseContext(context); }
  }
}
'@
}

$allowedOriginSetting = Read-EnvValue "CITIZEN_CARD_READER_ALLOWED_ORIGINS"
if ($allowedOriginSetting) {
  $allowedOrigins = @($allowedOriginSetting.Split(',') | ForEach-Object { $_.Trim().TrimEnd('/') } | Where-Object { $_ })
} else {
  $allowedOrigins = @("https://ku-med-test.tech", "http://localhost:3000", "http://127.0.0.1:3000")
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "KU-MED Card Reader is running at http://127.0.0.1:$Port/read-card" -ForegroundColor Green
Write-Host "Allowed web origins: $($allowedOrigins -join ', ')" -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    try {
      $headerBytes = [Collections.Generic.List[byte]]::new()
      while ($headerBytes.Count -lt 16384) {
        $next = $stream.ReadByte()
        if ($next -lt 0) { break }
        $headerBytes.Add([byte]$next)
        $count = $headerBytes.Count
        if ($count -ge 4 -and $headerBytes[$count-4] -eq 13 -and $headerBytes[$count-3] -eq 10 -and $headerBytes[$count-2] -eq 13 -and $headerBytes[$count-1] -eq 10) { break }
      }
      $headerText = [Text.Encoding]::ASCII.GetString($headerBytes.ToArray())
      $requestLine = ($headerText -split '\r\n')[0]
      $headers = @{}
      foreach ($line in ($headerText -split '\r\n' | Select-Object -Skip 1)) {
        $separator = $line.IndexOf(':')
        if ($separator -gt 0) { $headers[$line.Substring(0,$separator).Trim().ToLowerInvariant()] = $line.Substring($separator+1).Trim() }
      }
      $origin = [string]$headers["origin"]
      $hostHeader = [string]$headers["host"]
      $localHosts = @("127.0.0.1:$Port", "localhost:$Port")
      $originAllowed = $origin -and ($allowedOrigins -contains $origin.TrimEnd('/'))
      $hostAllowed = $localHosts -contains $hostHeader
      $status = 200; $statusText = "OK"; $body = $null; $emptyResponse = $false
      if (-not $hostAllowed) { $status=403; $statusText="Forbidden"; $body=@{error="Invalid local host"} }
      elseif (-not $originAllowed) { $status=403; $statusText="Forbidden"; $body=@{error="Origin not allowed"} }
      elseif ($requestLine -match '^OPTIONS /read-card HTTP/') {
        if ($headers["access-control-request-method"] -ne "POST") { $status=405; $statusText="Method Not Allowed"; $body=@{error="Method not allowed"} }
        else { $status=204; $statusText="No Content"; $emptyResponse=$true }
      }
      elseif ($requestLine -match '^GET /health HTTP/') { $body=@{ok=$true;service="KU-MED Card Reader"} }
      elseif ($requestLine -match '^POST /read-card HTTP/') { $body=[KuMedThaiCard]::Read() }
      else { $status=404; $statusText="Not Found"; $body=@{error="Not found"} }
      if ($emptyResponse) { $bodyBytes=[byte[]]@() }
      else { $bodyBytes=[Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Compress)) }
      $crlf = ([string][char]13) + ([string][char]10)
      $responseLines = @(
        "HTTP/1.1 $status $statusText",
        "Content-Type: application/json; charset=utf-8",
        "Content-Length: $($bodyBytes.Length)",
        "Connection: close",
        "Cache-Control: no-store",
        "X-Content-Type-Options: nosniff"
      )
      if ($originAllowed) {
        $responseLines += "Access-Control-Allow-Origin: $origin"
        $responseLines += "Vary: Origin"
        $responseLines += "Access-Control-Allow-Methods: POST, OPTIONS"
        $responseLines += "Access-Control-Allow-Headers: Content-Type"
        $responseLines += "Access-Control-Max-Age: 600"
        if ($headers["access-control-request-private-network"] -eq "true") { $responseLines += "Access-Control-Allow-Private-Network: true" }
      }
      $responseText = [string]::Join($crlf,$responseLines) + $crlf + $crlf
      $responseBytes = [Text.Encoding]::ASCII.GetBytes($responseText)
      $stream.Write($responseBytes,0,$responseBytes.Length)
      if ($bodyBytes.Length -gt 0) { $stream.Write($bodyBytes,0,$bodyBytes.Length) }
      $stream.Flush()
    } catch {
      try {
        $body = @{error=$_.Exception.Message}
        $bodyBytes = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Compress))
        $crlf = ([string][char]13) + ([string][char]10)
        $responseLines = @(
          "HTTP/1.1 500 Internal Server Error",
          "Content-Type: application/json; charset=utf-8",
          "Content-Length: $($bodyBytes.Length)",
          "Connection: close",
          "Cache-Control: no-store",
          "X-Content-Type-Options: nosniff"
        )
        if ($originAllowed) {
          $responseLines += "Access-Control-Allow-Origin: $origin"
          $responseLines += "Vary: Origin"
        }
        $responseText = [string]::Join($crlf,$responseLines) + $crlf + $crlf
        $responseBytes = [Text.Encoding]::ASCII.GetBytes($responseText)
        $stream.Write($responseBytes,0,$responseBytes.Length)
        $stream.Write($bodyBytes,0,$bodyBytes.Length)
        $stream.Flush()
      } catch {}
    } finally {
      $stream.Dispose()
      $client.Dispose()
    }
  }
} finally { $listener.Stop() }