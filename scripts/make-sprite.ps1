# One-off asset tool (not shipped with the game).
#   powershell -NoProfile -File .freebuff/make-sprite.ps1 -In <src.png> -Out <dst.png> [-TargetH 46]
#
# Crops the mascot out of a pasted screenshot, drops the dark backdrop (black +
# faint grid lines) using a flood fill from the border - so dark pixels INSIDE
# the character (eyes, outlines) survive - then box-downscales to a crisp sprite.

param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$TargetH = 46
)

Add-Type -AssemblyName System.Drawing

$src = New-Object System.Drawing.Bitmap([System.Drawing.Image]::FromFile($In))
$w = $src.Width
$h = $src.Height

# backdrop / foreground classification: dark pixels are backdrop, anything vivid is the character
$isDark = New-Object 'bool[]' ($w * $h)
for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $c = $src.GetPixel($x, $y)
    $isDark[$y * $w + $x] = (($c.R + $c.G + $c.B) -lt 150)
  }
}

# flood fill the connected backdrop inwards from every border pixel
$mask = New-Object 'bool[]' ($w * $h)
$stack = New-Object 'System.Collections.Generic.Stack[int]'
for ($x = 0; $x -lt $w; $x++) { $stack.Push($x); $stack.Push(($h - 1) * $w + $x) }
for ($y = 0; $y -lt $h; $y++) { $stack.Push($y * $w); $stack.Push($y * $w + $w - 1) }
while ($stack.Count -gt 0) {
  $i = $stack.Pop()
  if ($mask[$i]) { continue }
  if (-not $isDark[$i]) { continue }
  $mask[$i] = $true
  $x = $i % $w
  $y = [int]($i / $w)
  if ($x -gt 0) { $stack.Push($i - 1) }
  if ($x -lt ($w - 1)) { $stack.Push($i + 1) }
  if ($y -gt 0) { $stack.Push($i - $w) }
  if ($y -lt ($h - 1)) { $stack.Push($i + $w) }
}

# frame the character
$minX = $w; $minY = $h; $maxX = -1; $maxY = -1
for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    if ($mask[$y * $w + $x]) { continue }
    if ($x -lt $minX) { $minX = $x }
    if ($x -gt $maxX) { $maxX = $x }
    if ($y -lt $minY) { $minY = $y }
    if ($y -gt $maxY) { $maxY = $y }
  }
}
if ($maxX -lt 0) { throw 'no character pixels found - is the backdrop dark?' }
$cw = $maxX - $minX + 1
$ch = $maxY - $minY + 1

$factor = [Math]::Max(1, [int][Math]::Round($ch / $TargetH))
$ow = [Math]::Max(1, [int][Math]::Round($cw / $factor))
$oh = [Math]::Max(1, [int][Math]::Round($ch / $factor))

$outBmp = New-Object System.Drawing.Bitmap($ow, $oh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($oy = 0; $oy -lt $oh; $oy++) {
  for ($ox = 0; $ox -lt $ow; $ox++) {
    $r = 0.0; $g = 0.0; $b = 0.0; $a = 0.0; $n = 0
    for ($sy = 0; $sy -lt $factor; $sy++) {
      for ($sx = 0; $sx -lt $factor; $sx++) {
        $x = $minX + $ox * $factor + $sx
        $y = $minY + $oy * $factor + $sy
        if ($x -gt $maxX -or $y -gt $maxY) { continue }
        if ($mask[$y * $w + $x]) { continue }
        $c = $src.GetPixel($x, $y)
        $r += $c.R; $g += $c.G; $b += $c.B; $a += 255; $n++
      }
    }
    if ($n -eq 0) { continue }
    # premultiplied average keeps edges clean when part of the block was backdrop
    $den = [double]$n
    $alpha = [int][Math]::Round(255.0 * $n / ($factor * $factor))
    $outBmp.SetPixel($ox, $oy, [System.Drawing.Color]::FromArgb($alpha, [int]($r / $den), [int]($g / $den), [int]($b / $den)))
  }
}

$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$outBmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Output "source ${w}x${h} -> character ${cw}x${ch} at (${minX},${minY}) -> sprite ${ow}x${oh} (downscale x${factor})"
Write-Output "wrote $Out"

$outBmp.Dispose()
$src.Dispose()
