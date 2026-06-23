#include <windows.h>
#include <shellapi.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    // Open video.html relative to the launcher
    ShellExecuteA(NULL, "open", "video.html", NULL, NULL, SW_SHOWNORMAL);
    return 0;
}
