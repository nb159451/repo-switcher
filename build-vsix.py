#!/usr/bin/env python3
"""Packs the extension into a .vsix without needing vsce or npm packages."""
import json
import pathlib
import zipfile
from xml.sax.saxutils import escape

here = pathlib.Path(__file__).resolve().parent
pkg = json.loads((here / "package.json").read_text())
out = here / f"{pkg['name']}-{pkg['version']}.vsix"

# source file -> path inside the package (vsce stores the license as LICENSE.txt)
files = {
    "package.json": "extension/package.json",
    "extension.js": "extension/extension.js",
    "README.md": "extension/README.md",
    "LICENSE": "extension/LICENSE.txt",
    "icon.png": "extension/icon.png",
}

repo = pkg.get("repository", {}).get("url", "")
repo_links = "".join(
    f'\n      <Property Id="Microsoft.VisualStudio.Services.Links.{kind}" Value="{escape(repo)}" />'
    for kind in ("Source", "GitHub")
) if repo else ""
if pkg.get("qna") is False:
    repo_links += '\n      <Property Id="Microsoft.VisualStudio.Services.EnableMarketplaceQnA" Value="false" />'

manifest = f"""<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="{pkg['name']}" Version="{pkg['version']}" Publisher="{pkg['publisher']}" />
    <DisplayName>{escape(pkg['displayName'])}</DisplayName>
    <Description xml:space="preserve">{escape(pkg['description'])}</Description>
    <Tags>{escape(",".join(pkg.get('keywords', [])))}</Tags>
    <Categories>{escape(",".join(pkg['categories']))}</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="{pkg['engines']['vscode']}" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="{",".join(pkg['extensionKind'])}" />
      <Property Id="Microsoft.VisualStudio.Services.Content.Pricing" Value="Free" />{repo_links}
    </Properties>
    <License>extension/LICENSE.txt</License>
    <Icon>extension/icon.png</Icon>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE.txt" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/icon.png" Addressable="true" />
  </Assets>
</PackageManifest>
"""

content_types = """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json" />
  <Default Extension=".js" ContentType="application/javascript" />
  <Default Extension=".md" ContentType="text/markdown" />
  <Default Extension=".txt" ContentType="text/plain" />
  <Default Extension=".png" ContentType="image/png" />
  <Default Extension=".vsixmanifest" ContentType="text/xml" />
</Types>
"""

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", content_types)
    z.writestr("extension.vsixmanifest", manifest)
    for src, dest in files.items():
        z.write(here / src, dest)

print(out)
