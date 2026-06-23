const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openMedia: () => ipcRenderer.invoke('dialog:open-media'),
  autoSaveProject: (projectData) => ipcRenderer.invoke('project:auto-save', projectData),
  checkProjectRecovery: () => ipcRenderer.invoke('project:check-recovery'),
  executeFFmpeg: (command, outputName) => ipcRenderer.invoke('ffmpeg:execute', { command, outputName })
});
