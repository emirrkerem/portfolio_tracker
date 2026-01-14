#define MyAppName "Borsa Uygulamasi"
#define MyAppVersion "1.0"
#define MyAppPublisher "Emir"
#define MyAppExeName "BorsaApp.exe"

[Setup]
; Uygulama Kimligi (Benzersiz olmali)
AppId={{8A5469C6-4B23-4567-9812-ABCDEF123456}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
; Olusacak kurulum dosyasinin adi
OutputBaseFilename=BorsaApp_Kurulum
Compression=lzma
SolidCompression=yes
WizardStyle=modern
; Varsa ikon dosyasini kullan (Bir ust klasorde)
SetupIconFile=..\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Ana exe dosyasi (Bir ust klasorde olusuyor)
Source: "..\BorsaApp.exe"; DestDir: "{app}"; Flags: ignoreversion
; Ikon dosyasi (Bir ust klasorde)
Source: "..\icon.ico"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\icon.ico"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent