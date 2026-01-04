import html2canvas from 'html2canvas';

export async function exportToImage(element: HTMLElement, filename: string): Promise<void> {
  try {
    // Capture element as canvas
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      scrollX: 0,
      scrollY: -window.scrollY
    });

    const dataUrl = canvas.toDataURL('image/png');

    if (window.electronAPI?.saveImage) {
      const result = await window.electronAPI.saveImage(dataUrl, filename);
      if (!result.success && result.error) {
        throw new Error(result.error);
      }
    } else {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.error('Image export error:', error);
    throw new Error('Failed to export image');
  }
}
