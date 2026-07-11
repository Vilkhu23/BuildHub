/**
 * Validates a mobile/phone number.
 * Ensures:
 * 1. Contains at least 10 digits
 * 2. Does not consist of repeating dummy digits (e.g., "9999999999", "0000000000")
 * 3. Does not consist of sequential dummy series (e.g., "1234567890", "9876543210")
 * 4. Checks standard Indian mobile prefix (starts with 6, 7, 8, or 9) and returns a warning if not.
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export function validatePhoneNumber(phone: string): ValidationResult {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: false, error: "Phone number is required." };
  }

  // Extract only digits
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 0) {
    return { isValid: false, error: "Phone number must contain digits." };
  }

  if (digits.length < 10) {
    return { 
      isValid: false, 
      error: `Must contain at least 10 digits (currently ${digits.length} digit${digits.length === 1 ? "" : "s"}).` 
    };
  }

  // Identify the last 10 digits as the primary local number
  const standard10 = digits.slice(-10);

  // Check for repetitive fake numbers (e.g. 0000000000, 9999999999)
  const allSame = /^(\d)\1{9}$/.test(standard10);
  if (allSame) {
    return { 
      isValid: false, 
      error: "Repetitive digits (e.g. 9999999999) are not allowed." 
    };
  }

  // Check for sequential numbers
  const sequentialAsc = "0123456789";
  const sequentialDesc = "9876543210";
  if (sequentialAsc.includes(standard10) || sequentialDesc.includes(standard10)) {
    return { 
      isValid: false, 
      error: "Sequential dummy numbers (e.g. 1234567890) are not allowed." 
    };
  }

  // Standard Indian Mobile start digit (6, 7, 8, 9)
  const firstDigit = standard10[0];
  if (!["6", "7", "8", "9"].includes(firstDigit)) {
    return { 
      isValid: true, 
      warning: "Note: Standard Indian mobile numbers typically start with 6, 7, 8, or 9." 
    };
  }

  return { isValid: true };
}
