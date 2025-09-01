import QRCode from 'qrcode';

export const generateQRCode = async (
  text: string,
  options: QRCode.QRCodeToDataURLOptions = {}
): Promise<string> => {
  try {
    const defaultOptions: QRCode.QRCodeToDataURLOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      ...options,
    };

    const qrDataUrl = await QRCode.toDataURL(text, defaultOptions);
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};
