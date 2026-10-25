#define MyAppName "Cat — Kitty Edition"
#define MyAppVersion "1.0.0"
#ifndef SourceDir
  #define SourceDir "..\dist\CatKittyEdition"
#endif

[Setup]
AppId={{E8795B8E-6B3A-4D50-9F13-9A6C1B2F0C41}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=Cat Kitty Edition
DefaultDirName={localappdata}\Programs\Cat Kitty Edition
DefaultGroupName=Cat — Kitty Edition
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
OutputDir={#SourceDir}\..\..\dist-installer
OutputBaseFilename=Cat-Kitty-Edition-Setup-1.0.0
SetupIconFile={#SourceDir}\assets\cat.ico
UninstallDisplayIcon={app}\assets\cat.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=no
Uninstallable=yes

[Tasks]
Name: "desktopicon"; Description: "Utwórz skrót na pulpicie"; GroupDescription: "Dodatkowe skróty:"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Cat — Kitty Edition"; Filename: "{app}\CatKittyEdition.exe"; IconFilename: "{app}\assets\cat.ico"
Name: "{autodesktop}\Cat — Kitty Edition"; Filename: "{app}\CatKittyEdition.exe"; IconFilename: "{app}\assets\cat.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\CatKittyEdition.exe"; Description: "Uruchom Cat — Kitty Edition"; Flags: postinstall nowait skipifsilent
