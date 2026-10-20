import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const analyzerScripts = [
  "tools/analyze_changed_and_new_files.bat",
  "tools/analyze_code.bat",
];

for (const scriptPath of analyzerScripts) {
  test(`${scriptPath} preserves the analyzer exit code`, async () => {
    const script = await readFile(new URL(`../${scriptPath}`, import.meta.url), "utf8");
    const analyzerCall = script.indexOf('"%CLI_ANALYZER_PATH%\\venv\\Scripts\\python.exe"');
    const savedExitCode = script.indexOf("set \"ERR=%ERRORLEVEL%\"", analyzerCall);
    const returnToTools = script.indexOf('cd /d "%~dp0"', analyzerCall);
    const returnedExitCode = script.indexOf("exit /b %ERR%", returnToTools);

    assert.notEqual(analyzerCall, -1, "analyzer invocation is present");
    assert.ok(savedExitCode > analyzerCall, "exit code is saved after analyzer invocation");
    assert.ok(returnToTools > savedExitCode, "working directory is restored after saving the code");
    assert.ok(returnedExitCode > returnToTools, "saved exit code is returned to the caller");
  });
}
