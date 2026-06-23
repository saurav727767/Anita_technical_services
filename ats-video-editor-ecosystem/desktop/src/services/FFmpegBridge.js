export const FFmpegBridge = {
  trimVideo: async (inputPath, startSec, durationSec, outputPath) => {
    const cmd = `-ss ${startSec} -t ${durationSec} -i "${inputPath}" -c:v libx264 -c:a aac -strict experimental "${outputPath}"`;
    return await window.api.executeFFmpeg(cmd, outputPath);
  },

  mergeVideos: async (listOfPaths, outputPath) => {
    // Generate concat list content
    const listFileContent = listOfPaths.map(p => `file '${p}'`).join('\n');
    // Save locally or let main handle it
    const cmd = `-f concat -safe 0 -i concat_list.txt -c copy "${outputPath}"`;
    return await window.api.executeFFmpeg(cmd, outputPath);
  },

  overlayText: async (inputPath, text, x, y, outputPath) => {
    const cmd = `-i "${inputPath}" -vf "drawtext=text='${text}':x=${x}:y=${y}:fontsize=24:fontcolor=white" -c:a copy "${outputPath}"`;
    return await window.api.executeFFmpeg(cmd, outputPath);
  },

  applyFilter: async (inputPath, filterName, outputPath) => {
    let filterString = '';
    switch (filterName) {
      case 'grayscale':
        filterString = 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3';
        break;
      case 'sepia':
        filterString = 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131';
        break;
      case 'vibrant':
        filterString = 'eq=saturation=1.5:contrast=1.2';
        break;
      default:
        filterString = 'copy';
    }
    const cmd = `-i "${inputPath}" -vf "${filterString}" -c:a copy "${outputPath}"`;
    return await window.api.executeFFmpeg(cmd, outputPath);
  }
};
