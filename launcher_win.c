#include <windows.h>
#include <shellapi.h>
#include <stdio.h>
#include <string.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    char szPath[MAX_PATH];
    GetModuleFileNameA(NULL, szPath, MAX_PATH);
    
    char *lastSlash = strrchr(szPath, '\\');
    if (lastSlash) {
        *lastSlash = '\0';
    }
    SetCurrentDirectoryA(szPath);

    // Launch Open-SciScribe.bat in hidden window
    ShellExecuteA(NULL, "open", "cmd.exe", "/c Open-SciScribe.bat", szPath, SW_HIDE);

    return 0;
}
