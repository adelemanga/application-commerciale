export const normalizePhoneNumber = (phone: string) =>
  phone.replace(/\D/g, "");

export const isValidPhoneNumber = (phone: string) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  return /^0[1-9]\d{8}$/.test(normalizedPhone);
};

export const phoneHelperText =
  "Entrez un numero francais valide a 10 chiffres, par exemple 06 12 34 56 78.";
