export const isValidEthereumAddress = (address: string): boolean => {
  if (typeof address !== "string") {
    return false;
  }

  // Check if the address starts with "0x" and is 42 characters long
  if (!/^(0x)?[0-9a-fA-F]{40}$/.test(address)) {
    return false;
  }

  return true;
};
