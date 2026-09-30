# Private IPC helper for prepare-recovery.mjs / verify-recovery.mjs only.
# Never run it directly with secret input or forward its stdout to logs/model context.
param([ValidateSet('protect','unprotect')][string]$Mode)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
try {
    $recoveryInput = [Convert]::FromBase64String([Console]::In.ReadToEnd().Trim())
    $recoveryScope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    if ($Mode -eq 'protect') {
        $recoveryOutput = [System.Security.Cryptography.ProtectedData]::Protect($recoveryInput, $null, $recoveryScope)
    } else {
        $recoveryOutput = [System.Security.Cryptography.ProtectedData]::Unprotect($recoveryInput, $null, $recoveryScope)
    }
    [Console]::Out.Write([Convert]::ToBase64String($recoveryOutput))
    [Array]::Clear($recoveryInput, 0, $recoveryInput.Length)
    [Array]::Clear($recoveryOutput, 0, $recoveryOutput.Length)
} catch {
    [Console]::Error.Write('Local Windows recovery protection failed.')
    exit 1
}
