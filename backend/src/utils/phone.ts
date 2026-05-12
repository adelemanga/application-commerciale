export const normalizePhoneNumber = (phone: string) =>
  phone.replace(/\D/g, "");

export const isValidPhoneNumber = (phone: string) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  return /^0[1-9]\d{8}$/.test(normalizedPhone);
};
