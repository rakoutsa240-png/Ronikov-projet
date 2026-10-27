// Pleino's customer service: the same number answers calls and WhatsApp.
export const SUPPORT_PHONE = '+22893096752';
export const SUPPORT_PHONE_DISPLAY = '+228 93 09 67 52';
export const SUPPORT_EMAIL = 'rakoutsa240@gmail.com';

// Opens a WhatsApp chat with customer service, the first message already written.
export const whatsappUrl = (message: string) =>
  `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
