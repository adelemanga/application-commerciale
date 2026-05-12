export const sendPasswordResetSms = async (phone: string, code: string) => {
  const provider = process.env.SMS_PROVIDER;

  if (!provider) {
    throw new Error(
      "La recuperation par SMS n'est pas encore configuree. Ajoutez un fournisseur SMS avant d'utiliser cette option."
    );
  }

  console.info(
    `SMS recovery requested for ${phone}. Provider ${provider} must send code ${code}.`
  );

  return true;
};
